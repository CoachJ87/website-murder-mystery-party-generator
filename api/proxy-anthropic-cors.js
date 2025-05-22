
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle all HTTP methods
  const allowedMethods = ['GET', 'POST', 'OPTIONS', 'PUT', 'DELETE'];
  const method = req.method.toUpperCase();
  
  // Return proper CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Max-Age': '86400',
  };
  
  // For preflight requests
  if (method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers,
    });
  }
  
  // For actual requests
  if (allowedMethods.includes(method)) {
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
    });
  }
  
  // For unsupported methods
  return new Response(JSON.stringify({ error: 'Method not allowed' }), {
    status: 405,
    headers: {
      ...headers,
      'Content-Type': 'application/json',
    },
  });
}
