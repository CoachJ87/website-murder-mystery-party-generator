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
Background: Renowned historian and academic, Elizabeth's former business partner.
Motive: Elizabeth threatened to reveal his academic fraud.
Secret: Has been falsifying research for years to maintain his reputation.

### Suspect 2 - Victoria Blackwood
Background: Elizabeth's personal assistant and distant cousin.
Motive: Recently discovered she was cut out of Elizabeth's will.
Secret: Has been embezzling small amounts from Elizabeth's accounts.

## Host Instructions

1. Send invitations 2 weeks before the event
2. Prepare the venue with 1920s decorations
3. Distribute character packets on arrival
4. Guide players through the 3 rounds of investigation

## Game Materials

* 6 Evidence cards
* Character name tags
* Case file documents
* Final accusation forms

## Timeline of Events

7:00 PM - Guests arrive, introductions
8:00 PM - Murder is discovered
8:15 PM - Round 1 investigation
9:00 PM - Round 2 investigation
9:45 PM - Final accusations and reveal`;
  }
  
  if (messageCount <= 1) {
    return `Great! I'd be happy to help you create a murder mystery game. Let's think about what kind of theme you're interested in. Would you prefer a classic whodunit in a mansion, a historical setting like the 1920s, or perhaps something more unusual like a sci-fi or fantasy murder mystery?

Your input: "${lastUserMessage.substring(0, 100)}${lastUserMessage.length > 100 ? '...' : ''}"`;
  } else if (messageCount <= 3) {
    return `That's a great direction! Now let's think about our cast of characters. A good murder mystery typically needs:

1. A victim (who will be murdered)
2. 4-8 suspects (one being the actual murderer)
3. Perhaps a detective character

What kind of characters would fit well in your setting? Think about their relationships, potential motives, and interesting backgrounds.

Your latest message: "${lastUserMessage.substring(0, 100)}${lastUserMessage.length > 100 ? '...' : ''}"`;
  } else {
    return `You're making excellent progress on your murder mystery! Let's develop this further based on what you've shared:

"${lastUserMessage.substring(0, 100)}${lastUserMessage.length > 100 ? '...' : ''}"

Here are some ideas to consider:
- What kind of clues would lead the players to the murderer?
- How will you reveal information gradually throughout the game?
- What red herrings might you include to keep players guessing?

To create a complete package with all character details, clues, and game materials, you'll want to purchase the premium version.`;
  }
};
