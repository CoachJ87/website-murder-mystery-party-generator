// src/services/aiService.ts
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

// New interface for mystery preferences
export interface MysteryPreferences {
  theme: string;
  playerCount: number;
  isPaid?: boolean;
  hasAccomplice?: boolean;
  scriptType?: "full" | "pointForm";
  additionalDetails?: string;
}

// Add interfaces for chunked generation
export interface GenerationStep {
  status: 'pending' | 'processing' | 'completed' | 'error';
  data?: any;
  error?: string;
}

export interface GenerationProgress {
  mysteryId: string;
  title?: string;
  premise?: string;
  victim?: string;
  characters?: any[];
  murderMethod?: string;
  clues?: any[];
  secrets?: any[];
  evidence?: any[];
  fullPackage?: string;
  completedSteps: number;
  totalSteps: number;
  currentStep: string;
  error?: string;
}

// Function to generate full mystery in chunks
export const generateFullMysteryInChunks = async (
  preferences: MysteryPreferences,
  progressCallback: (progress: GenerationProgress) => void
): Promise<string> => {
  // Create a unique ID for this generation
  const mysteryId = `mystery_${Date.now()}`;
  
  // Initialize progress
  const progress: GenerationProgress = {
    mysteryId,
    completedSteps: 0,
    totalSteps: 6,
    currentStep: "Generating basic mystery structure..."
  };
  
  try {
    // Step 1: Generate basic mystery structure (title, premise, victim)
    progressCallback({...progress, completedSteps: 1, currentStep: "Creating murder scenario..."});
    const basicStructure = await getAIResponse(
      [{
        role: "user",
        content: `Create a basic structure for a murder mystery with a ${preferences.theme} theme for ${preferences.playerCount} players. 
        Return a JSON object with these fields:
        1. title: A creative title for the mystery
        2. premise: A brief 2-paragraph premise setting the scene
        3. victim: Details about the murder victim including name, occupation, and why they were killed`
      }],
      'paid',
      "Generate only valid JSON with the requested fields. Do not include any explanations or commentary outside the JSON object.",
      1000
    );
    
    // Extract JSON from response
    let structureData;
    try {
      structureData = extractJsonFromResponse(basicStructure);
      progress.title = structureData.title;
      progress.premise = structureData.premise;
      progress.victim = structureData.victim;
    } catch (error) {
      console.error("Failed to parse JSON for basic structure, using fallback:", error);
      // Create fallback data
      structureData = {
        title: `${preferences.theme} Murder Mystery`,
        premise: `A thrilling murder mystery set in a ${preferences.theme} setting. The guests were enjoying themselves until tragedy struck.`,
        victim: `The victim was found dead under mysterious circumstances. Everyone present is a suspect.`
      };
      progress.title = structureData.title;
      progress.premise = structureData.premise;
      progress.victim = structureData.victim;
    }
    
    // Step 2: Generate characters
    progressCallback({...progress, completedSteps: 2, currentStep: "Creating characters..."});
    const charactersResponse = await getAIResponse(
      [{
        role: "user",
        content: `For the murder mystery titled "${structureData.title}" with a ${preferences.theme} theme, 
        create ${preferences.playerCount} distinct characters including the murderer${preferences.hasAccomplice ? ' and an accomplice' : ''}.
        
        For context, here's information about the premise and victim:
        Premise: ${structureData.premise}
        Victim: ${structureData.victim}
        
        Return the characters as a JSON array where each character has:
        1. name: Character name (provide gender-neutral options)
        2. occupation: Their role or job
        3. appearance: Brief physical description
        4. personality: Key personality traits
        5. connection: How they knew the victim
        6. motive: Why they might have wanted the victim dead
        7. alibi: Their claimed whereabouts during the murder
        8. isMurderer: true only for the actual murderer${preferences.hasAccomplice ? '\n9. isAccomplice: true only for the accomplice' : ''}`
      }],
      'paid',
      "Generate only valid JSON with the requested fields. Make character descriptions concise but interesting.",
      2000
    );
    
    // Extract JSON from response
    const charactersData = extractJsonFromResponse(charactersResponse);
    progress.characters = charactersData;
    
    // Step 3: Generate clues and evidence
    progressCallback({...progress, completedSteps: 3, currentStep: "Creating clues and evidence..."});
    const cluesResponse = await getAIResponse(
      [{
        role: "user",
        content: `For the murder mystery titled "${structureData.title}", create a set of clues and evidence.
        
        Based on these characters (focusing on the murderer${preferences.hasAccomplice ? ' and accomplice' : ''}):
        ${JSON.stringify(charactersData.slice(0, 3))}... (and other characters)
        
        Return as JSON with:
        1. murderMethod: Detailed description of how the murder was committed
        2. clues: Array of 5-8 clues that players might discover
        3. evidence: Array of physical evidence items that point to the murderer`
      }],
      'paid',
      "Generate only valid JSON with the requested fields.",
      1500
    );
    
    // Extract JSON from response
    const cluesData = extractJsonFromResponse(cluesResponse);
    progress.murderMethod = cluesData.murderMethod;
    progress.clues = cluesData.clues;
    progress.evidence = cluesData.evidence;
    
    // Step 4: Generate character secrets
    progressCallback({...progress, completedSteps: 4, currentStep: "Creating character secrets and details..."});
    const secretsResponse = await getAIResponse(
      [{
        role: "user",
        content: `For the murder mystery titled "${structureData.title}", create secrets and private information for each character.
        
        Based on the characters:
        ${JSON.stringify(charactersData)}
        
        Return as JSON with:
        1. secrets: Array of objects, each with 'characterName' and 'secretInfo' fields, one for each character`
      }],
      'paid',
      "Generate only valid JSON with the requested fields.",
      1500
    );
    
    // Extract JSON from response
    const secretsData = extractJsonFromResponse(secretsResponse);
    progress.secrets = secretsData.secrets;
    
    // Step 5: Compile everything into a final package
    progressCallback({...progress, completedSteps: 5, currentStep: "Compiling final package..."});
    
    // Prepare all data for final formatting
    const completeData = {
      title: progress.title,
      theme: preferences.theme,
      playerCount: preferences.playerCount,
      hasAccomplice: preferences.hasAccomplice,
      scriptType: preferences.scriptType,
      premise: progress.premise,
      victim: progress.victim,
      characters: progress.characters,
      murderMethod: progress.murderMethod,
      clues: progress.clues,
      evidence: progress.evidence,
      secrets: progress.secrets
    };
    
    // Final step: Format everything into a complete package
    const finalPackageResponse = await getAIResponse(
      [{
        role: "user",
        content: `Format this complete murder mystery data into a well-organized game package:
        ${JSON.stringify(completeData)}
        
        Include these sections in the final output:
        1. Introduction & Setup
        2. Game Overview
        3. Character Guides (including secrets, one for each character)
        4. Host Instructions
        5. Clue Sheet
        6. Evidence Guide
        7. Murder Solution
        
        Use ${preferences.scriptType === 'full' ? 'complete dialogue and paragraphs' : 'concise bullet points'} for character guides.`
      }],
      'paid',
      "Format this as a complete, ready-to-play murder mystery package with clear sections using markdown.",
      4000
    );
    
    // Step 6: Return the completed package
    progressCallback({
      ...progress, 
      completedSteps: 6, 
      totalSteps: 6, 
      currentStep: "Your mystery is ready!",
      fullPackage: finalPackageResponse
    });
    
    return finalPackageResponse;
    
  } catch (error) {
    console.error("Error in chunked generation:", error);
    progressCallback({
      ...progress,
      error: error instanceof Error ? error.message : "Unknown error occurred"
    });
    throw error;
  }
};

