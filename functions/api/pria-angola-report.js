const MAX_BODY_SIZE = 800000;
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
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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

function validatePayload(payload) {
  if (!payload || typeof payload !== 'object') return 'Pedido inválido.';

  const email = cleanString(payload.email, 254);
  const report = payload.report;

  if (!isValidEmail(email)) return 'Email inválido.';
  if (!report || typeof report !== 'object') return 'Relatório inválido.';
  if (report.product !== 'PRIA Angola') return 'Produto inválido.';

  if (report.terms_acceptance !== true) {
    return 'É necessário aceitar os Termos e Condições e a Política de Privacidade.';
  }

  if (!cleanString(report.company, 200)) return 'Empresa/organização obrigatória.';
  if (!cleanString(report.name, 200)) return 'Responsável obrigatório.';
  if (!cleanString(report.sector, 200)) return 'Setor obrigatório.';
  if (typeof report.score !== 'number') return 'Score inválido.';
  if (report.score < 0 || report.score > 100) return 'Score fora do intervalo permitido.';

  return '';
}

function buildConsentEvidence(request, payload, report) {
  const origin = request.headers.get('Origin') || '';
  const userAgent = request.headers.get('User-Agent') || '';
  const ip =
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('X-Forwarded-For') ||
    '';

  return {
    terms_acceptance: report.terms_acceptance === true,
    privacy_policy_acceptance: report.terms_acceptance === true,
    commercial_contact: report.commercial_contact === true,
    accepted_at: new Date().toISOString(),
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
    email: payload.email,
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
    env.PRIA_INTERNAL_EMAIL ||
    env.INTERNAL_NOTIFICATION_EMAIL ||
    env.INTERNAL_EMAIL ||
    env.INTERNAL_REPORT_EMAIL ||
    'contacto@privuskuzola.pt'
  );
}

function getReportFrom(env) {
  return env.PRIA_REPORT_FROM || 'Privus PRIA <relatorios@pria.privuskuzola.pt>';
}

function getReplyTo(env) {
  return env.PRIA_REPLY_TO || 'contacto@privuskuzola.pt';
}

function base64Bytes(bytes) {
  let binary = '';
  const chunkSize = 0x8000;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }

  return btoa(binary);
}

function base64Utf8(value) {
  return base64Bytes(new TextEncoder().encode(value));
}

