const PRIA_API = 'https://api.privuskuzola.pt/api/report';

export async function onRequest(context) {
  const request = context.request;

  if (request.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: {
        'Content-Type': 'text/plain; charset=UTF-8'
      }
    });
  }

  try {
    const body = await request.arrayBuffer();

    const response = await fetch(PRIA_API, {
      method: 'POST',
      headers: {
        'Content-Type':
          request.headers.get('Content-Type') || 'application/json'
      },
      body
    });

    const headers = new Headers();

    headers.set(
      'Content-Type',
      response.headers.get('Content-Type') ||
        'application/json; charset=UTF-8'
    );

    const disposition = response.headers.get('Content-Disposition');

    if (disposition) {
      headers.set('Content-Disposition', disposition);
    }

    return new Response(response.body, {
      status: response.status,
      headers
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Não foi possível contactar o serviço de relatórios PRIA.'
      }),
      {
        status: 502,
        headers: {
          'Content-Type': 'application/json; charset=UTF-8'
        }
      }
    );
  }
}
