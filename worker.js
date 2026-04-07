/**
 * Cloudflare Worker — ZoHo Token Proxy
 * 
 * This tiny script runs on Cloudflare's free tier.
 * It receives a token refresh request from the Outlook add-in
 * and forwards it to ZoHo's OAuth endpoint, adding the CORS
 * headers that ZoHo's endpoint doesn't send natively.
 *
 * Setup instructions are in README.md
 */

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {

  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: corsHeaders(),
    });
  }

  if (request.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: corsHeaders() });
  }

  const { clientId, clientSecret, refreshToken } = body;

  if (!clientId || !clientSecret || !refreshToken) {
    return new Response('Missing credentials', { status: 400, headers: corsHeaders() });
  }

  // Call ZoHo token endpoint
  const params = new URLSearchParams({
    grant_type:    'refresh_token',
    client_id:     clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });

  const zohoRes = await fetch('https://accounts.zoho.com/oauth/v2/token', {
    method:  'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:    params.toString(),
  });

  const data = await zohoRes.json();

  return new Response(JSON.stringify(data), {
    status:  zohoRes.status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(),
    },
  });
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':  '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}
