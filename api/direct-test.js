export const config = {
  runtime: 'edge',
};

export default async function handler(req) {
  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Create a mock Claude API response
  const mockResponse = {
    id: "msg_mock",
    type: "message",
    role: "assistant",
    content: [
      {
        type: "text",
        text: "# \"TEST RESPONSE\" - A MURDER MYSTERY\n\n## PREMISE\nThis is a test response to verify the API endpoint is working correctly.\n\n## VICTIM\n**John Doe** - A test victim.\n\n## MURDER METHOD\nTest murder method description.\n\n## CHARACTER LIST (5 PLAYERS)\n1. **Character 1** - Description\n2. **Character 2** - Description\n3. **Character 3** - Description\n4. **Character 4** - Description\n5. **Character 5** - Description\n\nWould this murder mystery concept work for your event? You can continue to make edits, and once you're satisfied, press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!"
      }
    ],
    model: "claude-3-7-sonnet-20250219",
    stop_reason: "end_turn",
    usage: {
      input_tokens: 10,
      output_tokens: 200
    }
  };

  // Return the mock response with proper CORS headers
  return new Response(JSON.stringify(mockResponse), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-api-key',
    },
  });
}
