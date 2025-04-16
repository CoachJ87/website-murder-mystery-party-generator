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

    if (!data || data.error) {
      console.error("Error calling proxy function:", data?.error || "Unknown error");
      return generateMockResponse(messages, promptVersion);
    }

    // Extract the response content
    let responseText = "";
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      responseText = data.content[0].text;
      
      // Only process free version responses
      if (promptVersion === 'free') {
        // Post-process to fix formatting issues
        responseText = postProcessFreeResponse(responseText);
      }
      
      return responseText;
    }

    console.error("Invalid response format from proxy function:", data);
    return generateMockResponse(messages, promptVersion);
  } catch (error) {
    console.error("Error in getAIResponse:", error);
    return generateMockResponse(messages, promptVersion);
  }
};

// Post-process the Claude response to fix formatting issues
function postProcessFreeResponse(text: string): string {
  console.log("Post-processing free response");
  
  // Remove all $2 markers
  text = text.replace(/\$2|\*\*\$2\*\*/g, '');
  
  // Make sure we have the right section headers
  if (!text.includes("# \"")) {
    // Extract a title if possible
    const titleMatch = text.match(/\*\*([^*]+)\*\*/);
    const title = titleMatch ? titleMatch[1] : "MYSTERY TITLE";
    text = `# "${title}" - A MURDER MYSTERY\n\n` + text;
  }
  
  // Fix character list numbering
  const characterListRegex = /## CHARACTER LIST|## THE CHARACTERS|## CHARACTERS/i;
  if (text.match(characterListRegex)) {
    // Split the text at the character list section
    const [before, after] = text.split(characterListRegex);
    
    // Extract the character section and everything after it
    let characterSection = after;
    let remainder = "";
    
    // Find where the character section ends (at the next ## or at "Would this")
    const nextSectionMatch = characterSection.match(/\n##|\nWould this/);
    if (nextSectionMatch) {
      const splitIndex = nextSectionMatch.index;
      remainder = characterSection.substring(splitIndex);
      characterSection = characterSection.substring(0, splitIndex);
    }
    
    // Extract all character entries (looking for patterns like "Name - Description" or "**Name** - Description")
    const characterEntries = characterSection.match(/\*\*[^*]+\*\*[^\n]+/g) || 
                           characterSection.match(/[^\n:]+(-|–)[^\n]+/g) || [];
    
    // Renumber them
    let numberedCharacters = "";
    characterEntries.forEach((entry, index) => {
      // Check if it already starts with a number and remove it
      entry = entry.replace(/^\d+\.?\s+/, '');
      numberedCharacters += `${index + 1}. ${entry}\n\n`;
    });
    
    // Rebuild the text with proper headings and numbering
    text = before + "## CHARACTER LIST\n\n" + numberedCharacters + remainder;
  }
  
  // Make sure we have all required sections in the right order
  let finalText = "";
  
  // Extract existing sections
  const titleMatch = text.match(/# "[^"]+"/);
  const premiseMatch = text.match(/## PREMISE[\s\S]*?(?=##|$)/i) || 
                     text.match(/## THE PREMISE[\s\S]*?(?=##|$)/i);
  const victimMatch = text.match(/## VICTIM[\s\S]*?(?=##|$)/i) || 
                    text.match(/## THE VICTIM[\s\S]*?(?=##|$)/i) ||
                    text.match(/## MURDER VICTIM[\s\S]*?(?=##|$)/i);
  const murderMatch = text.match(/## MURDER METHOD[\s\S]*?(?=##|$)/i) || 
                    text.match(/## THE MURDER[\s\S]*?(?=##|$)/i);
  const characterMatch = text.match(/## CHARACTER LIST[\s\S]*?(?=##|Would this|$)/i) || 
                       text.match(/## THE CHARACTERS[\s\S]*?(?=##|Would this|$)/i) ||
                       text.match(/## CHARACTERS[\s\S]*?(?=##|Would this|$)/i);
  
  // Build the text in the correct order
  if (titleMatch) finalText += titleMatch[0] + "\n\n";
  if (premiseMatch) finalText += premiseMatch[0] + "\n\n";
  if (victimMatch) finalText += victimMatch[0] + "\n\n";
  if (murderMatch) finalText += murderMatch[0] + "\n\n";
  if (characterMatch) finalText += characterMatch[0] + "\n\n";
  
  // If we successfully parsed and rebuilt the text, use it
  if (finalText) {
    text = finalText;
  }
  
  // Ensure the closing text is correct
  if (!text.includes('Would this murder mystery concept work for your event?')) {
    text = text.replace(/Let me develop this[\s\S]*$/, '');
    text = text.replace(/I'll expand this concept[\s\S]*$/, '');
    text = text.replace(/Would you like me to[\s\S]*$/, '');
    
    text += '\n\nWould this murder mystery concept work for your event? You can continue to make edits, and once you\'re satisfied, press the \'Generate Mystery\' button to create a complete game package with detailed character guides, host instructions, and all the game materials you\'ll need if you choose to purchase the full version!';
  }
  
  return text;
}

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

## MURDER METHOD
Marcus was strangled with a strip of his own film, torn from the very movie being premiered that night. The killer modified the projection booth's security system to create a 3-minute blackout in the surveillance footage. During this window, they slipped into Marcus's private box, used the film strip with leather gloves to avoid leaving prints, and positioned the body to be discovered just as the movie was scheduled to begin. A broken cufflink found clutched in Marcus's hand and a distinctive perfume lingering in the box provide the only physical clues to the murderer's identity.

## CHARACTER LIST (8 PLAYERS)
1. **Victoria/Victor Harlow** - Marcus's ex-spouse and producer who financed the film but was publicly humiliated when Marcus revealed their marriage was "research" for the movie.
2. **Ethan/Elena Stone** - The film's ambitious lead actor whose career-defining role came at the cost of a complete psychological breakdown during filming.
3. **James/Jamie Wong** - A rival director whose original screenplay was allegedly stolen and reworked by Marcus into "Beautiful Monsters."
4. **Olivia/Oliver Greene** - The studio executive who threatened to pull funding after witnessing Marcus's abusive behavior on set.
5. **Sophia/Sam Rodriguez** - Marcus's talented but unacknowledged assistant director who did most of the actual filming without credit.
6. **Richard/Rachel Morris** - A powerful film critic whose scathing early review of "Beautiful Monsters" led to a very public feud with Marcus.
7. **Natalie/Nathan Pierce** - Marcus's current lover and the film's breakout star, whose career was launched through their relationship.
8. **Daniel/Danielle Ford** - The theater owner with gambling debts who was being blackmailed by Marcus over hidden camera footage from the dressing rooms.

Would this murder mystery concept work for your event? You can continue to make edits, and once you're satisfied, press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!`;
  }
};
