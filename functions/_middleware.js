const ACCESS_COOKIE = "pria_access";
const OWNER_PREVIEW_COOKIE = "pria_owner_preview";
const OWNER_PREVIEW_PATH = "/pria-owner-preview";
const OWNER_PREVIEW_HASH = "10f2aa9ac63b0e9cd71efc8068381af8d701baa613d912bd41a53bb66af9df27";
const OWNER_PREVIEW_EXPIRES_AT = Date.parse("2026-09-25T12:00:00Z");
const ANGOLA_OWNER_PREVIEW_PATH = "/pria-angola/owner-preview";
const ANGOLA_OWNER_PREVIEW_EXPIRES_AT = Date.parse("2026-09-27T12:00:00Z");
const ANGOLA_ACCESS_COOKIE = "pria_angola_access";
const ANGOLA_ACTIVATE_PATH = "/pria-angola/ativar";

const PROTECTED_PATHS = {
  "/pria-engine-prototype": ["assessment", "guided", "upgrade"],
  "/pria-engine-prototype.html": ["assessment", "guided", "upgrade"],
  "/pria-guided": ["guided", "upgrade"],
  "/pria-guided.html": ["guided", "upgrade"],
};

const SEPTEMBER_INSIGHT_URL =
  "/insights/2026/09/continuidade-negocio-rgpd-iso-22301/";

const PRIA_ANGOLA_PATHS = new Set([
  "/pria-angola",
  "/pria-angola/index.html",
]);

const PRIA_ANGOLA_TERMS_PATHS = new Set([
  "/pria-angola/termos-condicoes",
  "/pria-angola/termos-condicoes.html",
]);

const PRIA_ANGOLA_PROTECTED_PATHS = new Set([
  "/pria-angola/assessment",
  "/pria-angola/assessment.html",
  "/pria-angola/data/questions.js",
  "/api/pria-angola-report",
]);

const PRIA_ANGOLA_PRICE = "350.000 Kz";
const PRIA_ANGOLA_WHATSAPP =
  "https://wa.me/351936246971?text=" +
  encodeURIComponent(
    "Olá Privus. Pretendo adquirir acesso ao PRIA Angola e receber os dados para pagamento."
  );

const OCTOBER_CARD = `
      <div class="insight-card upcoming" style="grid-column:1/-1">
        <div class="insight-edition" id="t-ins-e4-ed">Próxima edição · Outubro 2026</div>
        <div class="insight-theme" id="t-ins-e4-theme">AI Governance · Shadow AI · Accountability</div>
        <h3 id="t-ins-e4-h">O ponto cego da governação de IA</h3>
        <p id="t-ins-e4-p">Uma análise sobre os usos de IA que escapam ao inventário, à aprovação e aos mecanismos tradicionais de compliance, e sobre como transformar essa invisibilidade em controlo e evidência.</p>
        <span class="insight-status" id="t-ins-e4-status">Em preparação</span>
      </div>`;

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);

  return Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0)
  );
}

function readCookie(request, name) {
  const cookies = request.headers.get("Cookie") || "";

  for (const part of cookies.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;

    const cookieName = part.slice(0, separator).trim();
    if (cookieName === name) {
      return part.slice(separator + 1).trim();
    }
  }

  return "";
}

