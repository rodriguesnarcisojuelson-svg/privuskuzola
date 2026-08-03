const ACCESS_COOKIE = "pria_access";

const PROTECTED_PATHS = {
  "/pria-engine-prototype": ["assessment", "guided", "upgrade"],
  "/pria-engine-prototype.html": ["assessment", "guided", "upgrade"],
  "/pria-guided": ["guided", "upgrade"],
  "/pria-guided.html": ["guided", "upgrade"],
};

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

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const pathname =
    url.pathname.length > 1
      ? url.pathname.replace(/\/+$/, "")
      : url.pathname;

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
