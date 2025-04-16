// src/services/aiService.ts

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log(`Using test endpoint instead of regular proxy`);
    
    // Use the direct test endpoint
    const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/direct-test';
    
    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ test: true })
    });
    
    console.log(`Test API response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Test API error: ${response.status} - ${errorText}`);
      throw new Error(`API returned status ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`Successfully parsed test response JSON`);
    
    // Extract the response content
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      console.log(`Got valid test text response`);
      return data.content[0].text;
    }
    
    console.error(`Invalid test response format`);
    throw new Error("Invalid response format from test API");
  } catch (error) {
    console.error(`Error in getAIResponse: ${error.message}`);
    return `# "ERROR OCCURRED" - A MURDER MYSTERY\n\nThere was an error: ${error.message}`;
  }
};
