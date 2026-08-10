const ACCESS_COOKIE = "pria_access";
const ACCESS_MAX_AGE = 30 * 24 * 60 * 60;

function configuredPlans(env) {
  return [
    {
      plan: "assessment",
      priceId: env.STRIPE_PRICE_ASSESSMENT,
      amount: 25000,
      destination: "/pria-engine-prototype",
    },
    {
      plan: "guided",
      priceId: env.STRIPE_PRICE_GUIDED,
      amount: 35000,
      destination: "/pria-guided.html",
    },
    {
      plan: "upgrade",
      priceId: env.STRIPE_PRICE_UPGRADE,
      amount: 10000,
      destination: "/pria-guided.html",
    },
  ];
}

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function toBase64Url(bytes) {
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function importHmacKey(secret, usage) {
  return crypto.subtle.importKey(
    "raw",
    textBytes(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    usage
  );
}

async function createAccessToken(sessionId, plan, secret) {
  const payloadObject = {
    sid: sessionId,
    plan,
    exp: Math.floor(Date.now() / 1000) + ACCESS_MAX_AGE,
  };
  const payload = toBase64Url(textBytes(JSON.stringify(payloadObject)));
  const key = await importHmacKey(secret, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, textBytes(payload));
  return `${payload}.${toBase64Url(new Uint8Array(signature))}`;
}

async function verifyAccessToken(token, secret) {
  try {
    const [payload, signature] = String(token || "").split(".");
    if (!payload || !signature) return null;
    const key = await importHmacKey(secret, ["verify"]);
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      fromBase64Url(signature),
      textBytes(payload)
    );
    if (!valid) return null;
    const data = JSON.parse(new TextDecoder().decode(fromBase64Url(payload)));
    if (!data.exp || data.exp <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}

function readCookie(request, name) {
  const raw = request.headers.get("Cookie") || "";
  for (const part of raw.split(";")) {
    const separator = part.indexOf("=");
    if (separator === -1) continue;
    const key = part.slice(0, separator).trim();
    if (key === name) return part.slice(separator + 1).trim();
  }
  return "";
}

function siteUrl(request, pathname) {
  return new URL(pathname, request.url).toString();
}

function redirect(request, pathname, extraHeaders = {}) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: siteUrl(request, pathname),
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

export async function onRequestGet({ request, env }) {
  const plans = configuredPlans(env);
  const pricesConfigured = plans.every((item) => item.priceId?.startsWith("price_"));

  if (!env.STRIPE_SECRET_KEY || !env.PRIA_ACCESS_SECRET || !pricesConfigured) {
    return new Response("ConfiguraÃ§Ã£o de pagamento incompleta.", { status: 503 });
  }

  const url = new URL(request.url);
  const sessionId = url.searchParams.get("session_id") || "";
  if (!sessionId.startsWith("cs_")) {
    return redirect(request, "/pria-planos.html?payment=invalid");
  }

  const stripeUrl = new URL(
    `https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`
  );
  stripeUrl.searchParams.append("expand[]", "line_items.data.price");

  const stripeResponse = await fetch(
    stripeUrl,
    {
      headers: { Authorization: `Bearer ${env.STRIPE_SECRET_KEY}` },
    }
  );

  if (!stripeResponse.ok) {
    return redirect(request, "/pria-planos.html?payment=invalid");
  }

  const session = await stripeResponse.json();
  if (session.payment_status !== "paid" || session.status !== "complete") {
    return redirect(request, "/pria-planos.html?payment=pending");
  }

  const priceIds = new Set(
    (session.line_items?.data || [])
      .map((item) => item.price?.id)
      .filter(Boolean)
  );
  const planConfig = plans.find((item) => priceIds.has(item.priceId));

  if (
    String(session.currency || "").toLowerCase() !== "eur" ||
    session.mode !== "payment" ||
    !planConfig ||
    Number(session.amount_total) !== planConfig.amount ||
    priceIds.size !== 1
  ) {
    return redirect(request, "/pria-planos.html?payment=invalid");
  }

  if (planConfig.plan === "upgrade") {
    const existingToken = readCookie(request, ACCESS_COOKIE);
    const existingAccess = await verifyAccessToken(existingToken, env.PRIA_ACCESS_SECRET);
    if (!existingAccess || existingAccess.plan !== "assessment") {
      return redirect(request, "/pria-planos.html?payment=upgrade-denied");
    }
  }

  const token = await createAccessToken(session.id, planConfig.plan, env.PRIA_ACCESS_SECRET);
  const cookie = [
    `${ACCESS_COOKIE}=${token}`,
    "Path=/",
    `Max-Age=${ACCESS_MAX_AGE}`,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");

  const destination = planConfig.plan === "upgrade"
    ? "/pria-guided.html"
    : planConfig.destination;

  return redirect(request, destination, { "Set-Cookie": cookie });
}
