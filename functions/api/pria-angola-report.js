const MAX_BODY_SIZE = 500000;
const FREE_DEADLINE = Date.parse('2026-09-06T00:00:00+01:00');

const DEFAULT_ALLOWED_ORIGINS = [
  'https://privuskuzola.pt',
  'https://www.privuskuzola.pt'
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store',
      'X-Robots-Tag': 'noindex, nofollow, noarchive'
    }
  });
}

function isValidEmail(email) {
  return typeof email === 'string' &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanString(value, max = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function htmlEscape(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getAllowedOrigins(env) {
  if (!env.ALLOWED_ORIGINS) return DEFAULT_ALLOWED_ORIGINS;

  return env.ALLOWED_ORIGINS
    .split(',')
    .map(origin => origin.trim())
    .filter(Boolean);
}

function base64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = '';

  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return btoa(binary);
}

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return 'Pedido inválido.';
  }

  const email = cleanString(payload.email, 254);
  const report = payload.report;

  if (!isValidEmail(email)) {
    return 'Email inválido.';
  }

  if (!report || typeof report !== 'object') {
    return 'Relatório inválido.';
  }

  if (report.product !== 'PRIA Angola') {
    return 'Produto inválido.';
  }

  if (report.terms_acceptance !== true) {
    return 'É necessário aceitar os Termos e Condições e a Política de Privacidade.';
  }

  if (!cleanString(report.company, 200)) {
    return 'Empresa/organização obrigatória.';
  }

  if (!cleanString(report.name, 200)) {
    return 'Responsável obrigatório.';
  }

  if (!cleanString(report.sector, 200)) {
    return 'Setor obrigatório.';
  }

  if (typeof report.score !== 'number') {
    return 'Score inválido.';
  }

  if (report.score < 0 || report.score > 100) {
    return 'Score fora do intervalo permitido.';
  }

  return '';
}

function buildConsentEvidence(request, payload, report) {
  const origin = request.headers.get('Origin') || '';
  const userAgent = request.headers.get('User-Agent') || '';
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '';

  const acceptedAt = new Date().toISOString();

  return {
    terms_acceptance: report.terms_acceptance === true,
    privacy_policy_acceptance: report.terms_acceptance === true,
    commercial_contact: report.commercial_contact === true,
    accepted_at: acceptedAt,
    lead_email: payload.email,
    origin,
    user_agent: userAgent,
    ip,
    terms_version: 'PRIA Angola Termos e Condições — 2026-08-20',
    privacy_policy_version: 'PRIA Angola Política de Privacidade — 2026-08-20',
    terms_url: 'https://privuskuzola.pt/pria-angola/termos-condicoes.html',
    privacy_policy_url: 'https://privuskuzola.pt/pria-angola/politica-privacidade.html'
  };
}

function enrichReport(request, payload) {
  const report = payload.report;
  const consent = buildConsentEvidence(request, payload, report);

  return {
    ...report,
    consent_evidence: consent,
    legal_acceptance_summary: [
      'O utilizador confirmou a leitura e aceitação dos Termos e Condições do PRIA Angola.',
      'O utilizador confirmou a leitura e aceitação da Política de Privacidade do PRIA Angola.',
      consent.commercial_contact
        ? 'O utilizador aceitou contacto comercial posterior pela Privus.'
        : 'O utilizador não aceitou contacto comercial posterior pela Privus.'
    ]
  };
}

function getInternalEmail(env) {
  return (
    env.INTERNAL_NOTIFICATION_EMAIL ||
    env.INTERNAL_EMAIL ||
    env.INTERNAL_REPORT_EMAIL ||
    env.MS_SENDER_EMAIL ||
    ''
  );
}

function getMsConfig(env) {
  return {
    tenantId: env.MS_TENANT_ID || env.MS_TENANT || '',
    clientId: env.MS_CLIENT_ID || env.MS_CLIENT || '',
    clientSecret: env.MS_CLIENT_SECRET || '',
    senderEmail: env.MS_SENDER_EMAIL || env.MS_SENDER || ''
  };
}

