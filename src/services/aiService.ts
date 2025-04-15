import { supabase } from "@/lib/supabase";

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log("Attempting to call mystery-ai Edge Function...");
    
    // Set a timeout to avoid hanging if the CORS issue blocks the request
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), 5000)
    );
    
    const responsePromise = supabase.functions.invoke('mystery-ai', {
      body: { messages, promptVersion }
    });
    
    // Race between the actual request and the timeout
    const { data, error } = await Promise.race([responsePromise, timeoutPromise]) as any;

    if (error) {
      console.error("Error calling Edge Function:", error);
      return generateMockResponse(messages, promptVersion);
    }

    // Extract the response content from the Anthropic API response
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      return data.content[0].text;
    }

    console.error("Invalid response format from Edge Function:", data);
    return generateMockResponse(messages, promptVersion);
  } catch (error) {
    console.error("Error in getAIResponse:", error);
    return generateMockResponse(messages, promptVersion);
  }
};

// Generate helpful mock responses when API is not available
const generateMockResponse = (messages: Message[], promptVersion: 'free' | 'paid'): string => {
  const lastUserMessage = messages.filter(m => !m.is_ai).pop()?.content || "";
  const messageCount = messages.length;
  
  if (promptVersion === 'paid') {
    return `# Complete Murder Mystery Package

## Character Guides

### The Victim - Elizabeth Montgomery
Background: Wealthy socialite, known for her extravagant parties and philanthropy.
Secret: Was blackmailing several guests over their dark secrets.

### Suspect 1 - Professor James Hawthorne
Background: Renowned historian and academic, Elizabeth's former