async function sha256Hex(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    textBytes(String(value || ""))
  );

  return Array.from(new Uint8Array(digest))
    .map(byte => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function validOwnerPreviewKey(value) {
  if (Date.now() >= OWNER_PREVIEW_EXPIRES_AT) return false;
  if (!value) return false;
  return (await sha256Hex(value)) === OWNER_PREVIEW_HASH;
}

async function verifyAccessToken(token, secret) {
  try {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      textBytes(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"]
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      textBytes(payload)
    );

    if (!valid) return null;

    const data = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload))
    );

    if (!data.exp || data.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

function priaAngolaLockedPage() {
  return `<!doctype html>
<html lang="pt-PT">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="PRIA Angola — diagnóstico regulatório da Privus com acesso mediante pagamento e licença por organização.">
  <meta name="robots" content="index,follow">
  <meta name="theme-color" content="#0D1B2A">
  <title>PRIA Angola — Acesso | Privus</title>
  <link rel="canonical" href="https://privuskuzola.pt/pria-angola/">
  <link rel="stylesheet" href="/assets/css/fonts.css">
  <style>
    :root{--navy:#0D1B2A;--gold:#C8A96E;--gold2:#D9BE90;--cream:#F0EBE0;--white:#fff;--muted:#6B7280;--line:rgba(13,27,42,.14)}
    *{box-sizing:border-box}body{margin:0;background:var(--cream);color:var(--navy);font-family:'Outfit',sans-serif;font-weight:300;line-height:1.65}a{color:inherit;text-decoration:none}.wrap{width:min(1080px,92vw);margin:auto}
    nav{background:var(--navy);border-bottom:1px solid rgba(255,255,255,.12)}.nav-inner{display:flex;align-items:center;justify-content:space-between;padding:16px 0;gap:20px}.logo{width:170px;height:auto}.back{font-size:12px;letter-spacing:.09em;text-transform:uppercase;color:var(--gold2)}
    .hero{background:var(--navy);color:var(--white);padding:80px 0 72px;border-bottom:4px solid var(--gold)}.eyebrow{font-size:11px;letter-spacing:.2em;text-transform:uppercase;color:var(--gold);font-weight:500;margin-bottom:16px}.hero-grid{display:grid;grid-template-columns:1.15fr .85fr;gap:54px;align-items:center}h1,h2{font-family:'Cormorant Garamond',serif;font-weight:400;line-height:1.05;margin:0}h1{font-size:clamp(44px,7vw,76px);max-width:760px}.lead{font-size:18px;color:rgba(255,255,255,.72);max-width:680px;margin:24px 0 0}.price-card{border:1px solid rgba(200,169,110,.45);padding:28px;background:rgba(255,255,255,.045)}.price-label{font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:var(--gold2)}.price{font-family:'Cormorant Garamond',serif;font-size:48px;color:var(--gold);line-height:1;margin:10px 0 12px}.price-card p{font-size:13px;color:rgba(255,255,255,.65);margin:0}
    main{padding:68px 0}.intro{max-width:760px;margin-bottom:34px}.intro h2{font-size:clamp(32px,4vw,48px);margin-bottom:14px}.intro p{color:var(--muted);margin:0}.payments{display:grid;grid-template-columns:1fr 1fr;gap:16px}.payment{background:var(--white);border:1px solid var(--line);padding:28px}.payment .num{font-family:'Cormorant Garamond',serif;font-size:34px;color:var(--gold);margin-bottom:20px}.payment h3{font-size:18px;margin:0 0 8px;font-weight:500}.payment p{font-size:14px;color:var(--muted);margin:0}.access-note{margin-top:20px;padding:22px 24px;border-left:3px solid var(--gold);background:#FAF7F0;font-size:14px}.actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:28px}.btn{display:inline-flex;align-items:center;justify-content:center;padding:14px 20px;background:var(--gold);color:var(--navy);font-size:12px;font-weight:600;letter-spacing:.08em;text-transform:uppercase}.btn.secondary{background:transparent;border:1px solid var(--navy)}
    .legal{display:flex;gap:18px;flex-wrap:wrap;margin-top:26px;font-size:12px;color:var(--muted)}.legal a{text-decoration:underline;text-underline-offset:3px}footer{background:var(--navy);color:rgba(255,255,255,.55);padding:30px 0;font-size:12px;text-align:center}
    @media(max-width:760px){.hero{padding:58px 0}.hero-grid,.payments{grid-template-columns:1fr}.hero-grid{gap:30px}.logo{width:145px}.price{font-size:42px}}
  </style>
</head>
<body>
  <nav><div class="wrap nav-inner"><a href="/" aria-label="Privus — início"><img class="logo" src="/logo-privus-horizontal.png" alt="Privus"></a><a class="back" href="/">Voltar ao site</a></div></nav>
  <header class="hero">
    <div class="wrap hero-grid">
      <div>
        <div class="eyebrow">PRIA Angola · Acesso mediante pagamento</div>
        <h1>Diagnóstico regulatório para organizações em Angola.</h1>
        <p class="lead">O acesso gratuito ao PRIA Angola terminou. O diagnóstico encontra-se agora bloqueado e é disponibilizado mediante pagamento e ativação de uma licença por organização.</p>
      </div>
      <aside class="price-card">
        <div class="price-label">PRIA Angola</div>
        <div class="price">${PRIA_ANGOLA_PRICE}</div>
        <p>Diagnóstico + relatório PRIA. Consultoria, implementação e acompanhamento são contratados separadamente.</p>
      </aside>
    </div>
  </header>
  <main>
    <div class="wrap">
      <div class="intro">
        <div class="eyebrow">Pagamento e ativação</div>
        <h2>Escolha a forma de pagamento.</h2>
        <p>Após confirmação do pagamento, a Privus ativa o acesso associado à organização. A licença é individual, válida por 15 dias após ativação e destinada a uma avaliação.</p>
      </div>
      <div class="payments">
        <div class="payment"><div class="num">01</div><h3>MULTICAIXA Express</h3><p>Solicite à Privus os dados e instruções necessários para efetuar o pagamento por Express.</p></div>
        <div class="payment"><div class="num">02</div><h3>Transferência bancária</h3><p>Solicite à Privus os dados bancários para pagamento por transferência.</p></div>
      </div>
      <div class="access-note"><strong>Ativação:</strong> o questionário e o relatório não ficam disponíveis antes da confirmação do pagamento e da ativação da licença pela Privus.</div>
      <div class="actions">
        <a class="btn" href="${PRIA_ANGOLA_WHATSAPP}" target="_blank" rel="noopener">Solicitar dados de pagamento →</a>
        <a class="btn secondary" href="mailto:contacto@privuskuzola.pt?subject=PRIA%20Angola%20-%20Acesso">Contactar por email</a>
      </div>
      <div class="legal"><a href="/pria-angola/termos-condicoes.html">Termos e Condições</a><a href="/pria-angola/politica-privacidade.html">Política de Privacidade</a></div>
    </div>
  </main>
  <footer><div class="wrap">Privus · PRIA Angola · contacto@privuskuzola.pt</div></footer>
</body>
</html>`;
}

async function rewriteHtml(response, pathname) {
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) return response;

  let html = await response.text();

  if (pathname === "/") {
    html = html.replace(
      'class="insight-card upcoming"',
      'class="insight-card"'
    );
    html = html.replace(
      '<div class="insight-edition" id="t-ins-e3-ed">Próxima edição · Setembro 2026</div>',
      '<div class="insight-edition" id="t-ins-e3-ed">Nº 3 · Setembro 2026</div>'
    );
    html = html.replace(
      '<span class="insight-status" id="t-ins-e3-status">Em preparação</span>',
      `<a href="${SEPTEMBER_INSIGHT_URL}" class="insight-cta" id="t-ins-e3-cta">Ler análise →</a>`
    );

    html = html.replace(
      '<a href="/angola/consultoria-protecao-dados/" class="servico-link" id="t-sv2cta">Conhecer o serviço →</a>',
      '<a href="/pria-angola/" class="servico-link" id="t-sv2cta">PRIA Angola →</a>'
    );
    html = html.replace(
      "'sv2cta':'Conhecer o serviço →'",
      "'sv2cta':'PRIA Angola →'"
    );
    html = html.replace(
      "'sv2cta':'Explore the service →'",
      "'sv2cta':'PRIA Angola →'"
    );
    html = html.replace(
      "'sv2cta':'Conocer el servicio →'",
      "'sv2cta':'PRIA Angola →'"
    );

    html = html.replace(
      "'ins-e3-ed':'Próxima edição · Setembro 2026'",
      "'ins-e3-ed':'Nº 3 · Setembro 2026'"
    );
    html = html.replace(
      "'ins-e3-status':'Em preparação'",
      "'ins-e3-cta':'Ler análise →','ins-e4-ed':'Próxima edição · Outubro 2026','ins-e4-theme':'AI Governance · Shadow AI · Accountability','ins-e4-h':'O ponto cego da governação de IA','ins-e4-p':'Uma análise sobre os usos de IA que escapam ao inventário, à aprovação e aos mecanismos tradicionais de compliance, e sobre como transformar essa invisibilidade em controlo e evidência.','ins-e4-status':'Em preparação'"
    );

    html = html.replace(
      "'ins-e3-ed':'Next edition · September 2026'",
      "'ins-e3-ed':'No. 3 · September 2026'"
    );
    html = html.replace(
      "'ins-e3-status':'In preparation'",
      "'ins-e3-cta':'Read analysis →','ins-e4-ed':'Next edition · October 2026','ins-e4-theme':'AI Governance · Shadow AI · Accountability','ins-e4-h':'The blind spot of AI governance','ins-e4-p':'An analysis of AI uses that escape inventory, approval and traditional compliance mechanisms, and how to turn that invisibility into control and evidence.','ins-e4-status':'In preparation'"
    );

    html = html.replace(
      "'ins-e3-ed':'Próxima edição · Septiembre 2026'",
      "'ins-e3-ed':'Nº 3 · Septiembre 2026'"
    );
    html = html.replace(
      "'ins-e3-status':'En preparación'",
      "'ins-e3-cta':'Leer análisis →','ins-e4-ed':'Próxima edición · Octubre 2026','ins-e4-theme':'AI Governance · Shadow AI · Accountability','ins-e4-h':'El punto ciego de la gobernanza de IA','ins-e4-p':'Un análisis de los usos de IA que escapan al inventario, la aprobación y los mecanismos tradicionales de compliance, y de cómo convertir esa invisibilidad en control y evidencia.','ins-e4-status':'En preparación'"
    );

    if (!html.includes('id="t-ins-e4-ed"')) {
      const gridEnd = `      </div>\n    </div>\n\n    <p style="margin:0 0 2rem"><a href="/insights/"`;
      html = html.replace(
        gridEnd,
        `      </div>${OCTOBER_CARD}\n    </div>\n\n    <p style="margin:0 0 2rem"><a href="/insights/"`
      );
    }
  }

  if (PRIA_ANGOLA_TERMS_PATHS.has(pathname)) {
    html = html.replace(
      "Versão 1.0 · Última atualização: 20 de agosto de 2026",
      "Versão 1.1 · Última atualização: 6 de setembro de 2026"
    );

    html = html.replace(
      /<section class="card">\s*<h2>4\. Janela gratuita e preço futuro<\/h2>[\s\S]*?<\/section>/,
      `<section class="card">
      <h2>4. Preço, pagamento e acesso</h2>
      <p>O PRIA Angola tem o valor de <strong>${PRIA_ANGOLA_PRICE}</strong> por organização, salvo campanha, condição comercial ou proposta específica comunicada pela Privus.</p>
      <p>O pagamento pode ser realizado por <strong>MULTICAIXA Express</strong> ou por <strong>transferência bancária</strong>, através dos dados disponibilizados pela Privus.</p>
      <p>O acesso ao diagnóstico é ativado após confirmação do pagamento. Salvo indicação comercial diferente, a licença é individual, válida por 15 dias após ativação e permite uma avaliação PRIA por organização.</p>
      <p>O valor do PRIA Angola não inclui consultoria personalizada, implementação, acompanhamento, elaboração documental, representação perante autoridades, formação, auditoria ou outros serviços profissionais não expressamente incluídos.</p>
    </section>`
    );

    html = html.replace(
      /<div class="notice">\s*<strong>Resumo operacional:<\/strong>[\s\S]*?<\/div>/,
      `<div class="notice">
      <strong>Resumo operacional:</strong> o PRIA Angola tem o valor de ${PRIA_ANGOLA_PRICE} por organização.
      O pagamento pode ser realizado por MULTICAIXA Express ou transferência bancária. O acesso é ativado pela Privus após confirmação do pagamento.
      Implementação e consultoria são serviços separados.
    </div>`
    );
  }

  if (pathname === SEPTEMBER_INSIGHT_URL.replace(/\/$/, "")) {
    html = html.replace(
      '<a class="button" href="/privus-month-insights-setembro-2026.pdf">Descarregar PDF</a>',
      '<span class="button" aria-disabled="true" style="opacity:.58;cursor:default">PDF em preparação</span>'
    );
  }

  const headers = new Headers(response.headers);
  headers.delete("Content-Length");
  headers.delete("ETag");

  return new Response(html, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname =
    url.pathname.length > 1
      ? url.pathname.replace(/\/+$/, "")
      : url.pathname;

  if (pathname === OWNER_PREVIEW_PATH && context.request.method === "GET") {
    const previewKey = url.searchParams.get("key") || "";

    if (!(await validOwnerPreviewKey(previewKey))) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    }

    const destination = new URL(
      "/pria-engine-prototype",
      context.request.url
    );

    return new Response(null, {
      status: 302,
      headers: {
        "Location": destination.toString(),
        "Set-Cookie": [
          `${OWNER_PREVIEW_COOKIE}=${previewKey}`,
          "Path=/",
          "Max-Age=21600",
          "HttpOnly",
          "Secure",
          "SameSite=Strict",
        ].join("; "),
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  if (pathname === ANGOLA_OWNER_PREVIEW_PATH && context.request.method === "GET") {
    const previewKey = url.searchParams.get("key") || "";
    const validHash =
      previewKey &&
      (await sha256Hex(previewKey)) === OWNER_PREVIEW_HASH &&
      Date.now() < ANGOLA_OWNER_PREVIEW_EXPIRES_AT;

    if (!validHash) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
          "Cache-Control": "no-store",
          "Referrer-Policy": "no-referrer",
        },
      });
    }

    const destination = new URL(
      "/pria-angola/assessment",
      context.request.url
    );

    return new Response(null, {
      status: 302,
      headers: {
        "Location": destination.toString(),
        "Set-Cookie": [
          `${OWNER_PREVIEW_COOKIE}=${previewKey}`,
          "Path=/",
          "Max-Age=43200",
          "HttpOnly",
          "Secure",
          "SameSite=Strict",
        ].join("; "),
        "Cache-Control": "no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  if (pathname === ANGOLA_ACTIVATE_PATH && context.request.method === "GET") {
    if (!context.env.PRIA_ACCESS_SECRET) {
      return new Response("Ativação temporariamente indisponível.", {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const token = url.searchParams.get("token") || "";
    const access = await verifyAccessToken(
      token,
      context.env.PRIA_ACCESS_SECRET
    );

    if (
      !access ||
      access.plan !== "angola" ||
      access.product !== "pria-angola"
    ) {
      return new Response("Link de ativação inválido ou expirado.", {
        status: 403,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const now = Math.floor(Date.now() / 1000);
    const maxAge = Math.max(
      60,
      Math.min(access.exp - now, 60 * 60 * 24 * 30)
    );

    const destination = new URL(
      "/pria-angola/assessment",
      context.request.url
    );

    return new Response(null, {
      status: 302,
      headers: {
        "Location": destination.toString(),
        "Set-Cookie": [
          `${ANGOLA_ACCESS_COOKIE}=${token}`,
          "Path=/",
          `Max-Age=${maxAge}`,
          "HttpOnly",
          "Secure",
          "SameSite=Strict",
        ].join("; "),
        "Cache-Control": "no-store",
        "X-Robots-Tag": "noindex, nofollow, noarchive",
      },
    });
  }

  if (PRIA_ANGOLA_PATHS.has(pathname) && context.request.method === "GET") {
    const ownerPreviewCookie = readCookie(
      context.request,
      OWNER_PREVIEW_COOKIE
    );

    const ownerPreviewAllowed =
      ownerPreviewCookie &&
      (await sha256Hex(ownerPreviewCookie)) === OWNER_PREVIEW_HASH &&
      Date.now() < ANGOLA_OWNER_PREVIEW_EXPIRES_AT;

    let paidAccess = null;

    if (context.env.PRIA_ACCESS_SECRET) {
      paidAccess = await verifyAccessToken(
        readCookie(context.request, ANGOLA_ACCESS_COOKIE),
        context.env.PRIA_ACCESS_SECRET
      );
    }

    const paidAccessAllowed =
      paidAccess &&
      paidAccess.plan === "angola" &&
      paidAccess.product === "pria-angola";

    if (ownerPreviewAllowed || paidAccessAllowed) {
      return Response.redirect(
        new URL("/pria-angola/assessment", context.request.url).toString(),
        302
      );
    }

    return new Response(priaAngolaLockedPage(), {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=UTF-8",
        "Cache-Control": "no-store",
      },
    });
  }

  if (PRIA_ANGOLA_PROTECTED_PATHS.has(pathname)) {
    const ownerPreviewCookie = readCookie(
      context.request,
      OWNER_PREVIEW_COOKIE
    );

    const ownerPreviewAllowed =
      ownerPreviewCookie &&
      (await sha256Hex(ownerPreviewCookie)) === OWNER_PREVIEW_HASH &&
      Date.now() < ANGOLA_OWNER_PREVIEW_EXPIRES_AT;

    if (ownerPreviewAllowed) {
      context.data.priaAngolaAccess = {
        plan: "owner-preview",
        product: "pria-angola",
        exp: Math.floor(ANGOLA_OWNER_PREVIEW_EXPIRES_AT / 1000),
      };
      return context.next();
    }

    let paidAccess = null;

    if (context.env.PRIA_ACCESS_SECRET) {
      paidAccess = await verifyAccessToken(
        readCookie(context.request, ANGOLA_ACCESS_COOKIE),
        context.env.PRIA_ACCESS_SECRET
      );
    }

    if (
      paidAccess &&
      paidAccess.plan === "angola" &&
      paidAccess.product === "pria-angola"
    ) {
      context.data.priaAngolaAccess = paidAccess;
      return context.next();
    }

    if (
      pathname === "/pria-angola/assessment" ||
      pathname === "/pria-angola/assessment.html"
    ) {
      return Response.redirect(
        new URL("/pria-angola/", context.request.url).toString(),
        302
      );
    }

    return new Response("Acesso ao diagnóstico PRIA Angola bloqueado.", {
      status: 403,
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
        "Cache-Control": "no-store",
      },
    });
  }

  if (
    (pathname === "/" ||
      pathname === SEPTEMBER_INSIGHT_URL.replace(/\/$/, "") ||
      PRIA_ANGOLA_TERMS_PATHS.has(pathname)) &&
    context.request.method === "GET"
  ) {
    const response = await context.next();
    return rewriteHtml(response, pathname);
  }

  const allowedPlans = PROTECTED_PATHS[pathname];
  if (!allowedPlans) return context.next();

  const ownerPreviewCookie = readCookie(
    context.request,
    OWNER_PREVIEW_COOKIE
  );

  const ownerPreviewAllowed =
    (pathname === "/pria-engine-prototype" ||
      pathname === "/pria-engine-prototype.html") &&
    await validOwnerPreviewKey(ownerPreviewCookie);

  if (ownerPreviewAllowed) {
    context.data.priaAccess = {
      plan: "owner-preview",
      exp: Math.floor(OWNER_PREVIEW_EXPIRES_AT / 1000),
    };
    return context.next();
  }

  if (!context.env.PRIA_ACCESS_SECRET) {
    return new Response(
      "Acesso ao PRIA temporariamente indisponível.",
      {
        status: 503,
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
          "Cache-Control": "no-store",
        },
      }
    );
  }

  const token = readCookie(context.request, ACCESS_COOKIE);
  const access = await verifyAccessToken(
    token,
    context.env.PRIA_ACCESS_SECRET
  );

  if (!access || !allowedPlans.includes(access.plan)) {
    const destination = new URL(
      "/pria-planos.html?required=1",
      context.request.url
    );
    return Response.redirect(destination.toString(), 302);
  }

  context.data.priaAccess = access;
  return context.next();
}
