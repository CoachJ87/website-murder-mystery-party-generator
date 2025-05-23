
// Import required modules from Deno standard library and external packages
import "https://deno.land/x/xhr@0.1.0/mod.ts"; // Polyfill for XMLHttpRequest
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Anthropic } from 'npm:@anthropic-ai/sdk';

// Initialize the Anthropic client with the API key from environment variables
const anthropic = new Anthropic({
  apiKey: Deno.env.get('ANTHROPIC_API_KEY')!,
});

// Define CORS headers - making them more permissive to avoid CORS issues
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  'Access-Control-Allow-Headers': '*', // Allow all headers for debugging
  'Access-Control-Max-Age': '86400',
};

// Define the request handler function
serve(async (req) => {
  console.log("Processing request with mystery-ai edge function");
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 204, 
      headers: corsHeaders 
    });
  }

  try {
    // Parse the request body
    let requestBody;
    try {
      requestBody = await req.json();
      console.log("Successfully parsed request body");
      console.log("Request body:", JSON.stringify(requestBody, null, 2).substring(0, 500) + "...");
    } catch (jsonError) {
      console.error("Failed to parse request JSON:", jsonError);
      return new Response(
        JSON.stringify({ error: "Invalid JSON in request body" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Destructure the request body with defaults
    const {
      messages,
      system = null,
      promptVersion = 'free',
      requireFormatValidation = false,
      chunkSize = 1000,
      stream = false,
      testMode = false
    } = requestBody;

    console.log(`Processing request with ${messages?.length || 0} messages and prompt version: ${promptVersion}`);
    
    // Validate if messages exist and are in the correct format
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error("No messages provided or invalid format");
      return new Response(
        JSON.stringify({ error: "No messages provided or invalid format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prepare the system message
    let systemMessage;
    
    if (system) {
      console.log("Using provided system instruction");
      console.log(`System prompt length: ${system.length}`);
      console.log(`System prompt preview: ${system.substring(0, 100)}...`);
      systemMessage = system;
      
      // Make the "one question at a time" instruction unmistakable
      const oneQuestionInstruction = "🚨 CRITICAL INSTRUCTION: Ask ONLY ONE QUESTION at a time. Wait for the user's response before proceeding to the next step. NEVER EVER ask multiple questions in the same response. 🚨";
      
      // Ensure the player count is asked first with absolute clarity
      const playerCountInstruction = "🚨 REQUIRED FIRST QUESTION: Your VERY FIRST question must be 'How many players do you want for your murder mystery?' Ask NOTHING else until you get this answer. 🚨";
      
      // Check if the system message already has these instructions
      const hasOneQuestionInst = systemMessage.includes("ONE QUESTION at a time");
      const hasPlayerCountInst = systemMessage.includes("players") && systemMessage.includes("first question");
      
      // Add or reinforce instructions as needed
      let updatedSystem = systemMessage;
      
      if (!hasOneQuestionInst) {
        console.log("Adding missing one-question-at-a-time instruction to system prompt");
        updatedSystem = oneQuestionInstruction + "\n\n" + updatedSystem;
      } else if (!updatedSystem.startsWith("🚨")) {
        // If it has the instruction but not at the top, re-emphasize it at the top
        console.log("Moving one-question-at-a-time instruction to the top of system prompt");
        // Remove existing instruction and add it at the top
        updatedSystem = updatedSystem.replace(/🚨.*?ONE QUESTION at a time.*?🚨/gs, '');
        updatedSystem = oneQuestionInstruction + "\n\n" + updatedSystem;
      }
      
      if (!hasPlayerCountInst) {
        console.log("Adding player count instruction to system prompt");
        updatedSystem = updatedSystem + "\n\n" + playerCountInstruction;
      }
      
      // Add a final section with BOLD formatting and emojis for emphasis
      updatedSystem += "\n\n⚠️ FINAL INSTRUCTIONS ⚠️\n\n";
      updatedSystem += "1. Ask EXACTLY ONE question at a time\n";
      updatedSystem += "2. Your FIRST question MUST be about player count\n"; 
      updatedSystem += "3. Wait for user responses before continuing\n";
      updatedSystem += "4. NEVER provide multiple questions in one response\n";
      updatedSystem += "5. Once you have player count, ask ONE follow-up question about accomplices\n";
      updatedSystem += "6. After collecting basic info, generate the COMPLETE mystery in the specified format\n";
      
      systemMessage = updatedSystem;
    } else {
      // Try to get the free prompt from environment variables
      const freePrompt = Deno.env.get('MYSTERY_FREE_PROMPT');
      
      if (freePrompt) {
        console.log("Using MYSTERY_FREE_PROMPT from environment variables");
        console.log(`Free prompt length: ${freePrompt.length}`);
        console.log(`Free prompt preview: ${freePrompt.substring(0, 100)}...`);
        systemMessage = freePrompt;
      } else {
        // ENHANCED default system message with stronger directives
        console.log("Using fallback default prompt");
        systemMessage = `🚨 CRITICAL INSTRUCTION: Ask ONLY ONE QUESTION at a time. After each user response, address only that response before moving to the next question. NEVER batch multiple questions or proceed without user input. 🚨

🚨 REQUIRED FIRST QUESTION: Your VERY FIRST question must be 'How many players do you want for your murder mystery?' Ask NOTHING else until you get this answer. 🚨

You are a helpful mystery writer. 
Your job is to help the user create an exciting murder mystery game.

Follow these steps in strict order, asking only ONE question at a time:
1. Ask the user how many players they want for their mystery.
2. After they answer, ask if they want an accomplice.
3. Only after these details are provided should you start creating character descriptions and the mystery scenario.

⚠️ FINAL INSTRUCTIONS ⚠️
1. Ask EXACTLY ONE question at a time
2. Your FIRST question MUST be about player count
3. Wait for user responses before continuing
4. NEVER provide multiple questions in one response`;
      }
    }
    
    console.log("Complete system message:", systemMessage);

    // Clean and standardize messages for the API
    const standardizedMessages = messages.map(msg => {
      // Check if the message has is_ai flag or role
      if (msg.is_ai !== undefined) {
        return {
          role: msg.is_ai ? "assistant" : "user",
          content: msg.content || ''
        };
      } else {
        return {
          role: msg.role || 'user',
          content: msg.content || ''
        };
      }
    }).filter(msg => msg.content && msg.content.trim() !== '');

    // Enhanced logic to detect conversation state and prevent repeated questions
    const isFirstUserMessageCheck = messages.length === 1 && !("is_ai" in messages[0] && messages[0].is_ai === true) && 
      !("role" in messages[0] && messages[0].role === "assistant");
    
    // Check if user has already provided player count
    const userMessages = standardizedMessages.filter(msg => msg.role === "user");
    const aiMessages = standardizedMessages.filter(msg => msg.role === "assistant");
    
    const hasProvidedPlayerCount = userMessages.some(msg => {
      const content = msg.content.trim();
      return /^\d+$/.test(content) && parseInt(content) >= 2 && parseInt(content) <= 20;
    });
    
    const aiAlreadyAskedPlayerCount = aiMessages.some(msg => {
      const content = msg.content.toLowerCase();
      return content.includes('how many players') || content.includes('player count');
    });
    
    if (isFirstUserMessageCheck) {
      console.log("This appears to be the first message. Ensuring first response asks about player count.");
      systemMessage = `${systemMessage}\n\n🚨 THIS IS THE FIRST USER MESSAGE. YOU MUST RESPOND BY ASKING HOW MANY PLAYERS THEY WANT. DO NOT PROVIDE ANY MYSTERY DETAILS YET. 🚨`;
    } else if (hasProvidedPlayerCount && aiAlreadyAskedPlayerCount) {
      console.log("User has provided player count. AI should move to next question or generate mystery.");
      systemMessage = `${systemMessage}\n\n🚨 THE USER HAS ALREADY PROVIDED THE PLAYER COUNT. DO NOT ASK FOR PLAYER COUNT AGAIN. Move to the next logical step (ask about accomplices, or if you have enough info, generate the complete mystery). 🚨`;
    }

    // Prepare the model and max tokens based on the prompt version and test mode
    let model = "claude-3-opus-20240229";
    let maxTokens = testMode ? 1000 : 3000; // Increased max tokens
    
    // Log the model and max tokens
    console.log(`Using model: ${model} with max tokens: ${maxTokens}`);

    console.log("First standardized message:", JSON.stringify(standardizedMessages[0]));
    console.log("Total messages count:", standardizedMessages.length);

    // Make the API call to Anthropic with enhanced error handling
    try {
      console.log("Starting Anthropic API call");
      
      let options = {
        model: model,
        max_tokens: maxTokens,
        system: systemMessage,
        messages: standardizedMessages,
        temperature: 0.7
      };
      
      console.log("Calling Anthropic API with options:", JSON.stringify({
        model: options.model,
        max_tokens: options.max_tokens,
        system_length: options.system.length,
        messages_count: options.messages.length,
        temperature: options.temperature
      }));
      
      // Set a reasonable timeout for the API call
      const timeoutMs = 60000; // 60 seconds
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Anthropic API request timed out")), timeoutMs);
      });
      
      // Race between the API call and the timeout
      const response = await Promise.race([
        anthropic.messages.create(options),
        timeoutPromise
      ]) as any; // Type assertion needed due to race
      
      console.log("Received response from Anthropic API");
      console.log(`Response length: ${response.content[0].text.length} characters`);
      console.log(`Response preview: ${response.content[0].text.substring(0, 100)}...`);

      // Process the response to enforce correct flow and prevent repeated questions
      let responseText = response.content[0].text;
      
      // Check if AI is incorrectly asking for player count again
      const isAskingForPlayerCount = 
        responseText.toLowerCase().includes("how many players") || 
        responseText.toLowerCase().includes("player count") || 
        responseText.toLowerCase().includes("number of players");
      
      // Check if user already provided a numeric answer that should be player count
      const lastUserMessage = standardizedMessages[standardizedMessages.length - 1];
      const isNumericResponse = lastUserMessage && lastUserMessage.role === "user" && 
                               /^\d+$/.test(lastUserMessage.content.trim());
      
      // If AI is asking for player count but user already provided it, correct the response
      if (isAskingForPlayerCount && hasProvidedPlayerCount && standardizedMessages.length > 2) {
        console.log("Detected AI incorrectly asking for player count again - correcting response");
        
        const playerCount = userMessages.find(msg => /^\d+$/.test(msg.content.trim()))?.content.trim();
        
        responseText = `Perfect! I'll create a murder mystery for ${playerCount} players.

Would you like your mystery to include an accomplice who helps the murderer, or should there be just one culprit?`;
      }
      
      // If user just provided a number and we have enough info, generate the mystery
      if (isNumericResponse && hasProvidedPlayerCount && standardizedMessages.length >= 4) {
        console.log("User has provided enough info - should generate complete mystery");
        
        // Don't generate mystery here, let AI handle it naturally but guide it
        if (!responseText.includes("# ") && !responseText.includes("PREMISE") && !responseText.includes("VICTIM")) {
          responseText = responseText; // Keep the AI's response but ensure it moves forward
        }
      }
      
      // Check if the response has multiple questions and truncate appropriately
      const questionMarkCount = (responseText.match(/\?/g) || []).length;
      if (questionMarkCount >= 2) {
        console.log("Detected multiple questions in AI response - truncating to first question only");
        const firstQuestionEnd = responseText.indexOf('?') + 1;
        responseText = responseText.substring(0, firstQuestionEnd);
      }

      // Format the response as expected by the client
      const formattedResponse = {
        choices: [
          {
            message: {
              role: "assistant",
              content: responseText
            }
          }
        ]
      };

      // Return the response to the client
      return new Response(
        JSON.stringify(formattedResponse),
        { 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    } catch (apiError) {
      console.error(`Anthropic API error: ${apiError.message}`);
      console.error(`Error details: ${JSON.stringify(apiError)}`);
      
      // Create a detailed error response
      let errorDetail = {
        message: apiError.message,
        type: apiError.constructor.name,
        status: apiError.status || 'Unknown'
      };
      
      console.error("API Error details:", JSON.stringify(errorDetail));
      
      // Generate a simple fallback response for common errors
      if (apiError.message?.includes('timeout') || apiError.message?.includes('aborted')) {
        console.log("Generating simple fallback response due to timeout");
        
        // Create a simple fallback response
        const fallbackResponse = {
          choices: [
            {
              message: {
                role: "assistant",
                content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment, or try breaking your question into smaller parts."
              }
            }
          ]
        };
        
        return new Response(
          JSON.stringify(fallbackResponse),
          { 
            headers: { 
              ...corsHeaders, 
              'Content-Type': 'application/json' 
            } 
          }
        );
      }
      
      // More detailed error for Anthropic-specific issues
      return new Response(
        JSON.stringify({ 
          error: `Anthropic API error: ${apiError.message}`,
          details: errorDetail
        }),
        { 
          status: 502, 
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }
  } catch (error) {
    // Log and handle general errors with more detailed information
    console.error(`Error in mystery-ai edge function: ${error.message}`);
    console.error(`Error type: ${error.constructor.name}`);
    console.error(`Error stack: ${error.stack}`);
    
    // Return a generalized error response that includes helpful information
    return new Response(
      JSON.stringify({ 
        error: error.message, 
        type: error.constructor.name,
        suggestion: "This may be a temporary issue. Please try again with a simpler request or wait a moment."
      }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
