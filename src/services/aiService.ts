
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
    
    // Add an instruction about Markdown formatting
    const enhancedMessages = [...messages];
    
    if (enhancedMessages.length > 0) {
      const lastMessage = enhancedMessages[enhancedMessages.length - 1];
      let isUserMessage = false;

      if ('role' in lastMessage && lastMessage.role === 'user') {
        isUserMessage = true;
      } else if ('is_ai' in lastMessage && lastMessage.is_ai === false) {
        isUserMessage = true;
      }

      if (isUserMessage) {
        console.log("DEBUG: Adding Markdown formatting instruction after user message");
        enhancedMessages.push({
          role: "system",
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
        }
        return msg;
      });

      // Log the formatted messages for debugging
      console.log("DEBUG: Sending these messages to Edge Function:", 
        edgeFunctionMessages.map((m, i) => ({
          index: i,
          role: m.role,
          contentPreview: m.content.substring(0, 30) + (m.content.length > 30 ? '...' : '')
        }))
      );

      const { data: functionData, error: functionError } = await supabase.functions.invoke('mystery-ai', {
        body: {
          messages: edgeFunctionMessages,
          promptVersion
        }
      });

      // Handle Edge Function response
      if (functionData) {
        // If the Edge Function indicates it's missing configuration, quietly fall back to Vercel API
        if (functionData.error && (
          functionData.error.includes("Configuration error") || 
          functionData.error.includes("Missing Anthropic API key")
        )) {
          console.log("DEBUG: Edge Function not configured, falling back to Vercel API");
          return await fallbackToVercelApi(enhancedMessages, promptVersion);
        }

        // For successful responses, return the content
        if (functionData.choices?.[0]?.message?.content) {
          return functionData.choices[0].message.content;
        }
      }

      // Handle explicit errors from the Edge Function
      if (functionError) {
        console.log("DEBUG: Edge Function error, falling back to Vercel API:", functionError);
        return await fallbackToVercelApi(enhancedMessages, promptVersion);
      }

      console.log("DEBUG: Invalid response format from Edge Function, falling back");
      return await fallbackToVercelApi(enhancedMessages, promptVersion);

    } catch (edgeFunctionError) {
      console.log("DEBUG: Edge Function exception, falling back to Vercel API:", edgeFunctionError);
      return await fallbackToVercelApi(enhancedMessages, promptVersion);
    }
  } catch (error) {
    console.error(`DEBUG: Error in getAIResponse: ${error.message}`);
    return `There was an error: ${error.message}. Please try again.`;
  }
};

const fallbackToVercelApi = async (messages: (ApiMessage | Message)[], promptVersion: 'free' | 'paid'): Promise<string> => {
  console.log("DEBUG: Using Vercel API fallback");
  const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';

  // Format messages for the Vercel API - ensuring we only send the last user message as input
  // This prevents the API from seeing the entire conversation history as a single input
  const formattedMessages = messages.map(msg => {
    let role = "user";
    if ('role' in msg && msg.role) {
      role = msg.role;
    } else if ('is_ai' in msg) {
      role = msg.is_ai ? "assistant" : "user";
    }
    return { role, content: msg.content };
  });

  // Log the formatted messages before sending to Vercel API
  console.log("DEBUG: Sending these messages to Vercel API:", 
    formattedMessages.map((m, i) => ({
      index: i,
      role: m.role,
      contentPreview: m.content.substring(0, 30) + (m.content.length > 30 ? '...' : '')
    }))
  );

  const requestBody = {
    messages: formattedMessages,
    promptVersion
  };

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`API returned status ${response.status}: ${errorText}`);
  }

  const data = await response.json();
  if (data?.choices?.[0]?.message?.content) {
    return data.choices[0].message.content;
  }

  throw new Error("Invalid response format from API");
};
