// src/services/aiService.ts

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log(`Calling proxy with ${promptVersion} prompt version`);
    
    // Set a timeout to avoid hanging if there's an issue
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), 30000)
    );
    
    // Your Vercel deployed URL
    const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';
    
    // Prepare the request with messages and prompt version
    const requestBody = {
      messages: messages.map(msg => ({
        role: msg.is_ai ? "assistant" : "user",
        content: msg.content
      })),
      promptVersion: promptVersion
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

    console.log("API Response received:", data);

    if (!data || data.error) {
      console.error("Error calling proxy function:", data?.error || "Unknown error");
      return generateMockResponse(messages, promptVersion);
    }

    // Extract the response content - Claude API format
    if (data && data.content && data.content.length > 0) {
      return data.content[0].text;
    }

    console.error("Invalid response format from proxy function:", data);
    return generateMockResponse(messages, promptVersion);
  } catch (error) {
    console.error("Error in getAIResponse:", error);
    return generateMockResponse(messages, promptVersion);
  }
};

// Generate mock responses when API is not available
const generateMockResponse = (messages: Message[], promptVersion: 'free' | 'paid'): string => {
  const lastUserMessage = messages.filter(m => !m.is_ai).pop()?.content || "";
  
  if (promptVersion === 'paid') {
    return `# Your Murder Mystery Package

Unable to connect to the AI at this moment. Your full mystery package will be generated when the connection is restored.`;
  } else {
    return `# "SHADOWS AT THE PREMIERE" - A HOLLYWOOD MURDER MYSTERY

## PREMISE
The glittering world of Hollywood is rocked when renowned director Marcus Reynolds is found dead at his own film premiere. The red carpet event at the historic Pantheon Theater had drawn the industry's biggest stars, powerful producers, and ambitious newcomers—all with their own agendas and secrets. As the screening was about to begin, Marcus was discovered in his private viewing box, strangled with a strip of film.

## VICTIM
**Marcus Reynolds** - A brilliant but tyrannical director known for extracting Oscar-worthy performances through psychological manipulation and cruelty.

## CHARACTER LIST (8 PLAYERS)
1. **Victoria/Victor Harlow** - Marcus's ex-spouse and producer who financed the film
2. **Ethan/Elena Stone** - The film's ambitious lead actor whose career-defining role came at the cost 
3. **James/Jamie Wong** - A rival director whose original screenplay was allegedly stolen
4. **Olivia/Oliver Greene** - The studio executive who threatened to pull funding
5. **Sophia/Sam Rodriguez** - Marcus's talented but unacknowledged assistant director
6. **Richard/Rachel Morris** - A powerful film critic whose scathing early review led to a feud
7. **Natalie/Nathan Pierce** - Marcus's current lover and the film's breakout star
8. **Daniel/Danielle Ford** - The theater owner with gambling debts who was being blackmailed

## MURDER METHOD
Marcus was strangled with a strip of his own film, torn from the very movie being premiered that night.

Would this Hollywood murder mystery concept work for your event?`;
  }
};
