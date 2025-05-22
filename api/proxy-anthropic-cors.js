
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  try {
    // Get request body
    let body;
    try {
      body = await req.json();
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Forward request to Supabase Edge Function
    const { url, method = 'POST', headers = {}, data } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400, 
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Create safe headers
    const forwardHeaders = new Headers();
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() !== 'host') {
        forwardHeaders.append(key, value);
      }
    }
    
    // Call the target URL
    const response = await fetch(url, {
      method,
      headers: forwardHeaders,
      body: data ? JSON.stringify(data) : undefined,
    });

    // Forward response
    const responseBody = await response.text();
    let parsedBody;
    
    try {
      parsedBody = JSON.parse(responseBody);
    } catch (e) {
      // Return as text if not valid JSON
      return new Response(responseBody, {
        status: response.status,
        headers: {
          'Content-Type': 'text/plain',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(JSON.stringify(parsedBody), {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ 
      error: error.message,
      trace: error.stack 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
