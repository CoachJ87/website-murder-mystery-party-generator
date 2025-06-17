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
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  try {
    console.log('Generation complete callback received');
    
    const payload = await req.json();
    console.log('Callback payload:', JSON.stringify(payload, null, 2));

    const { conversationId, data } = payload;

    if (!conversationId) {
      console.error('Missing conversationId in callback payload');
      return new Response(JSON.stringify({ error: 'Missing conversationId' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    // Dynamic import of Supabase client
    const { createClient } = await import('@supabase/supabase-js');
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log(`Updating mystery package for conversation: ${conversationId}`);

    // Update the mystery package with completed status and data
    const { error: updateError } = await supabase
      .from('mystery_packages')
      .update({
        title: data?.title || null,
        game_overview: data?.gameOverview || null,
        host_guide: data?.hostGuide || null,
        materials: data?.materials || null,
        preparation_instructions: data?.preparation || null,
        timeline: data?.timeline || null,
        hosting_tips: data?.hostingTips || null,
        evidence_cards: data?.evidenceCards ? JSON.stringify(data.evidenceCards) : null,
        relationship_matrix: data?.relationshipMatrix ? JSON.stringify(data.relationshipMatrix) : null,
        detective_script: data?.detectiveScript || null,
        generation_status: {
          status: 'completed',
          progress: 100,
          currentStep: 'Package generation completed successfully'
        },
        generation_completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('conversation_id', conversationId);

    if (updateError) {
      console.error('Error updating mystery package:', updateError);
      return new Response(JSON.stringify({ error: 'Database update failed' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    console.log('Mystery package updated successfully');

    // Update conversation status
    const { error: conversationError } = await supabase
      .from('conversations')
      .update({
        needs_package_generation: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', conversationId);

    if (conversationError) {
      console.error('Error updating conversation:', conversationError);
      // Don't fail the entire request for this
    }

    console.log(`Successfully completed callback processing for conversation: ${conversationId}`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });

  } catch (error) {
    console.error('Error in generation-complete callback:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
}
