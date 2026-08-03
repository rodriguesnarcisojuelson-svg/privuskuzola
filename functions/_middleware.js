const ACCESS_COOKIE = "pria_access";
const ACCESS_MAX_AGE = 30 * 24 * 60 * 60;

const PLANS_BY_AMOUNT = {
  25000: {
    plan: "assessment",
    destination: "/pria-engine-prototype",
  },

  35000: {
    plan: "guided",
    destination: "/pria-guided.html",
  },

  10000: {
    plan: "upgrade",
    destination: "/pria-guided.html",
  },
};

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function toBase64Url(bytes) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64Url(value) {
  const base64 = value
    .replace(/-/g, "+")
    .replace(/_/g, "/");

  const padded =
    base64 +
    "=".repeat((4 - (base64.length % 4)) % 4);

  const binary = atob(padded);

  return Uint8Array.from(
    binary,
    (character) => character.charCodeAt(0)
  );
}

async function importHmacKey(secret, usage) {
  return crypto.subtle.importKey(
    "raw",
    textBytes(secret),
    {
      name: "HMAC",
      hash: "SHA-256",
    },
    false,
    usage
  );
}

async function createAccessToken(
  sessionId,
  plan,
  secret
) {
  const payloadObject = {
    sid: sessionId,
    plan,
    exp:
      Math.floor(Date.now() / 1000) +
      ACCESS_MAX_AGE,
  };

  const payload = toBase64Url(
    textBytes(JSON.stringify(payloadObject))
  );

  const key = await importHmacKey(
    secret,
    ["sign"]
  );

  const signature =
    await crypto.subtle.sign(
      "HMAC",
      key,
      textBytes(payload)
    );

  return (
    payload +
    "." +
    toBase64Url(
      new Uint8Array(signature)
    )
  );
}

async function verifyAccessToken(
  token,
  secret
) {
  try {
    const parts = String(token || "").split(".");
    const payload = parts[0];
    const signature = parts[1];

    if (!payload || !signature) {
      return null;
    }

    const key = await importHmacKey(
      secret,
      ["verify"]
    );

    const valid =
      await crypto.subtle.verify(
        "HMAC",
        key,
        fromBase64Url(signature),
        textBytes(payload)
      );

    if (!valid) {
      return null;
    }

    const decoded =
      new TextDecoder().decode(
        fromBase64Url(payload)
      );

    const data = JSON.parse(decoded);

    if (
      !data.exp ||
      data.exp <=
        Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return data;
  } catch (error) {
    return null;
  }
}

function readCookie(request, name) {
  const raw =
    request.headers.get("Cookie") || "";

  const cookies = raw.split(";");

  for (const cookie of cookies) {
    const separator = cookie.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key =
      cookie
        .slice(0, separator)
        .trim();

    if (key === name) {
      return cookie
        .slice(separator + 1)
        .trim();
    }
  }

  return "";
}

function siteUrl(request, pathname) {
  return new URL(
    pathname,
    request.url
  ).toString();
}

function redirect(
  request,
  pathname,
  extraHeaders = {}
) {
  return new Response(null, {
    status: 302,

    headers: {
      Location: siteUrl(
        request,
        pathname
      ),

      "Cache-Control": "no-store",

      ...extraHeaders,
    },
  });
}

export async function onRequestGet({
  request,
  env,
}) {
  if (
    !env.STRIPE_SECRET_KEY ||
    !env.PRIA_ACCESS_SECRET
  ) {
    return new Response(
      "Configuração de pagamento incompleta.",
      {
        status: 503,
      }
    );
  }

  const url = new URL(request.url);

  const sessionId =
    url.searchParams.get("session_id") || "";

  if (!sessionId.startsWith("cs_")) {
    return redirect(
      request,
      "/pria-planos.html?payment=invalid"
    );
  }

  const stripeResponse = await fetch(
    "https://api.stripe.com/v1/checkout/sessions/" +
      encodeURIComponent(sessionId),

    {
      headers: {
        Authorization:
          "Bearer " +
          env.STRIPE_SECRET_KEY,
      },
    }
  );

  if (!stripeResponse.ok) {
    return redirect(
      request,
      "/pria-planos.html?payment=invalid"
    );
  }

  const session =
    await stripeResponse.json();

  if (session.payment_status !== "paid") {
    return redirect(
      request,
      "/pria-planos.html?payment=pending"
    );
  }

  const amount =
    Number(session.amount_total);

  const planConfig =
    PLANS_BY_AMOUNT[amount];

  const currency =
    String(session.currency || "")
      .toLowerCase();

  if (
    currency !== "eur" ||
    !planConfig
  ) {
    return redirect(
      request,
      "/pria-planos.html?payment=invalid"
    );
  }

  if (planConfig.plan === "upgrade") {
    const existingToken =
      readCookie(
        request,
        ACCESS_COOKIE
      );

    const existingAccess =
      await verifyAccessToken(
        existingToken,
        env.PRIA_ACCESS_SECRET
      );

    if (
      !existingAccess ||
      existingAccess.plan !== "assessment"
    ) {
      return redirect(
        request,
        "/pria-planos.html?payment=upgrade-denied"
      );
    }
  }

  const token =
    await createAccessToken(
      session.id,
      planConfig.plan,
      env.PRIA_ACCESS_SECRET
    );

  const cookie = [
    ACCESS_COOKIE + "=" + token,
    "Path=/",
    "Max-Age=" + ACCESS_MAX_AGE,
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
  ].join("; ");

  return redirect(
    request,
    planConfig.destination,
    {
      "Set-Cookie": cookie,
    }
  );
}