async function getGraphToken(env) {
  const { tenantId, clientId, clientSecret } = getMsConfig(env);

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Configuração Microsoft Graph incompleta.');
  }

  const body = new URLSearchParams();

  body.set('client_id', clientId);
  body.set('scope', 'https://graph.microsoft.com/.default');
  body.set('client_secret', clientSecret);
  body.set('grant_type', 'client_credentials');

  const response = await fetch(
    `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body
    }
  );

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.access_token) {
    console.error('Microsoft Graph token failed:', data);
    throw new Error('Não foi possível autenticar no serviço de email.');
  }

  return data.access_token;
}

async function sendMail(env, token, message) {
  const { senderEmail } = getMsConfig(env);

  if (!senderEmail) {
    throw new Error('Email remetente não configurado.');
  }

  const response = await fetch(
    `https://graph.microsoft.com/v1.0/users/${encodeURIComponent(senderEmail)}/sendMail`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(message)
    }
  );

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    console.error('Microsoft Graph sendMail failed:', errorText);
    throw new Error('Não foi possível enviar o relatório por email.');
  }
}

function buildClientHtml(report) {
  const risks = Array.isArray(report.risks) ? report.risks.slice(0, 8) : [];
  const recommendations = Array.isArray(report.recommendations)
    ? report.recommendations.slice(0, 8)
    : [];

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0D1B2A">
      <h2>PRIA Angola — Relatório preliminar</h2>

      <p>Olá ${htmlEscape(report.name)},</p>

      <p>
        Recebemos as respostas submetidas para a organização
        <strong>${htmlEscape(report.company)}</strong>.
      </p>

      <h3>Resultado</h3>
      <p>
        <strong>${htmlEscape(report.level || 'Resultado preliminar')}</strong><br>
        Score final: <strong>${htmlEscape(report.score)}/100</strong>
      </p>

      <p>${htmlEscape(report.summary || '')}</p>

      <h3>Principais riscos identificados</h3>
      ${
        risks.length
          ? `<ul>${risks.map(r => `<li>${htmlEscape(r)}</li>`).join('')}</ul>`
          : '<p>Sem riscos críticos identificados no resumo preliminar.</p>'
      }

      <h3>Recomendações iniciais</h3>
      ${
        recommendations.length
          ? `<ul>${recommendations.map(r => `<li>${htmlEscape(r.action || r)}</li>`).join('')}</ul>`
          : '<p>Validar evidências, documentação e medidas existentes com a Privus.</p>'
      }

      <h3>Consentimento e aceitação</h3>
      <ul>
        <li>Termos e Condições: ${report.consent_evidence.terms_acceptance ? 'aceites' : 'não aceites'}</li>
        <li>Política de Privacidade: ${report.consent_evidence.privacy_policy_acceptance ? 'aceite' : 'não aceite'}</li>
        <li>Contacto comercial: ${report.consent_evidence.commercial_contact ? 'aceite' : 'não aceite'}</li>
        <li>Data/hora de aceitação: ${htmlEscape(report.consent_evidence.accepted_at)}</li>
      </ul>

      <p>
        Este relatório é preliminar e não substitui análise jurídica, técnica ou regulatória completa.
      </p>

      <p>Privus — Consultoria Regulatória Digital</p>
    </div>
  `;
}

function buildInternalHtml(report, payload) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0D1B2A">
      <h2>Novo PRIA Angola submetido</h2>

      <h3>Lead</h3>
      <ul>
        <li>Empresa: ${htmlEscape(report.company)}</li>
        <li>NIF: ${htmlEscape(report.nif || '')}</li>
        <li>Responsável: ${htmlEscape(report.name)}</li>
        <li>Cargo: ${htmlEscape(report.role || '')}</li>
        <li>Email: ${htmlEscape(payload.email)}</li>
        <li>Telefone: ${htmlEscape(report.phone || '')}</li>
        <li>Setor: ${htmlEscape(report.sector)}</li>
        <li>Localização: ${htmlEscape(report.location || '')}</li>
      </ul>

      <h3>Resultado</h3>
      <ul>
        <li>Nível: ${htmlEscape(report.level || '')}</li>
        <li>Score final: ${htmlEscape(report.score)}/100</li>
        <li>Score matemático: ${htmlEscape(report.math_score || '')}/100</li>
      </ul>

      <h3>Consentimento</h3>
      <ul>
        <li>Termos e Condições: ${report.consent_evidence.terms_acceptance ? 'aceites' : 'não aceites'}</li>
        <li>Política de Privacidade: ${report.consent_evidence.privacy_policy_acceptance ? 'aceite' : 'não aceite'}</li>
        <li>Contacto comercial: ${report.consent_evidence.commercial_contact ? 'aceite' : 'não aceite'}</li>
        <li>Data/hora: ${htmlEscape(report.consent_evidence.accepted_at)}</li>
        <li>Origem: ${htmlEscape(report.consent_evidence.origin)}</li>
        <li>IP: ${htmlEscape(report.consent_evidence.ip)}</li>
      </ul>

      <p>O JSON completo segue em anexo para arquivo e evidência.</p>
    </div>
  `;
}

