const CONTACT_API_yURL = 'https://api.privuskuzola.pt/api/contact';

export async function onRequest(context) {
  const { request, env } = context;

  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      {
        status: 405,
        headers: {
          'content-type': 'application/json; charset=utf-8'
        }
      }
    );
  }

  const contentType =
    request.headers.get('content-type') || '';

  if (
    !contentType
      .toLowerCase()
      .includes('application/json')
  ) {
    return new Response(
      JSON.stringify({
        error: 'Pedido inválido'
      }),
      {
        status: 415,
        headers: {
          'content-type': 'application/json; charset=utf-8'
        }
      }
    );
  }

  const requestBody =
    await request.text();

  if (requestBody.length > 20000) {
    return new Response(
      JSON.stringify({
        error: 'Pedido demasiado grande'
      }),
      {
        status: 413,
        headers: {
          'content-type': 'application/json; charset=utf-8'
        }
      }
    );
  }

  if (!env.PRIA_API_SECRET) {
    return new Response(
      JSON.stringify({
        error: 'Serviço temporariamente indisponível'
      }),
      {
        status: 503,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        }
      }
    );
  }

  try {
    const upstream =
      await fetch(CONTACT_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'accept': 'application/json',
          'X-Privus-Internal-Secret':
            env.PRIA_API_SECRET
        },
        body: requestBody
      });

    return new Response(
      upstream.body,
      {
        status: upstream.status,
        headers: {
          'content-type':
            upstream.headers.get('content-type') ||
            'application/json; charset=utf-8',
          'cache-control': 'no-store'
        }
      }
    );
  } catch (error) {
    console.error(
      'Contact API proxy failed:',
      error
    );

    return new Response(
      JSON.stringify({
        error: 'Serviço temporariamente indisponível'
      }),
      {
        status: 502,
        headers: {
          'content-type': 'application/json; charset=utf-8',
          'cache-control': 'no-store'
        }
      }
    );
  }
}