function pdfText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[–—]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/€/g, 'EUR')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pdfEscape(value) {
  return pdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapText(value, maxChars = 92) {
  const text = pdfText(value);
  const words = text.split(' ').filter(Boolean);
  const lines = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;

    if (next.length > maxChars && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }

  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

function safeFileName(value) {
  return pdfText(value || 'organizacao')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'organizacao';
}

function formatRecommendation(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return '';
  return item.action || item.priority || JSON.stringify(item);
}

function buildPdf(report) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 52;
  const bottom = 58;
  const pages = [];
  let commands = [];
  let y = 0;
  let pageNumber = 0;

  function cmd(value) {
    commands.push(value);
  }

  function rect(x, yPos, w, h, r, g, b) {
    cmd(`${r} ${g} ${b} rg\n${x} ${yPos} ${w} ${h} re f\n`);
  }

  function text(x, yPos, value, size = 10, font = 'F1', r = 0.05, g = 0.11, b = 0.18) {
    const clean = pdfEscape(value);
    if (!clean) return;
    cmd(`BT ${r} ${g} ${b} rg /${font} ${size} Tf ${x} ${yPos} Td (${clean}) Tj ET\n`);
  }

  function footer() {
    text(margin, 34, 'Privus - Consultoria Regulatoria Digital', 8, 'F1', 0.35, 0.35, 0.35);
    text(pageWidth - 108, 34, `Pagina ${pageNumber}`, 8, 'F1', 0.35, 0.35, 0.35);
  }

  function header() {
    rect(0, pageHeight - 76, pageWidth, 76, 0.05, 0.11, 0.18);
    rect(0, pageHeight - 80, pageWidth, 4, 0.78, 0.66, 0.43);
    text(margin, pageHeight - 48, 'Privus', 22, 'F2', 0.78, 0.66, 0.43);
    text(margin + 88, pageHeight - 48, 'PRIA Angola', 12, 'F1', 0.92, 0.90, 0.86);
  }

  function newPage() {
    if (commands.length) {
      footer();
      pages.push(commands.join(''));
    }

    pageNumber += 1;
    commands = [];
    header();
    y = pageHeight - 112;
  }

  function ensureSpace(height) {
    if (y - height < bottom) newPage();
  }

  function line(value, options = {}) {
    const {
      size = 10,
      font = 'F1',
      leading = 15,
      color = [0.05, 0.11, 0.18],
      x = margin
    } = options;

    ensureSpace(leading + 4);
    text(x, y, value, size, font, color[0], color[1], color[2]);
    y -= leading;
  }

  function paragraph(value, options = {}) {
    const maxChars = options.maxChars || 92;
    const leading = options.leading || 14;
    const lines = wrapText(value, maxChars);

    ensureSpace((lines.length * leading) + 8);

    for (const item of lines) {
      line(item, { ...options, leading });
    }

    y -= options.after || 8;
  }

  function section(title) {
    ensureSpace(34);
    y -= 6;
    text(margin, y, title, 15, 'F2', 0.05, 0.11, 0.18);
    y -= 8;
    rect(margin, y, 96, 2, 0.78, 0.66, 0.43);
    y -= 22;
  }

  function keyValue(key, value) {
    ensureSpace(18);
    text(margin, y, `${key}:`, 10, 'F2', 0.05, 0.11, 0.18);
    text(margin + 128, y, value || '-', 10, 'F1', 0.05, 0.11, 0.18);
    y -= 16;
  }

  function bullet(value) {
    const lines = wrapText(value, 82);
    ensureSpace((lines.length * 13) + 6);
    text(margin, y, '-', 10, 'F2', 0.05, 0.11, 0.18);
    text(margin + 14, y, lines[0], 9, 'F1', 0.05, 0.11, 0.18);
    y -= 13;

    for (const item of lines.slice(1)) {
      text(margin + 14, y, item, 9, 'F1', 0.05, 0.11, 0.18);
      y -= 13;
    }

    y -= 3;
  }

  newPage();

  rect(margin, y - 126, pageWidth - (margin * 2), 126, 0.98, 0.96, 0.91);
  text(margin + 20, y - 32, 'Relatorio PRIA Angola', 25, 'F2', 0.05, 0.11, 0.18);
  text(margin + 20, y - 56, report.company || 'Organizacao', 14, 'F1', 0.05, 0.11, 0.18);
  text(margin + 20, y - 82, `${report.level || 'Resultado preliminar'} | Score final ${report.score}/100`, 12, 'F2', 0.52, 0.36, 0.13);
  text(margin + 20, y - 106, `Gerado em ${new Date(report.generated_at || Date.now()).toISOString().slice(0, 10)}`, 9, 'F1', 0.35, 0.35, 0.35);
  y -= 156;

  section('1. Identificacao');
  keyValue('Empresa', report.company);
  keyValue('NIF', report.nif);
  keyValue('Responsavel', report.name);
  keyValue('Cargo', report.role);
  keyValue('Email', report.email || report.consent_evidence?.lead_email);
  keyValue('Telefone', report.phone);
  keyValue('Setor', report.sector);
  keyValue('Localizacao', report.location);

  section('2. Resultado executivo');
  paragraph(report.summary || `A organizacao foi classificada como ${report.level || 'resultado preliminar'}, com score final de ${report.score}/100.`, { maxChars: 90 });
  keyValue('Classificacao', report.level || 'Resultado preliminar');
  keyValue('Score final', `${report.score}/100`);
  keyValue('Score matematico', `${report.math_score || report.score}/100`);

  section('3. Scores por pilar');
  const pillars = Array.isArray(report.pillars) ? report.pillars : [];
  if (pillars.length) {
    for (const pillar of pillars) {
      keyValue(pillar.name || 'Pilar', `${pillar.score}/100`);
    }
  } else {
    paragraph('Nao foram calculados scores por pilar no relatorio preliminar.');
  }

  section('4. Riscos prioritarios');
  const risks = Array.isArray(report.risks) ? report.risks.slice(0, 12) : [];
  if (risks.length) {
    risks.forEach(bullet);
  } else {
    paragraph('Nao foram identificadas red flags criticas no resumo preliminar. A validacao documental continua recomendada.');
  }

  section('5. Recomendacoes iniciais');
  const recommendations = Array.isArray(report.recommendations)
    ? report.recommendations.slice(0, 10).map(formatRecommendation).filter(Boolean)
    : [];

  if (recommendations.length) {
    recommendations.forEach(bullet);
  } else {
    paragraph('Validar evidencias, documentacao, medidas tecnicas e processos internos com a Privus.');
  }

  section('6. Roadmap preliminar');
  if (report.roadmap && typeof report.roadmap === 'object') {
    for (const [period, items] of Object.entries(report.roadmap)) {
      line(`${period} dias`, { font: 'F2', size: 11 });
      const lines = Array.isArray(items) ? items.slice(0, 4) : [];
      if (lines.length) lines.map(formatRecommendation).forEach(bullet);
      else bullet('Validar prioridades com a Privus.');
    }
  } else {
    paragraph('Roadmap a validar com a Privus apos analise documental.');
  }

  section('7. Documentacao recomendada');
  const documents = Array.isArray(report.documentation) ? report.documentation.slice(0, 14) : [];
  if (documents.length) documents.forEach(bullet);
  else paragraph('Inventario de tratamentos, politicas, procedimentos, contratos e evidencias devem ser validados.');

  section('8. Consentimento e evidencias');
  keyValue('Termos e Condicoes', report.consent_evidence?.terms_acceptance ? 'Aceites' : 'Nao aceites');
  keyValue('Politica de Privacidade', report.consent_evidence?.privacy_policy_acceptance ? 'Aceite' : 'Nao aceite');
  keyValue('Contacto comercial', report.consent_evidence?.commercial_contact ? 'Aceite' : 'Nao aceite');
  keyValue('Data/hora', report.consent_evidence?.accepted_at || '');
  keyValue('Origem', report.consent_evidence?.origin || '');
  keyValue('IP', report.consent_evidence?.ip || '');

  section('9. Nota de responsabilidade');
  paragraph('Este relatorio e automatico e preliminar. Nao substitui analise juridica, tecnica, regulatoria ou auditoria completa. A Privus deve validar respostas, documentos, evidencias e contexto operacional antes de emitir conclusoes finais ou plano de implementacao.', { maxChars: 90 });

  footer();
  pages.push(commands.join(''));

  const encoder = new TextEncoder();
  const objects = [null];
  const font1Number = 3 + (pages.length * 2);
  const font2Number = font1Number + 1;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[2] = `<< /Type /Pages /Count ${pages.length} /Kids [${pages.map((_, i) => `${3 + (i * 2)} 0 R`).join(' ')}] >>`;

  pages.forEach((content, i) => {
    const pageObject = 3 + (i * 2);
    const contentObject = pageObject + 1;
    const length = encoder.encode(content).length;

    objects[pageObject] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /Font << /F1 ${font1Number} 0 R /F2 ${font2Number} 0 R >> >> /Contents ${contentObject} 0 R >>`;
    objects[contentObject] = `<< /Length ${length} >>\nstream\n${content}\nendstream`;
  });

  objects[font1Number] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>';
  objects[font2Number] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>';

  let pdf = '%PDF-1.4\n';
  const offsets = [0];

  for (let i = 1; i < objects.length; i += 1) {
    offsets[i] = encoder.encode(pdf).length;
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = encoder.encode(pdf).length;
  pdf += `xref\n0 ${objects.length}\n`;
  pdf += '0000000000 65535 f \n';

  for (let i = 1; i < objects.length; i += 1) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }

  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return encoder.encode(pdf);
}

function buildClientHtml(report) {
  const recommendations = Array.isArray(report.recommendations)
    ? report.recommendations.slice(0, 5).map(formatRecommendation).filter(Boolean)
    : [];

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0D1B2A">
      <h2>PRIA Angola — Relatório em anexo</h2>
      <p>Olá ${htmlEscape(report.name)},</p>
      <p>
        Segue em anexo o relatório preliminar PRIA Angola da organização
        <strong>${htmlEscape(report.company)}</strong>.
      </p>
      <p>
        Resultado: <strong>${htmlEscape(report.level || 'Resultado preliminar')}</strong><br>
        Score final: <strong>${htmlEscape(report.score)}/100</strong>
      </p>
      ${recommendations.length ? `<h3>Prioridades iniciais</h3><ul>${recommendations.map(item => `<li>${htmlEscape(item)}</li>`).join('')}</ul>` : ''}
      <p>
        Este relatório é automático e preliminar. A validação jurídica, técnica e documental deve ser realizada pela Privus antes de qualquer conclusão final.
      </p>
      <p>Privus — Consultoria Regulatória Digital</p>
    </div>
  `;
}

function buildInternalHtml(report) {
  return `
    <div style="font-family:Arial,sans-serif;line-height:1.6;color:#0D1B2A">
      <h2>Novo PRIA Angola submetido</h2>
      <h3>Lead</h3>
      <ul>
        <li>Empresa: ${htmlEscape(report.company)}</li>
        <li>NIF: ${htmlEscape(report.nif || '')}</li>
        <li>Responsável: ${htmlEscape(report.name)}</li>
        <li>Cargo: ${htmlEscape(report.role || '')}</li>
        <li>Email: ${htmlEscape(report.email || report.consent_evidence?.lead_email || '')}</li>
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
        <li>Termos e Condições: ${report.consent_evidence?.terms_acceptance ? 'aceites' : 'não aceites'}</li>
        <li>Política de Privacidade: ${report.consent_evidence?.privacy_policy_acceptance ? 'aceite' : 'não aceite'}</li>
        <li>Contacto comercial: ${report.consent_evidence?.commercial_contact ? 'aceite' : 'não aceite'}</li>
        <li>Data/hora: ${htmlEscape(report.consent_evidence?.accepted_at || '')}</li>
        <li>Origem: ${htmlEscape(report.consent_evidence?.origin || '')}</li>
        <li>IP: ${htmlEscape(report.consent_evidence?.ip || '')}</li>
      </ul>
      <p>O PDF e o JSON completo seguem em anexo.</p>
    </div>
  `;
}

async function sendResendEmail(env, message) {
  if (!env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY não configurada.');
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error('Resend send failed:', data);
    throw new Error(data.message || 'Não foi possível enviar email pela Resend.');
  }

  return data;
}

async function sendReportEmails(env, payload, report) {
  const internalEmail = getInternalEmail(env);

  if (!isValidEmail(internalEmail)) {
    throw new Error('Email interno de receção não configurado.');
  }

  const pdfBytes = buildPdf(report);
  const pdfBase64 = base64Bytes(pdfBytes);
  const jsonBase64 = base64Utf8(JSON.stringify(report, null, 2));
  const filenameBase = safeFileName(report.company);
  const timestamp = Date.now();
  const pdfFilename = `pria-angola-${filenameBase}-${timestamp}.pdf`;
  const jsonFilename = `pria-angola-${filenameBase}-${timestamp}.json`;
  const from = getReportFrom(env);
  const replyTo = getReplyTo(env);

  await sendResendEmail(env, {
    from,
    to: [payload.email],
    reply_to: replyTo,
    subject: `PRIA Angola — Relatório preliminar · ${report.company}`,
    html: buildClientHtml(report),
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBase64
      }
    ],
    tags: [
      { name: 'product', value: 'pria_angola' },
      { name: 'recipient_type', value: 'client' }
    ]
  });

  await sendResendEmail(env, {
    from,
    to: [internalEmail],
    reply_to: payload.email,
    subject: `Novo PRIA Angola · ${report.company} · ${report.score}/100`,
    html: buildInternalHtml(report),
    attachments: [
      {
        filename: pdfFilename,
        content: pdfBase64
      },
      {
        filename: jsonFilename,
        content: jsonBase64
      }
    ],
    tags: [
      { name: 'product', value: 'pria_angola' },
      { name: 'recipient_type', value: 'internal' }
    ]
  });
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

  if (origin && origin !== requestUrl.origin && !allowedOrigins.includes(origin)) {
    return jsonResponse({ error: 'Origem não autorizada.' }, 403);
  }

  if (Date.now() >= FREE_DEADLINE) {
    return jsonResponse(
      {
        error: 'A fase gratuita do PRIA Angola terminou. O acesso pago será ativado pela Privus.'
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
      message: 'Relatório PRIA Angola enviado por email com PDF em anexo.',
      report_id: `pria-angola-${Date.now()}`
    });
  } catch (error) {
    console.error('PRIA Angola Resend PDF report failed:', error);

    return jsonResponse(
      {
        error: 'Não foi possível gerar/enviar o relatório PRIA Angola. Verifica a configuração Resend e tenta novamente.'
      },
      502
    );
  }
}
