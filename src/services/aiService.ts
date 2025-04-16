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

    // Your Vercel deployed URL - ensure this is correct
    const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';

    // Prepare the request
    const requestBody = {
      messages: messages.map(msg => ({
        is_ai: msg.is_ai,
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
      body: JSON.stringify(requestBody)
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
    if (data && data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      console.log("Successfully extracted AI response content");
      return data.choices[0].message.content;
    } else if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
        // Fallback for older Claude API response structure
        console.log("Successfully extracted (older format) AI response content");
        return data.content[0].text;
    } else {
      console.error("Invalid API response format");
      console.error("Response Data:", JSON.stringify(data));
      throw new Error("Invalid response format from API");
    }

  } catch (error) {
    console.error(`Error in getAIResponse: ${error.message}`);
    return `# "ERROR OCCURRED" - A MURDER MYSTERY\n\nThere was an error: ${error.message}`;
  }
};
