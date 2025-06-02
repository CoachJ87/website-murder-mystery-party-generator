export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method === 'POST') {
    try {
      const { status, conversation_id, package_id, timestamp } = await req.json();
      
      console.log(`Generation complete webhook received: ${conversation_id} - ${status}`);
      
      // Here you could add logic to trigger real-time updates
      // For now, just acknowledge receipt
      
      return new Response(JSON.stringify({ 
        received: true, 
        conversation_id,
        status: 'acknowledged' 
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('Generation complete webhook error:', error);
      return new Response(JSON.stringify({ error: 'Invalid payload' }), { 
        status: 400 
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
