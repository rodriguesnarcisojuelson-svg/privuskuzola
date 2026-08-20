const PRIA_API = 'https://api.privuskuzola.pt/api/report';
const ACCESS_COOKIE = 'pria_access';
const ALLOWED_PLANS = ['assessment', 'guided', 'upgrade'];
const MAX_BODY_SIZE = 500000;

function textBytes(value) {
  return new TextEncoder().encode(value);
}

function fromBase64Url(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);

  return Uint8Array.from(
    binary,
    character => character.charCodeAt(0)
  );
}

function readCookie(request, name) {
  const cookies = request.headers.get('Cookie') || '';

  for (const part of cookies.split(';')) {
    const separator = part.indexOf('=');

    if (separator === -1) continue;

    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();

    if (key === name) return value;
  }

  return '';
}

async function verifyAccessToken(token, secret) {
  try {
    const [payload, signature] = String(token || '').split('.');

    if (!payload || !signature) return null;

    const key = await crypto.subtle.importKey(
      'raw',
      textBytes(secret),
      {
        name: 'HMAC',
        hash: 'SHA-256'
      },
      false,
      ['verify']
    );

    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      fromBase64Url(signature),
      textBytes(payload)
    );

    if (!valid) return null;

    const data = JSON.parse(
      new TextDecoder().decode(fromBase64Url(payload))
    );

    const now = Math.floor(Date.now() / 1000);

    if (!data.exp || data.exp <= now) return null;
    if (!data.sid || !String(data.sid).startsWith('cs_')) return null;
    if (!ALLOWED_PLANS.includes(data.plan)) return null;

    return data;
  } catch {
    return null;
  }
}

function jsonResponse(data, status) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'Cache-Control': 'no-store'
    }
  });
}

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return jsonResponse(
      { error: 'Method not allowed' },
      405
    );
  }

  const internalSecret = request.headers.get('X-Privus-Internal-Secret') || '';
  const hasInternalAccess =
    env.PRIA_API_SECRET &&
    internalSecret &&
    internalSecret === env.PRIA_API_SECRET;

  if (!hasInternalAccess) {
    if (!env.PRIA_ACCESS_SECRET) {
      return jsonResponse(
        { error: 'Serviço temporariamente indisponível.' },
        503
      );
    }

    const accessToken = readCookie(request, ACCESS_COOKIE);

    const access = await verifyAccessToken(
      accessToken,
      env.PRIA_ACCESS_SECRET
    );

    if (!access) {
      return jsonResponse(
        {
          error:
            'Acesso não autorizado. É necessário concluir o pagamento do PRIA.'
        },
        401
      );
    }
  }

  const contentType = request.headers.get('Content-Type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return jsonResponse(
      { error: 'Formato do pedido inválido.' },
      415
    );
  }

  const body = await request.arrayBuffer();

  if (body.byteLength > MAX_BODY_SIZE) {
    return jsonResponse(
      { error: 'Pedido demasiado grande.' },
      413
    );
  }

  try {
    const upstreamHeaders = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    if (env.PRIA_API_SECRET) {
      upstreamHeaders['X-Privus-Internal-Secret'] =
        env.PRIA_API_SECRET;
    }

    const response = await fetch(PRIA_API, {
      method: 'POST',
      headers: upstreamHeaders,
      body
    });

    const headers = new Headers();

    headers.set(
      'Content-Type',
      response.headers.get('Content-Type') ||
        'application/json; charset=UTF-8'
    );

    headers.set('Cache-Control', 'no-store');

    const disposition =
      response.headers.get('Content-Disposition');

    if (disposition) {
      headers.set('Content-Disposition', disposition);
    }

    return new Response(response.body, {
      status: response.status,
      headers
    });
  } catch (error) {
    console.error('PRIA report proxy failed:', error);

    return jsonResponse(
      {
        error:
          'Não foi possível contactar o serviço de relatórios PRIA.'
      },
      502
    );
  }
}
