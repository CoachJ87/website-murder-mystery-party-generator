export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  return new Response(JSON.stringify({ 
    success: true, 
    message: "Test API endpoint is working",
    timestamp: new Date().toISOString(),
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
