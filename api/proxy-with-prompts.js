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
        text: "# \"MYSTERY MANSION\" - A CLASSIC MURDER MYSTERY\n\n## PREMISE\nA group of strangers receive mysterious invitations to an isolated mansion on a stormy night. Their enigmatic host, Mr. Blackwood, has gathered them to reveal shocking secrets from their past. Before he can make his announcement, the lights go out, and Mr. Blackwood is found murdered in his study. With the bridge washed out and phone lines down, the guests are trapped with a killer among them.\n\n## VICTIM\n**Mr. Edward Blackwood** - A wealthy recluse with a reputation for collecting secrets and using them as leverage. Known for his ruthless business tactics and mysterious past, Blackwood had connections to each guest and was preparing to reveal damaging information about them all.\n\n## MURDER METHOD\nBlackwood was stabbed with an antique letter opener from his desk during a momentary blackout caused by the storm. The murder weapon was wiped clean of prints and placed back on the desk, but slight traces of blood remained on the killer's cuff. The study door was locked from the inside, creating an apparent impossible crime scene until a secret passage behind the bookcase was later discovered.\n\n## CHARACTER LIST (8 PLAYERS)\n1. **Dr. James/Judith Morgan** - Blackwood's personal physician with a gambling problem and mounting debts that threatened to end their medical career.\n2. **Professor William/Wilma Hayes** - A historian who once partnered with Blackwood on an archaeological expedition that ended in scandal.\n3. **Lady Elizabeth/Lord Edward Pembroke** - Aristocrat whose family fortune is dwindling and who was seeking a marriage of convenience with the wealthy Blackwood.\n4. **Detective Michael/Michelle Stone** - A private investigator hired by Blackwood to gather dirt on the other guests, now trying to solve the case.\n5. **Chef Antonio/Antonia Rossi** - Blackwood's personal chef who previously worked for a rival who died under mysterious circumstances.\n6. **Ms. Rebecca/Mr. Robert Walsh** - Blackwood's secretary who knows all his secrets and was secretly altering his will.\n7. **Colonel Henry/Henrietta Fleming** - A retired military officer with a shared history with Blackwood from their days in foreign intelligence.\n8. **Miss Olivia/Mr. Oliver Grant** - Blackwood's estranged relative and heir who arrived unexpectedly just before the murder.\n\nWould this murder mystery concept work for your event? You can continue to make edits, and once you're satisfied, press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!"
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
