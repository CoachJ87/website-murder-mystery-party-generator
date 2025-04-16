// src/services/aiService.ts

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log(`DEBUG: Starting getAIResponse with ${messages.length} messages`);
    console.log(`DEBUG: Prompt version: ${promptVersion}`);
    
    // Your Vercel deployed URL
    const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';
    
    // Prepare the request with messages and prompt version
    const requestBody = {
      messages: messages.map(msg => ({
        is_ai: msg.is_ai,
        content: msg.content
      })),
      promptVersion: promptVersion
    };
    
    console.log(`DEBUG: Prepared request body with ${requestBody.messages.length} messages`);
    console.log(`DEBUG: First message content: "${requestBody.messages[0]?.content.substring(0, 50)}..."`);
    
    // Make the API request
    console.log(`DEBUG: Calling API at ${apiUrl}`);
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    console.log(`DEBUG: Received API response with status ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DEBUG: API error: ${response.status} - ${errorText}`);
      throw new Error(`API returned status ${response.status}: ${errorText}`);
    }
    
    const data = await response.json();
    console.log(`DEBUG: Successfully parsed response JSON`);
    
    if (!data || data.error) {
      console.error(`DEBUG: Error in API response: ${data?.error}`);
      throw new Error(`API error: ${data?.error || "Unknown error"}`);
    }
    
    // Extract the response content
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      console.log(`DEBUG: Got valid text response of length ${data.content[0].text.length}`);
      return data.content[0].text;
    }
    
    console.error(`DEBUG: Invalid response format: ${JSON.stringify(data).substring(0, 100)}...`);
    throw new Error("Invalid response format from API");
  } catch (error) {
    console.error(`DEBUG: Error in getAIResponse: ${error.message}`);
    throw error; // Let the component handle the error
  }
};
