const PRIA_API = "https://api.privuskuzola.pt/api/report";

const MAX_BODY_SIZE = 500000;

const FREE_DEADLINE = Date.parse("2026-09-04T00:00:00+01:00");

const ALLOWED_ORIGINS = [
  "https://privuskuzola.pt",
  "https://www.privuskuzola.pt"
];

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive"
    }
  });
}

function isValidEmail(email) {
  return typeof email === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function cleanString(value, max = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") {
    return "Pedido inválido.";
  }

  const email = cleanString(payload.email, 254);
  const report = payload.report;

  if (!isValidEmail(email)) {
    return "Email inválido.";
  }

  if (!report || typeof report !== "object") {
    return "Relatório inválido.";
  }

  if (report.product !== "PRIA Angola") {
    return "Produto inválido.";
  }

  if (report.terms_acceptance !== true) {
    return "É necessário aceitar os Termos e Condições e a Política de Privacidade.";
  }

  if (!cleanString(report.company, 200)) {
    return "Empresa/organização obrigatória.";
  }

  if (!cleanString(report.name, 200)) {
    return "Responsável obrigatório.";
  }

  if (!cleanString(report.sector, 200)) {
    return "Setor obrigatório.";
  }

  if (typeof report.score !== "number") {
    return "Score inválido.";
  }

  if (report.score < 0 || report.score > 100) {
    return "Score fora do intervalo permitido.";
  }

  return "";
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const origin = request.headers.get("Origin");

  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return jsonResponse({ error: "Origem não autorizada." }, 403);
  }

  const now = Date.now();

  if (now >= FREE_DEADLINE) {
    return jsonResponse(
      {
        error:
          "A fase gratuita do PRIA Angola terminou. O acesso pago por código será ativado pela Privus."
      },
      402
    );
  }

  const contentType = request.headers.get("Content-Type") || "";

  if (!contentType.toLowerCase().includes("application/json")) {
    return jsonResponse({ error: "Formato do pedido inválido." }, 415);
  }

  const body = await request.arrayBuffer();

  if (body.byteLength > MAX_BODY_SIZE) {
    return jsonResponse({ error: "Pedido demasiado grande." }, 413);
  }

  let payload;

  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return jsonResponse({ error: "JSON inválido." }, 400);
  }

  const validationError = validatePayload(payload);

  if (validationError) {
    return jsonResponse({ error: validationError }, 400);
  }

  try {
    const upstreamHeaders = {
      "Content-Type": "application/json",
      "Accept": "application/json"
    };

    if (env.PRIA_API_SECRET) {
      upstreamHeaders["X-Privus-Internal-Secret"] = env.PRIA_API_SECRET;
    }

    const response = await fetch(PRIA_API, {
      method: "POST",
      headers: upstreamHeaders,
      body: JSON.stringify(payload)
    });

    const responseContentType =
      response.headers.get("Content-Type") || "application/json; charset=UTF-8";

    const headers = new Headers();
    headers.set("Content-Type", responseContentType);
    headers.set("Cache-Control", "no-store");
    headers.set("X-Robots-Tag", "noindex, nofollow, noarchive");

    const disposition = response.headers.get("Content-Disposition");

    if (disposition) {
      headers.set("Content-Disposition", disposition);
    }

    return new Response(response.body, {
      status: response.status,
      headers
    });
  } catch (error) {
    console.error("PRIA Angola report proxy failed:", error);

    return jsonResponse(
      {
        error:
          "Não foi possível contactar o serviço de relatórios PRIA Angola."
      },
      502
    );
  }
}
