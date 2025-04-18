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
    console.log(`DEBUG: Starting getAIResponse with ${messages.length} messages`);
    console.log(`DEBUG: Prompt version: ${promptVersion}`);
    console.log("DEBUG: Messages content:", JSON.stringify(messages.map(m => ({
      role: 'role' in m ? m.role : (m.is_ai ? 'assistant' : 'user'),
      content: m.content.substring(0, 50) + (m.content.length > 50 ? '...' : '')
    }), null, 2)); // Properly formatted JSON.stringify with null, 2

    // Add an instruction about Markdown formatting
    const enhancedMessages = [...messages];

    if (enhancedMessages.length > 0) {
      const lastMessage = enhancedMessages[enhancedMessages.length - 1];

      // Only add formatting instruction after user messages
      let isUserMessage = false;

      if ('role' in lastMessage && lastMessage.role === 'user') {
        isUserMessage = true;
      } else if ('is_ai' in lastMessage && lastMessage.is_ai === false) {
        isUserMessage = true;
      }

      if (isUserMessage) {
        console.log("DEBUG: Adding Markdown formatting instruction after user message");
        enhancedMessages.push({
          role: "user",
          content: "Please format your response using Markdown syntax with headings (##, ###), lists (-, 1., 2.), bold (**), italic (*), and other formatting as appropriate to structure the information clearly. Do not use a title at the beginning of your response unless you are presenting a complete murder mystery concept with a title, premise, victim details, and character list."
        });
      }
    }

    // Your Vercel deployed URL - ensure this is correct
    const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';
    console.log(`DEBUG: Using API URL: ${apiUrl}`);

    // Prepare the request - ensure messages are in the correct format
    const requestBody = {
      messages: enhancedMessages.map(msg => {
        // Determine the role based on available properties
        let role = "user"; // Default role

        if ('role' in msg && msg.role) {
          role = msg.role;
        } else if ('is_ai' in msg) {
          role = msg.is_ai ? "assistant" : "user";
        }

        return {
          role: role,
          content: msg.content
        };
      }),
      promptVersion: promptVersion
    };

    console.log(`DEBUG: Prepared request with ${requestBody.messages.length} messages`);
    console.log(`DEBUG: Calling API at ${apiUrl}`);
    console.log("DEBUG: Request Body:", JSON.stringify(requestBody, null, 2)); // More detailed logging

    // Make the API request with a longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log("DEBUG: Request timeout reached (60 seconds)");
      controller.abort();
    }, 60000); // 60 second timeout

    try {
      // Make the API request
      console.log("DEBUG: Initiating fetch request to API");
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);
      console.log(`DEBUG: API Response Status: ${response.status}`);
      console.log(`DEBUG: API Response Headers:`, Object.fromEntries(response.headers.entries()));

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`DEBUG: API Error: ${response.status} - ${errorText}`);
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("DEBUG: API Response Data:", JSON.stringify(data, null, 2));

      // **ADJUST THIS SECTION BASED ON YOUR ACTUAL ANTHROPIC RESPONSE STRUCTURE**
      let aiResponse = "";

      // **CHECK IF THE RESPONSE HAS 'choices' AND THE MESSAGE CONTENT IS HERE**
      if (data && data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
        console.log("DEBUG: Successfully extracted AI response content (Anthropic 'messages' format)");
        aiResponse = data.choices[0].message.content;
      }
      // **IF NOT, CHECK IF THE CONTENT IS DIRECTLY IN 'content' AS AN ARRAY OF TEXT OBJECTS (OLDER FORMAT)**
      else if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
        console.log("DEBUG: Successfully extracted (older format) AI response content");
        aiResponse = data.content[0].text;
      }
      // **ADD MORE 'else if' CHECKS HERE IF THE RESPONSE HAS A DIFFERENT STRUCTURE**
      else {
        console.error("DEBUG: Invalid API response format");
        console.error("DEBUG: Response Data:", JSON.stringify(data, null, 2));
        throw new Error("Invalid response format from API");
      }

      // Make sure headings are properly formatted
      aiResponse = aiResponse.replace(/^(VICTIM|SUSPECTS|CLUES|SOLUTION):/gm, "## $1:");
      
      console.log(`DEBUG: Returning formatted AI response (first 100 chars): ${aiResponse.substring(0, 100)}...`);
      return aiResponse;

    } catch (error) {
      console.error(`DEBUG: Fetch error in getAIResponse: ${error.message}`);
      console.error(`DEBUG: Error stack: ${error.stack}`);
      if (error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      throw error;
    }
  } catch (error) {
    console.error(`DEBUG: Error in getAIResponse: ${error.message}`);
    console.error(`DEBUG: Error stack: ${error.stack}`);
    if (error.message === 'Failed to fetch') {
      return `There was a network error while connecting to our AI service. Please check your internet connection and try again.`;
    }
    return `There was an error: ${error.message}. Please try again.`;
  }
};