// Helper function to extract JSON from text response
function extractJsonFromResponse(response: string): any {
  try {
    // Try to find JSON block in markdown code blocks
    const jsonMatch = response.match(/```(?:json)?\n?([\s\S]*?)\n?```/) || 
                     response.match(/{[\s\S]*}/);
    
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    let jsonString = jsonMatch[1] || jsonMatch[0];
    jsonString = jsonString.trim();
    jsonString = jsonString.replace(/,\s*([}\]])/g, '$1');
    
    return JSON.parse(jsonString);
  } catch (error) {
    console.error("Error parsing JSON:", error);
    console.error("Problematic response:", response);
    throw new Error("Failed to parse JSON response");
  }
}

// The two-step mystery generation for free previews
export const generateMysteryPreview = async (preferences: MysteryPreferences): Promise<string> => {
  try {
    console.log("DEBUG: Starting generateMysteryPreview");
    
    // Step 1: Generate content
    const contentPrompt = `
      Based on a ${preferences.theme} murder mystery for ${preferences.playerCount} players:
      1. Create a creative title
      2. Write a compelling premise (2-3 paragraphs)
      3. Design a memorable victim with description
      4. List ${preferences.playerCount} characters with brief descriptions
      5. Describe the murder method

      FORMAT: Provide this as JSON with keys: title, theme, premise, victim, characters (array), murderMethod
    `;
    
    // Use your existing function for the first step
    const contentStep = await getAIResponse(
      [{ role: "user", content: contentPrompt }],
      'free',
      "Generate structured mystery content in JSON format only",
      2000
    );
    
    let mysteryContent;
    try {
      // Extract JSON from the response
      const jsonMatch = contentStep.match(/```json\n([\s\S]*)\n```/) || 
                       contentStep.match(/{[\s\S]*}/);
      
      const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : contentStep;
      mysteryContent = JSON.parse(jsonString);
    } catch (e) {
      console.error("DEBUG: Error parsing JSON response:", e);
      // Fallback to using the full response text if JSON parsing fails
      mysteryContent = {
        title: "Mystery Title",
        theme: preferences.theme,
        premise: contentStep.slice(0, 500),
        victim: "Mystery Victim",
        characters: Array(parseInt(preferences.playerCount.toString())).fill("Character"),
        murderMethod: "Unknown"
      };
    }
    
    // Step 2: Format the content
    const formattingPrompt = `
      Format this murder mystery content into the required preview layout:
      ${JSON.stringify(mysteryContent)}

      EXACT FORMAT REQUIRED:
      # "[TITLE]" - A [THEME] MURDER MYSTERY

      ## PREMISE
      [PREMISE]

      ## VICTIM
      [VICTIM]

      ## CHARACTER LIST ([PLAYER COUNT] PLAYERS)
      [NUMBERED CHARACTER LIST]

      ## MURDER METHOD
      [MURDER METHOD]

      ## UPGRADE TO FULL VERSION
      This is a preview of your custom murder mystery. Purchase the full package to receive detailed character guides, clues, and all game materials!
    `;
    
    // Use your existing function for the second step
    const formattedMystery = await getAIResponse(
      [{ role: "user", content: formattingPrompt }],
      'free',
      "Format the provided content exactly according to the specified structure without modification",
      1000
    );
    
    return formattedMystery;
  } catch (error) {
    console.error(`DEBUG: Error in generateMysteryPreview: ${error.message}`);
    return `There was an error generating your mystery preview: ${error.message}. Please try again.`;
  }
};

