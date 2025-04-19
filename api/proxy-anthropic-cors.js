
export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // This endpoint specifically handles OPTIONS requests for CORS preflight
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key, x-client-info, apikey',
      'Access-Control-Max-Age': '86400',
    },
  });
}
