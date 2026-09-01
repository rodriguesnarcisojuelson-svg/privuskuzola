const ACCESS_COOKIE = "pria_access";

const PROTECTED_PATHS = {
  "/pria-engine-prototype": ["assessment", "guided", "upgrade"],
  "/pria-engine-prototype.html": ["assessment", "guided", "upgrade"],
  "/pria-guided": ["guided", "upgrade"],
  "/pria-guided.html": ["guided", "upgrade"],
};

const SEPTEMBER_INSIGHT_URL =
  "/insights/2026/09/continuidade-negocio-rgpd-iso-22301/";

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

async function verifyAccessToken(token, secret) {
  try {
    const [payload, signature] = String(token || "").split(".");

    if (!payload || !signature) return null;

    const key = await crypto.subtle.importKey(
      "raw",
      textBytes(secret),
      {
        name: "HMAC",
        hash: "SHA-256",
      },
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

    if (
      !data.exp ||
      data.exp <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return data;
  } catch {
    return null;
  }
}

async function rewriteHtml(response, pathname) {
  const contentType = response.headers.get("Content-Type") || "";

  if (!contentType.includes("text/html")) {
    return response;
  }

  let html = await response.text();

  if (pathname === "/") {
    const replacements = [
      [
        'class="insight-card upcoming"',
        'class="insight-card"',
      ],
      [
        '<div class="insight-edition" id="t-ins-e3-ed">Próxima edição · Setembro 2026</div>',
        '<div class="insight-edition" id="t-ins-e3-ed">Nº 3 · Setembro 2026</div>',
      ],
      [
        '<span class="insight-status" id="t-ins-e3-status">Em preparação</span>',
        `<a href="${SEPTEMBER_INSIGHT_URL}" class="insight-cta" id="t-ins-e3-cta">Ler análise →</a>`,
      ],
      [
        "'ins-e3-ed':'Próxima edição · Setembro 2026'",
        "'ins-e3-ed':'Nº 3 · Setembro 2026'",
      ],
      [
        "'ins-e3-status':'Em preparação'",
        "'ins-e3-cta':'Ler análise →'",
      ],
      [
        "'ins-e3-ed':'Next edition · September 2026'",
        "'ins-e3-ed':'No. 3 · September 2026'",
      ],
      [
        "'ins-e3-status':'In preparation'",
        "'ins-e3-cta':'Read analysis →'",
      ],
      [
        "'ins-e3-ed':'Próxima edição · Septiembre 2026'",
        "'ins-e3-ed':'Nº 3 · Septiembre 2026'",
      ],
      [
        "'ins-e3-status':'En preparación'",
        "'ins-e3-cta':'Leer análisis →'",
      ],
    ];

    for (const [from, to] of replacements) {
      html = html.replace(from, to);
    }
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

  if (
    (pathname === "/" || pathname === SEPTEMBER_INSIGHT_URL.replace(/\/$/, "")) &&
    context.request.method === "GET"
  ) {
    const response = await context.next();
    return rewriteHtml(response, pathname);
  }

  const allowedPlans = PROTECTED_PATHS[pathname];

  // Todas as páginas normais e funções continuam sem interferência.
  if (!allowedPlans) {
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

  const token = readCookie(
    context.request,
    ACCESS_COOKIE
  );

  const access = await verifyAccessToken(
    token,
    context.env.PRIA_ACCESS_SECRET
  );

  if (
    !access ||
    !allowedPlans.includes(access.plan)
  ) {
    const destination = new URL(
      "/pria-planos.html?required=1",
      context.request.url
    );

    return Response.redirect(
      destination.toString(),
      302
    );
  }

  context.data.priaAccess = access;

  return context.next();
}
