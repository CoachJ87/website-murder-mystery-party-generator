
import { supabase } from "@/lib/supabase";

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log("Calling mystery-ai Edge Function with:", { messages: messages.length, promptVersion });
    
    const { data, error } = await supabase.functions.invoke('mystery-ai', {
      body: { messages, promptVersion }
    });

    if (error) {
      console.error("Error calling Edge Function:", error);
      return generateMockResponse(messages, promptVersion);
    }

    console.log("Edge Function response:", data);
    
    // Extract the response content from the Anthropic API response
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      return data.content[0].text;
    }

    return "I couldn't generate a proper response. Please try again.";
  } catch (error) {
    console.error("Error calling Edge Function:", error);
    return generateMockResponse(messages, promptVersion);
  }
};

// Generate mock responses when API is not available
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
    return `Great! I'd be happy to help you create a murder mystery game. Let's think about what kind of theme you're interested in. Would you prefer a classic whodunit in a mansion, a historical setting like the 1920s, or perhaps something more unusual like a sci-fi or fantasy murder mystery?`;
  } else if (messageCount <= 3) {
    return `That's a great direction! Now let's think about our cast of characters. A good murder mystery typically needs:

1. A victim (who will be murdered)
2. 4-8 suspects (one being the actual murderer)
3. Perhaps a detective character

What kind of characters would fit well in your setting? Think about their relationships, potential motives, and interesting backgrounds.`;
  } else {
    return `You're making excellent progress on your murder mystery! To continue developing the full package with complete character details, all the clues, and game materials, you'll want to purchase the premium package. 

The premium package includes:
- Detailed character guides for each player
- Host instructions
- Evidence cards and printable props
- Complete game script and timeline
- Solution and reveal guidelines

In the meantime, feel free to continue refining the basic concept and characters!`;
  }
};
