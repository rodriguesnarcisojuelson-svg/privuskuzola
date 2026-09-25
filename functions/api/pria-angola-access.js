const MAX_DAYS = 30;

function textBytes(value) {
  return new TextEncoder().encode(String(value || ""));
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function signPayload(payload, secret) {
  const encodedPayload = toBase64Url(
    textBytes(JSON.stringify(payload))
  );

  const key = await crypto.subtle.importKey(
    "raw",
    textBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      textBytes(encodedPayload)
    )
  );

  return `${encodedPayload}.${toBase64Url(signature)}`;
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
    },
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  if (!env.PRIA_ACCESS_SECRET || !env.PRIA_API_SECRET) {
    return json(
      { error: "Serviço de ativação não configurado." },
      503
    );
  }

  const providedSecret =
    request.headers.get("X-Privus-Internal-Secret") || "";

  if (providedSecret !== env.PRIA_API_SECRET) {
    return json({ error: "Acesso não autorizado." }, 403);
  }

  let body = {};

  try {
    body = await request.json();
  } catch {
    return json({ error: "JSON inválido." }, 400);
  }

  const requestedDays = Number(body.days || 15);
  const days = Math.max(
    1,
    Math.min(
      Number.isFinite(requestedDays) ? requestedDays : 15,
      MAX_DAYS
    )
  );

  const now = Math.floor(Date.now() / 1000);
  const exp = now + Math.round(days * 86400);

  const payload = {
    plan: "angola",
    product: "pria-angola",
    company: String(body.company || "").slice(0, 160),
    reference: crypto.randomUUID(),
    iat: now,
    exp,
  };

  const token = await signPayload(
    payload,
    env.PRIA_ACCESS_SECRET
  );

  const requestUrl = new URL(request.url);
  const activationUrl =
    `${requestUrl.origin}/pria-angola/ativar?token=${encodeURIComponent(token)}`;

  return json({
    ok: true,
    activation_url: activationUrl,
    expires_at: new Date(exp * 1000).toISOString(),
    reference: payload.reference,
  });
}
