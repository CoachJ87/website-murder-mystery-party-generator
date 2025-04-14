
// src/services/aiService.ts
import Anthropic from '@anthropic-ai/sdk';

// In Vite, environment variables are available via import.meta.env, not process.env
const ANTHROPIC_API_KEY = "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";

// Initialize Anthropic client with the dangerouslyAllowBrowser flag set to true
const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
  dangerouslyAllowBrowser: true, // Add this flag to explicitly allow browser usage
});

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    // Get the appropriate system prompt based on promptVersion
    const systemPrompt = promptVersion === 'paid' 
      ? "You are an AI assistant that helps create detailed murder mystery party games. Since the user has purchased, provide complete character details, clues, and all game materials."
      : "You are an AI assistant that helps create murder mystery party games. Create an engaging storyline and suggest character ideas, but don't provide complete details as this is a preview.";
    
    const response = await anthropic.messages.create({
      model: "claude-3-opus-20240229", // Or a more cost-effective model like claude-3-haiku
      system: systemPrompt,
      messages: messages.map(msg => ({
        role: msg.is_ai ? "assistant" : "user",
        content: msg.content
      })),
      max_tokens: 1000,
    });
    
    // Handle the response content properly based on the SDK's structure
    if (response.content[0].type === 'text') {
      return response.content[0].text;
    }
    
    // Fallback if the response doesn't have text content
    return "I couldn't generate a proper response. Please try again.";
  } catch (error) {
    console.error("Error calling Anthropic API:", error);
    // Fallback to mock response if API call fails
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
