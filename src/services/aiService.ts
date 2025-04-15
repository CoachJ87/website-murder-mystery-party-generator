// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log("Attempting to call Vercel serverless function proxy...");
    
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
      system: promptVersion === 'paid' 
        ? "You are a Murder Mystery Creator assistant. The user has purchased the full package, so provide detailed character guides, host instructions, and all game materials needed to run a complete murder mystery party."
        : "You are a Murder Mystery Creator assistant. This is the free preview version, so give helpful but limited responses about creating a murder mystery. Mention that the complete package with all character details, clues, and game materials is available with the premium version."
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

// Generate helpful mock responses when API is not available
const generateMockResponse = (messages: Message[], promptVersion: 'free' | 'paid'): string => {
  const lastUserMessage = messages.filter(m => !m.is_ai).pop()?.content || "";
  const messageCount = messages.length;
  
  if (promptVersion === 'paid') {
    return `Unfortunately the AI is not connected
    `;
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
