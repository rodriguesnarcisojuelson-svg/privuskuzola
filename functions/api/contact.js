const CONTACT_API_URL =
  'https://api.privuskuzola.pt/api/contact';

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

  if (!env.PRIA_API_SECRET) {
    return jsonResponse(
      { error: 'Serviço temporariamente indisponível.' },
      503
    );
  }

  const requestUrl = new URL(request.url);
  const siteOrigin = requestUrl.origin;
  const requestOrigin = request.headers.get('Origin') || '';

  if (requestOrigin && requestOrigin !== siteOrigin) {
    return jsonResponse(
      { error: 'Origem não autorizada.' },
      403
    );
  }

  const contentType =
    request.headers.get('Content-Type') || '';

  if (
    !contentType
      .toLowerCase()
      .includes('application/json')
  ) {
    return jsonResponse(
      { error: 'Pedido inválido.' },
      415
    );
  }

  const requestBody = await request.text();

  if (requestBody.length > 20000) {
    return jsonResponse(
      { error: 'Pedido demasiado grande.' },
      413
    );
  }

  try {
    const upstream = await fetch(CONTACT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Origin': siteOrigin,
        'X-Privus-Internal-Secret':
          env.PRIA_API_SECRET
      },
      body: requestBody
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        'Content-Type':
          upstream.headers.get('Content-Type') ||
          'application/json; charset=UTF-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error(
      'Contact API proxy failed:',
      error
    );

    return jsonResponse(
      {
        error:
          'Serviço temporariamente indisponível.'
      },
      502
    );
  }
}
