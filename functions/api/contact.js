const CONTACT_API_URL = 'https://api.privuskuzola.pt/api/contact';

export async function onRequest(context) {
  const { request, env } = context;

  const responseHeaders = {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'no-referrer'
  };

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: responseHeaders
      }
    );
  }

  const requestUrl = new URL(request.url);
  const origin = request.headers.get('origin') || '';

  if (!origin || origin !== requestUrl.origin) {
    return new Response(
      JSON.stringify({ error: 'Origem não autorizada' }),
      { status: 403, headers: responseHeaders }
    );
  }

  const contentType = request.headers.get('content-type') || '';

  if (!contentType.toLowerCase().includes('application/json')) {
    return new Response(
      JSON.stringify({ error: 'Pedido inválido' }),
      {
        status: 415,
        headers: responseHeaders
      }
    );
  }

  const requestBody = await request.text();

  if (requestBody.length > 20000) {
    return new Response(
      JSON.stringify({ error: 'Pedido demasiado grande' }),
      {
        status: 413,
        headers: responseHeaders
      }
    );
  }

  if (!env.PRIA_API_SECRET) {
    return new Response(
      JSON.stringify({ error: 'Serviço temporariamente indisponível' }),
      {
        status: 503,
        headers: responseHeaders
      }
    );
  }

  try {
    const upstream = await fetch(CONTACT_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'X-Privus-Internal-Secret': env.PRIA_API_SECRET
      },
      body: requestBody
    });

    return new Response(upstream.body, {
      status: upstream.status,
      headers: {
        ...responseHeaders,
        'content-type': upstream.headers.get('content-type') || responseHeaders['content-type']
      }
    });
  } catch (error) {
    console.error('Contact API proxy failed:', error);

    return new Response(
      JSON.stringify({ error: 'Serviço temporariamente indisponível' }),
      {
        status: 502,
        headers: responseHeaders
      }
    );
  }
}
