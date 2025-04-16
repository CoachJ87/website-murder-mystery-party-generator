export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  return new Response(JSON.stringify({ 
    success: true, 
    message: "API endpoint is working",
    time: new Date().toISOString(),
    env: process.env.ANTHROPIC_API_KEY ? "API key exists" : "No API key found"
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
