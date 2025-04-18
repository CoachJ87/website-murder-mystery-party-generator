
// src/services/aiService.ts

// Interface for messages sent to the API
interface ApiMessage {
  role: string;
  content: string;
}

// Local Message interface for compatibility
interface Message {
  is_ai?: boolean;
  content: string;
  role?: string;
}

export const getAIResponse = async (messages: ApiMessage[] | Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log(`Starting getAIResponse with ${messages.length} messages`);
    console.log(`Prompt version: ${promptVersion}`);

    // Add an instruction about Markdown formatting
    const enhancedMessages = [...messages];
    const lastMessage = enhancedMessages[enhancedMessages.length - 1];
    
    // Check if the last message is from the user (not AI)
    if (lastMessage) {
      // Safely check whether it's a user message based on available properties
      const isUserMessage = 
        ('role' in lastMessage && lastMessage.role === 'user') || 
        ('is_ai' in lastMessage && lastMessage.is_ai === false);
      
      if (isUserMessage) {
        enhancedMessages.push({
          role: "user",
          content: "Please format your response using Markdown syntax with headings (##, ###), lists (-, 1., 2.), bold (**), italic (*), and other formatting as appropriate to structure the information clearly. Do not use a title at the beginning of your response unless you are presenting a complete murder mystery concept with a title, premise, victim details, and character list."
        });
      }
    }

    // Your Vercel deployed URL - ensure this is correct
    const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';

    // Prepare the request - ensure messages are in the correct format
    const requestBody = {
        messages: enhancedMessages.map(msg => ({
          role: 'role' in msg ? msg.role : ('is_ai' in msg ? (msg.is_ai ? "assistant" : "user") : "user"),
          content: msg.content
        })),
      promptVersion: promptVersion
    };

    console.log(`Prepared request with ${requestBody.messages.length} messages`);
    console.log(`Calling API at ${apiUrl}`);
    console.log("Request Body:", JSON.stringify(requestBody)); // Log the request body

    // Make the API request with a longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    try {
      // Make the API request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
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
      } else {
        console.error("Invalid API response format");
        console.error("Response Data:", JSON.stringify(data));
        throw new Error("Invalid response format from API");
      }
      
      // Make sure headings are properly formatted
      aiResponse = aiResponse.replace(/^(VICTIM|SUSPECTS|CLUES|SOLUTION):/gm, "## $1:");
      
      return aiResponse;
    } catch (error) {
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }
  } catch (error) {
    console.error(`Error in getAIResponse: ${error.message}`);
    if (error.message === 'Failed to fetch') {
      return `There was a network error while connecting to our AI service. Please check your internet connection and try again.`;
    }
    return `There was an error: ${error.message}. Please try again.`;
  }
};
