// src/services/aiService.ts
import { supabase } from "@/lib/supabase";

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log("Attempting to call Vercel serverless function proxy...");
    console.log(`Using ${promptVersion} prompt version for request`);
    
    // Set a timeout to avoid hanging if there's an issue
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), 15000)
    );
    
    // Your Vercel deployed URL - replace with your actual domain
    const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-anthropic';
    
    // Prepare the request to the Anthropic API through our proxy
    const requestBody = {
      model: "claude-3-haiku-20240307",
      max_tokens: 1000,
      messages: messages.map(msg => ({
        role: msg.is_ai ? "assistant" : "user",
        content: msg.content
      })),
      system: promptVersion === 'free' 
        ? FREE_SYSTEM_PROMPT  // We'll define this constant below
        : `You are a Murder Mystery Creator assistant. The user has purchased the full package, so provide detailed character guides, host instructions, and all game materials needed to run a complete murder mystery party.`
    };
    
    const responsePromise = fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    }).then(response => response.json());
    
    // Race between the actual request and the timeout
    const data = await Promise.race([responsePromise, timeoutPromise]) as any;

    if (!data || data.error) {
      console.error("Error calling proxy function:", data?.error || "Unknown error");
      return generateMockResponse(messages, promptVersion);
    }

    // Extract the response content from the Anthropic API response
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      return data.content[0].text;
    }

    console.error("Invalid response format from proxy function:", data);
    return generateMockResponse(messages, promptVersion);
  } catch (error) {
    console.error("Error in getAIResponse:", error);
    return generateMockResponse(messages, promptVersion);
  }
};

// Define the free system prompt directly in the code
const FREE_SYSTEM_PROMPT = `# MURDER MYSTERY PARTY GAME CREATOR

## ROLE AND CONTEXT
You are an expert murder mystery party game designer helping the user create a custom, detailed murder mystery game for their event.

## TASK DESCRIPTION
Guide the user through creating a complete murder mystery party game package by:
1. Collecting their preferences through specific questions
2. Creating a compelling murder scenario based on their answers
3. Developing engaging character concepts that will intrigue potential players

## OUTPUT FORMAT
Present your mystery preview in an engaging, dramatic format that will excite the user. Include:

# "[CREATIVE TITLE]" - A [THEME] MURDER MYSTERY

## PREMISE
[2-3 paragraphs setting the scene, describing the event where the murder takes place, and creating dramatic tension]

## VICTIM
**[Victim Name]** - [Vivid description of the victim, their role in the story, personality traits, and why they might have made enemies]

## CHARACTER LIST ([PLAYER COUNT] PLAYERS)
1. **[Character 1 Name]** - [Engaging one-sentence description including profession and connection to victim]
2. **[Character 2 Name]** - [Engaging one-sentence description including profession and connection to victim]
[Continue for all characters]

## MURDER METHOD
[Paragraph describing how the murder was committed, interesting details about the method, and what clues might be found]

[After presenting the mystery concept, ask if the concept works for them and explain that you can create a complete game package with detailed character guides, host instructions, and game materials if they choose to purchase.]

## CONSTRAINTS AND FINAL VERIFICATION
- Ensure the preview is exciting and engaging enough to make the user want the full package
- Create characters with clear potential for interesting secrets and motivations
- Keep the concept accessible for casual players while offering intrigue
- Make sure gender-neutral options are available for all characters

IMPORTANT: Always follow this exact format for your response. Begin with a creative title, then provide sections for premise, victim, character list, and murder method in exactly this order.`;

// Generate helpful mock responses when API is not available
const generateMockResponse = (messages: Message[], promptVersion: 'free' | 'paid'): string => {
  const lastUserMessage = messages.filter(m => !m.is_ai).pop()?.content || "";
  const messageCount = messages.length;
  
  if (promptVersion === 'paid') {
    return `## Premium Murder Mystery Package
Unfortunately the AI is not connected at the moment. Your paid mystery package will include:

- [ ] Detailed character guides
- [ ] Host instructions
- [ ] Game materials
- [ ] Props list
- [x] Premium support

### Next Steps
1. Reconnect to the AI service
2. Generate your custom mystery
3. Download your materials`;
  }
  
  if (messageCount <= 1) {
    return `## "SECRETS OF THE SAPPHIRE SEAS"
### A Cruise Ship Murder Mystery

The luxury cruise liner "Sapphire Seas" is on the final night of its 7-day Caribbean voyage. The ship's wealthy owner, **Elijah Blackwood**, has gathered the passengers in the grand ballroom for a farewell gala dinner.

### The Victim
**Elijah Blackwood** - A ruthless, self-made shipping magnate with a reputation for crushing competitors and betraying allies.

### Character List (8 Players)
1. **Victoria/Victor Blackwood** - Elijah's ambitious spouse
2. **Morgan Reynolds** - Elijah's business partner
3. **Dr. Alex Thornton** - The ship's physician
4. **Taylor Jenkins** - A celebrated chef
5. **Jordan Winters** - A former employee
6. **Casey Monroe** - A private investigator
7. **Riley Donovan** - A wealthy passenger
8. **Avery Martinez** - The cruise entertainment director`;
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
