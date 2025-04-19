
import { supabase } from "@/lib/supabase";

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
    })), null, 2));

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

    // First try using the Supabase Edge Function
    try {
      console.log("DEBUG: Attempting to use mystery-ai Edge Function");
      
      // Convert messages to the format expected by the Edge Function
      const edgeFunctionMessages = enhancedMessages.map(msg => {
        if ('is_ai' in msg) {
          return {
            role: msg.is_ai ? "assistant" : "user",
            content: msg.content
          };
        } else {
          // Already in the correct format
          return msg;
        }
      });
      
      // Invoke the function with just the required data, no custom headers
      const { data: functionData, error: functionError } = await supabase.functions.invoke('mystery-ai', {
        body: {
          messages: edgeFunctionMessages,
          promptVersion
        }
      });

      console.log("DEBUG: Edge Function response received:", functionData);
      
      if (functionError) {
        console.error("DEBUG: Error from Edge Function:", functionError);
        throw new Error(`Edge Function error: ${functionError.message}`);
      }

      if (functionData && functionData.choices && functionData.choices[0] && functionData.choices[0].message) {
        console.log("DEBUG: Successfully extracted content from Edge Function response");
        return functionData.choices[0].message.content;
      } else {
        console.error("DEBUG: Invalid response format from Edge Function:", functionData);
        throw new Error("Invalid response format from Edge Function");
      }
    } catch (edgeFunctionError) {
      console.error("DEBUG: Error calling Edge Function:", edgeFunctionError);
      
      // Fallback to Vercel API if Edge Function fails
      console.log("DEBUG: Falling back to Vercel API proxy");
      
      // Your Vercel deployed URL - ensure this is the correct absolute URL
      const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';
      console.log(`DEBUG: Using API URL: ${apiUrl}`);

      // Prepare the request
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

      console.log("DEBUG: Calling Vercel API with request body:", JSON.stringify({
        messageCount: requestBody.messages.length,
        promptVersion: requestBody.promptVersion,
        firstMessagePreview: requestBody.messages[0]?.content.substring(0, 30) + '...' || 'empty'
      }));

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`DEBUG: API Error: ${response.status} - ${errorText}`);
        throw new Error(`API returned status ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log("DEBUG: Vercel API Response structure:", Object.keys(data).join(', '));

      if (data && data.choices && data.choices.length > 0 && data.choices[0].message) {
        console.log("DEBUG: Successfully extracted content from Vercel API response");
        return data.choices[0].message.content;
      } else {
        console.error("DEBUG: Invalid API response format from Vercel:", data);
        throw new Error("Invalid response format from API");
      }
    }
  } catch (error) {
    console.error(`DEBUG: Error in getAIResponse: ${error.message}`);
    console.error(`DEBUG: Error stack: ${error.stack}`);
    return `There was an error: ${error.message}. Please try again.`;
  }
};
