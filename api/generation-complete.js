
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
      const payload = await req.json();
      console.log('🔍 [DEBUG] Generation complete webhook received:', payload);
      
      const { status, conversation_id, package_id, timestamp, structured_data } = payload;
      
      if (!conversation_id) {
        console.error('❌ [DEBUG] Missing conversation_id in webhook payload');
        return new Response(JSON.stringify({ 
          error: 'Missing conversation_id' 
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      console.log(`✅ [DEBUG] Generation complete for conversation: ${conversation_id} with status: ${status}`);
      
      // If structured data is provided, save it immediately
      if (structured_data && typeof structured_data === 'object') {
        console.log('🔧 [DEBUG] Structured data provided, attempting to save...');
        
        try {
          // Import the save function dynamically
          const { saveStructuredPackageData } = await import('../src/services/mysteryPackageService.ts');
          
          await saveStructuredPackageData(conversation_id, structured_data);
          console.log('✅ [DEBUG] Structured data saved successfully via webhook');
        } catch (saveError) {
          console.error('❌ [DEBUG] Error saving structured data via webhook:', saveError);
          // Continue execution even if save fails, the frontend can retry
        }
      }
      
      // Here you could add logic to trigger real-time updates
      // For now, just acknowledge receipt
      
      return new Response(JSON.stringify({ 
        received: true, 
        conversation_id,
        status: 'acknowledged',
        structured_data_processed: !!structured_data
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      console.error('❌ [DEBUG] Generation complete webhook error:', error);
      return new Response(JSON.stringify({ 
        error: 'Invalid payload',
        details: error.message 
      }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  return new Response('Method not allowed', { status: 405 });
}