// Keep your existing getAIResponse function unchanged
export const getAIResponse = async (
  messages: ApiMessage[] | Message[], 
  promptVersion: 'free' | 'paid', 
  systemInstruction?: string,
  maxTokens?: number
): Promise<string> => {
  // Your existing implementation remains unchanged
  try {
    console.log(`DEBUG: Starting getAIResponse with ${messages.length} messages`);
    console.log(`DEBUG: Prompt version: ${promptVersion}`);
    console.log(`DEBUG: System instruction preview:`, systemInstruction ? `${systemInstruction.substring(0, 100)}...` : "none");
    
    // Convert messages to a standard format first
    const standardMessages = messages.map(msg => {
      if ('is_ai' in msg) {
        return {
          role: msg.is_ai ? "assistant" : "user",
          content: msg.content
        };
      }
      return msg;
    });
    
    // IMPORTANT: Filter out any system messages - they need to be handled separately
    const userAndAssistantMessages = standardMessages.filter(msg => msg.role !== 'system');
    
    // Get system instruction (use the provided systemInstruction parameter or the default)
    const markdownInstruction = "Please format your response using Markdown syntax with headings (##, ###), lists (-, 1., 2.), bold (**), italic (*), and other formatting as appropriate to structure the information clearly. Do not use a title at the beginning of your response unless you are presenting a complete murder mystery concept with a title, premise, victim details, and character list.";
    
    // Create an enhanced system instruction that emphasizes not to ask about already provided information
    const baseSystemInstruction = systemInstruction || markdownInstruction;
    const enhancedSystemInstruction = `IMPORTANT: If the user has already specified preferences such as theme, player count, whether they want an accomplice, or script type, DO NOT ask about these again. Instead, create content based on these stated preferences. ${baseSystemInstruction}`;
    
    console.log(`DEBUG: Found ${userAndAssistantMessages.length} user/assistant messages`);
    console.log(`DEBUG: Enhanced system instruction (truncated): ${enhancedSystemInstruction.substring(0, 50)}...`);

    // Set default maxTokens based on prompt version if not specified
    const tokenLimit = maxTokens || (promptVersion === 'paid' ? 8000 : 1000);

    // First try using the Supabase Edge Function
    try {
      console.log("DEBUG: Attempting to use mystery-ai Edge Function");
      
      // Format the request for the Edge Function - only send user/assistant messages
      const edgeFunctionPayload = {
        messages: userAndAssistantMessages,
        system: enhancedSystemInstruction, // Send the enhanced system instruction
        promptVersion,
        max_tokens: tokenLimit
      };

      console.log("DEBUG: Edge Function payload structure:", {
        messageCount: edgeFunctionPayload.messages.length,
        hasSystemInstruction: !!edgeFunctionPayload.system,
        systemInstructionPreview: edgeFunctionPayload.system ? 
          edgeFunctionPayload.system.substring(0, 30) + '...' : 'none',
        maxTokens: edgeFunctionPayload.max_tokens
      });

      const { data: functionData, error: functionError } = await supabase.functions.invoke('mystery-ai', {
        body: edgeFunctionPayload
      });

      // Handle Edge Function response
      if (functionData) {
        // If the Edge Function indicates it's missing configuration, quietly fall back to Vercel API
        if (functionData.error && (
          functionData.error.includes("Configuration error") || 
          functionData.error.includes("Missing Anthropic API key") ||
          functionData.error.includes("TIMEOUT") ||
          functionData.error.includes("504")
        )) {
          console.log("DEBUG: Edge Function issue (timeout or config error), falling back to Vercel API");
          return await fallbackToVercelApi(userAndAssistantMessages, enhancedSystemInstruction, promptVersion, tokenLimit);
        }

        // For successful responses, return the content
        if (functionData.choices?.[0]?.message?.content) {
          return functionData.choices[0].message.content;
        }
      }

      // Handle explicit errors from the Edge Function
      if (functionError) {
        console.log("DEBUG: Edge Function error, falling back to Vercel API:", functionError);
        return await fallbackToVercelApi(userAndAssistantMessages, enhancedSystemInstruction, promptVersion, tokenLimit);
      }

      console.log("DEBUG: Invalid response format from Edge Function, falling back");
      return await fallbackToVercelApi(userAndAssistantMessages, enhancedSystemInstruction, promptVersion, tokenLimit);

    } catch (edgeFunctionError) {
      console.log("DEBUG: Edge Function exception, falling back to Vercel API:", edgeFunctionError);
      return await fallbackToVercelApi(userAndAssistantMessages, enhancedSystemInstruction, promptVersion, tokenLimit);
    }
  } catch (error) {
    console.error(`DEBUG: Error in getAIResponse: ${error.message}`);
    return `There was an error: ${error.message}. Please try again.`;
  }
};

const fallbackToVercelApi = async (
  userAndAssistantMessages: ApiMessage[],
  systemInstruction: string,
  promptVersion: 'free' | 'paid',
  maxTokens: number
): Promise<string> => {
  // Your existing implementation remains unchanged
  console.log("DEBUG: Using Vercel API fallback");
  const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';

  // Format request for the Vercel API - ensure system is sent as a separate parameter
  const requestBody = {
    messages: userAndAssistantMessages,
    system: systemInstruction, // Send the enhanced system instruction
    promptVersion,
    max_tokens: maxTokens
  };

  console.log("DEBUG: Sending to Vercel API:", {
    messageCount: requestBody.messages.length,
    systemInstructionPreview: requestBody.system.substring(0, 30) + '...',
    maxTokens: requestBody.max_tokens
  });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`DEBUG: API returned status ${response.status}: ${errorText}`);
      throw new Error(`API returned status ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    if (data?.choices?.[0]?.message?.content) {
      return data.choices[0].message.content;
    }

    throw new Error("Invalid response format from API");
  } catch (error) {
    console.error("DEBUG: Error in fallbackToVercelApi:", error);
    throw error;
  }
};
