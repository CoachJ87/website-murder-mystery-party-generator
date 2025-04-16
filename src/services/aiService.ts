// src/services/aiService.ts

// Interface for conversation messages
interface Message {
  is_ai: boolean;
  content: string;
}

// Function to get AI response for your murder mystery chatbot
export const getAIResponse = async (messages: Message[], promptVersion: 'free' | 'paid'): Promise<string> => {
  try {
    console.log(`Calling proxy with ${promptVersion} prompt version at ${new Date().toISOString()}`);
    
    // Increase timeout to 30 seconds
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out after 30 seconds")), 30000)
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
    
    console.log(`Sending request to ${apiUrl} at ${new Date().toISOString()}`);
    
    const fetchPromise = fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody)
    });
    
    // Add timing logs around the fetch operation
    const responsePromise = fetchPromise.then(async response => {
      console.log(`Received initial response at ${new Date().toISOString()}, status: ${response.status}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API returned ${response.status}: ${errorText}`);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }
      
      console.log(`Starting to parse JSON at ${new Date().toISOString()}`);
      const jsonData = await response.json();
      console.log(`JSON parsing complete at ${new Date().toISOString()}`);
      
      return jsonData;
    });
    
    // Race between the actual request and the timeout
    console.log(`Waiting for response or timeout at ${new Date().toISOString()}`);
    const data = await Promise.race([responsePromise, timeoutPromise]) as any;
    console.log(`Race completed at ${new Date().toISOString()}`);

    if (!data || data.error) {
      console.error("Error calling proxy function:", data?.error || "Unknown error", data?.details || "");
      return generateMockResponse(messages, promptVersion);
    }

    // Extract the response content
    if (data && data.content && data.content.length > 0) {
      console.log("Content received, type:", data.content[0]?.type);
      if (data.content[0].type === 'text') {
        return data.content[0].text;
      }
    }

    console.error("Invalid response format from proxy function:", JSON.stringify(data, null, 2));
    return generateMockResponse(messages, promptVersion);
  } catch (error) {
    console.error("Error in getAIResponse:", error);
    // Additional error details
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    return generateMockResponse(messages, promptVersion);
  }
};

// Generate mock responses when API is not available
const generateMockResponse = (messages: Message[], promptVersion: 'free' | 'paid'): string => {
  const lastUserMessage = messages.filter(m => !m.is_ai).pop()?.content || "";
  
  if (promptVersion === 'paid') {
    return `Unable to connect to the AI. Your full mystery package will be generated when the connection is restored.`;
  } else {
    return `# "SHADOWS AT THE PREMIERE" - A HOLLYWOOD MURDER MYSTERY

## PREMISE
The glittering world of Hollywood is rocked when renowned director Marcus Reynolds is found dead at his own film premiere. The red carpet event at the historic Pantheon Theater had drawn the industry's biggest stars, powerful producers, and ambitious newcomers—all with their own agendas and secrets. As the screening was about to begin, Marcus was discovered in his private viewing box, strangled with a strip of film.

The theater has been locked down, with police detaining eight key suspects who had both motive and opportunity. With cameras everywhere but mysteriously missing footage from the critical time window, the murderer must be among them. As tensions rise and accusations fly, each suspect must defend themselves while trying to uncover who really killed the controversial director.

## VICTIM
**Marcus Reynolds** - A brilliant but tyrannical director known for extracting Oscar-worthy performances through psychological manipulation and cruelty. His latest film, "Beautiful Monsters," was rumored to be his masterpiece, but also his most controversial work. Many careers and relationships were destroyed during its tumultuous production, leaving a trail of enemies determined to see him fall.

## CHARACTER LIST (8 PLAYERS)
1. **Victoria/Victor Harlow** - Marcus's ex-spouse and producer who financed the film but was publicly humiliated when Marcus revealed their marriage was "research" for the movie.
2. **Ethan/Elena Stone** - The film's ambitious lead actor whose career-defining role came at the cost of a complete psychological breakdown during filming.
3. **James/Jamie Wong** - A rival director whose original screenplay was allegedly stolen and reworked by Marcus into "Beautiful Monsters."
4. **Olivia/Oliver Greene** - The studio executive who threatened to pull funding after witnessing Marcus's abusive behavior on set.
5. **Sophia/Sam Rodriguez** - Marcus's talented but unacknowledged assistant director who did most of the actual filming without credit.
6. **Richard/Rachel Morris** - A powerful film critic whose scathing early review of "Beautiful Monsters" led to a very public feud with Marcus.
7. **Natalie/Nathan Pierce** - Marcus's current lover and the film's breakout star, whose career was launched through their relationship.
8. **Daniel/Danielle Ford** - The theater owner with gambling debts who was being blackmailed by Marcus over hidden camera footage from the dressing rooms.

## MURDER METHOD
Marcus was strangled with a strip of his own film, torn from the very movie being premiered that night. The killer modified the projection booth's security system to create a 3-minute blackout in the surveillance footage. During this window, they slipped into Marcus's private box, used the film strip with leather gloves to avoid leaving prints, and positioned the body to be discovered just as the movie was scheduled to begin. A broken cufflink found clutched in Marcus's hand and a distinctive perfume lingering in the box provide the only physical clues to the murderer's identity.

Would this Hollywood murder mystery concept work for your event? I can create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!`;
  }
};