function makeAttachment(report) {
  return {
    '@odata.type': '#microsoft.graph.fileAttachment',
    name: `pria-angola-${Date.now()}.json`,
    contentType: 'application/json',
    contentBytes: base64Utf8(JSON.stringify(report, null, 2))
  };
}

async function sendReportEmails(env, payload, report) {
  const token = await getGraphToken(env);
  const internalEmail = getInternalEmail(env);

  if (!internalEmail || !isValidEmail(internalEmail)) {
    throw new Error('Email interno de receção não configurado.');
  }

  const clientMessage = {
    message: {
      subject: `PRIA Angola — Relatório preliminar · ${report.company}`,
      body: {
        contentType: 'HTML',
        content: buildClientHtml(report)
      },
      toRecipients: [
        {
          emailAddress: {
            address: payload.email
          }
        }
      ]
    },
    saveToSentItems: true
  };

  const internalMessage = {
    message: {
      subject: `Novo PRIA Angola · ${report.company} · ${report.score}/100`,
      body: {
        contentType: 'HTML',
        content: buildInternalHtml(report, payload)
      },
      toRecipients: [
        {
          emailAddress: {
            address: internalEmail
          }
        }
      ],
      attachments: [
        makeAttachment(report)
      ]
    },
    saveToSentItems: true
  };

  await sendMail(env, token, clientMessage);
  await sendMail(env, token, internalMessage);
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method === 'OPTIONS') {
    return jsonResponse({ ok: true }, 200);
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const origin = request.headers.get('Origin') || '';
  const requestUrl = new URL(request.url);
  const allowedOrigins = getAllowedOrigins(env);

  if (
    origin &&
    origin !== requestUrl.origin &&
    !allowedOrigins.includes(origin)
  ) {
    return jsonResponse({ error: 'Origem não autorizada.' }, 403);
  }

  if (Date.now() >= FREE_DEADLINE) {
    return jsonResponse(
      {
        error:
          'A fase gratuita do PRIA Angola terminou. O acesso pago será ativado pela Privus.'
      },
      402
    );
  }

  const contentType = request.headers.get('Content-Type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return jsonResponse({ error: 'Formato do pedido inválido.' }, 415);
  }

  const body = await request.arrayBuffer();

  if (body.byteLength > MAX_BODY_SIZE) {
    return jsonResponse({ error: 'Pedido demasiado grande.' }, 413);
  }

  let payload;

  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return jsonResponse({ error: 'JSON inválido.' }, 400);
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  const enrichedReport = enrichReport(request, payload);

  try {
    await sendReportEmails(env, payload, enrichedReport);

    return jsonResponse({
      ok: true,
      message: 'Relatório PRIA Angola enviado por email.',
      report_id: `pria-angola-${Date.now()}`
    });
  } catch (error) {
    console.error('PRIA Angola independent report failed:', error);

    return jsonResponse(
      {
        error:
          'Não foi possível enviar o relatório PRIA Angola. Verifica a configuração do email.'
      },
      502
    );
  }
}
