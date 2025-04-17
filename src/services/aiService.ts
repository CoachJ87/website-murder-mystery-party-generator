
// src/services/aiService.ts

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log(`Starting getAIResponse with ${messages.length} messages`);
    console.log(`Prompt version: ${promptVersion}`);

    // Add an instruction about Markdown formatting
    const enhancedMessages = [...messages];
    if (enhancedMessages.length > 0 && enhancedMessages[enhancedMessages.length - 1].is_ai === false) {
      enhancedMessages.push({
        is_ai: false,
        content: "Please format your response using Markdown syntax with headings (##, ###), lists (-, 1., 2.), bold (**), italic (*), and other formatting as appropriate to structure the information clearly."
      });
    }

    // Your Vercel deployed URL - ensure this is correct
    const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';

    // Prepare the request
    const requestBody = {
        messages: enhancedMessages.map(msg => ({
          role: msg.is_ai ? "assistant" : "user",
          content: msg.content
        })),
      promptVersion: promptVersion
    };

    console.log(`Prepared request with ${requestBody.messages.length} messages`);
    console.log(`Calling API at ${apiUrl}`);
    console.log("Request Body:", JSON.stringify(requestBody)); // Log the request body

    // Make the API request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      // Added timeout to prevent hanging requests
      signal: AbortSignal.timeout(20000) // 20 second timeout - increased from 15 seconds
    });

    console.log(`API Response Status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`API Error: ${response.status} - ${errorText}`);
      throw new Error(`API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log("API Response Data:", JSON.stringify(data));

    // Extract the response content
    let aiResponse = "";
    
    if (data && data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      console.log("Successfully extracted AI response content");
      aiResponse = data.choices[0].message.content;
    } else if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
        // Fallback for older Claude API response structure
        console.log("Successfully extracted (older format) AI response content");
        aiResponse = data.content[0].text;
    } else if (data && typeof data === 'string' && data.trim().length > 0) {
        // Handle case where the API returns just a string
        console.log("API returned a direct string response");
        aiResponse = data;
    } else if (data && data.message && typeof data.message === 'string') {
        // Handle case where response is in a message property
        console.log("API returned response in message property");
        aiResponse = data.message;
    } else {
      console.error("Invalid API response format");
      console.error("Response Data:", JSON.stringify(data));
      
      // Fallback response when API format is unexpected
      return "# Sorry, I'm having trouble right now\n\nI wasn't able to generate a proper response. This could be due to connectivity issues or the server being temporarily unavailable. Here are some things you could try:\n\n1. Send your message again\n2. Refresh the page and try again\n3. Try a different browser or device\n\nIf the problem persists, please let us know through the contact form.";
    }
    
    // Make sure headings are properly formatted
    aiResponse = aiResponse.replace(/^(VICTIM|SUSPECTS|CLUES|SOLUTION):/gm, "## $1:");
    
    return aiResponse;

  } catch (error) {
    console.error(`Error in getAIResponse: ${error.message}`);
    return `# Unable to Connect\n\nI'm currently having trouble connecting to my knowledge base. This might be due to:\n\n- Network connectivity issues\n- High server load\n- Temporary service disruption\n\nPlease try again in a moment, or refresh the page if the problem persists.`;
  }
};
