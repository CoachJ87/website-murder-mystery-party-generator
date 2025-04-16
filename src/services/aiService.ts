// src/services/aiService.ts

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log(`TESTING MODE: Bypassing actual API call, returning mock response`);
    
    // For testing, immediately return a mock response
    return generateMockResponse(messages, promptVersion);
    
    /* Original code commented out for testing
    console.log(`Calling proxy with ${promptVersion} prompt version`);
    
    // Set a timeout to avoid hanging if there's an issue
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), 15000)
    );
    
    // Your Vercel deployed URL
    const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';
    
    // Prepare the request with messages and prompt version
    const requestBody = {
      messages: messages.map(msg => ({
        role: msg.is_ai ? "assistant" : "user",
        content: msg.content
      })),
      promptVersion: promptVersion
    };
    
    const responsePromise = fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    }).then(response => response.json());
    
    // Race between the actual request and the timeout
    const data = await Promise.race([responsePromise, timeoutPromise]) as any;

    if (!data || data.error) {
      console.error("Error calling proxy function:", data?.error || "Unknown error");
      return generateMockResponse(messages, promptVersion);
    }

    // Extract the response content
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      return data.content[0].text;
    }

    console.error("Invalid response format from proxy function:", data);
    return generateMockResponse(messages, promptVersion);
    */
  } catch (error) {
    console.error("Error in getAIResponse:", error);
    return generateMockResponse(messages, promptVersion);
  }
};

// Generate mock responses when API is not available
const generateMockResponse = (messages: Message[], promptVersion: 'free' | 'paid'): string => {
  const lastUserMessage = messages.filter(m => !m.is_ai).pop()?.content || "";
  
  if (promptVersion === 'paid') {
    return `This is a test response for the PAID version. This confirms that your frontend code is working correctly. Your full mystery package would normally be generated here.`;
  } else {
    return `# "SHADOWS AT THE PREMIERE" - TEST MODE ACTIVE

This is a test response for the FREE version. This confirms that your frontend code is working correctly.

## VICTIM
**Marcus Reynolds** - This is just a test character.

## CHARACTER LIST (8 PLAYERS)
1. **Test Character 1** - This is just a test.
2. **Test Character 2** - This is just a test.

## MURDER METHOD
This is just a test description.

Would this test mode mystery concept work for your event? This indicates your frontend is working properly.`;
  }
};
