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
    if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
      let text = data.content[0].text;
      
      // Post-process free version responses
      if (promptVersion === 'free') {
        text = cleanupResponse(text);
      }
      
      return text;
    }

    console.error("Invalid response format from proxy function:", data);
    return generateMockResponse(messages, promptVersion);
  } catch (error) {
    console.error("Error in getAIResponse:", error);
    return generateMockResponse(messages, promptVersion);
  }
};

// Function to clean up the response text
function cleanupResponse(text: string): string {
  // Remove $2 markers
  text = text.replace(/\$2|\*\*\$2\*\*/g, '');
  
  // Replace any double line breaks with single line breaks to normalize spacing
  text = text.replace(/\n\s*\n/g, '\n\n');
  
  // Create our ideal output structure
  let output = '';
  
  // Extract title
  const titleMatch = text.match(/(?:\*\*|# "|#"\s*)([^*"]+)(?:\*\*|")/);
  const title = titleMatch ? titleMatch[1].trim() : "MYSTERY TITLE";
  
  // Add formatted title
  output += `# "${title}" - A MURDER MYSTERY\n\n`;
  
  // Add premise section
  output += "## PREMISE\n";
  // Try to find premise content
  let premiseMatch = text.match(/(?:## PREMISE|## THE PREMISE)[^#]*(?=##|$)/i);
  if (!premiseMatch) {
    // Look for paragraphs that might be the premise
    const paragraphs = text.split('\n\n');
    for (const p of paragraphs) {
      if (p.length > 100 && !p.includes('#') && !p.includes('**') && 
          !p.includes('Would this') && !p.includes('Let me develop')) {
        premiseMatch = [p];
        break;
      }
    }
  }
  
  if (premiseMatch) {
    const premiseContent = premiseMatch[0]
      .replace(/## PREMISE|## THE PREMISE/i, '')
      .trim();
    output += premiseContent + "\n\n";
  } else {
    output += "A thrilling murder mystery awaits...\n\n";
  }
  
  // Add victim section
  output += "## VICTIM\n";
  let victimMatch = text.match(/(?:## VICTIM|## THE VICTIM|## MURDER VICTIM)[^#]*(?=##|$)/i);
  if (victimMatch) {
    const victimContent = victimMatch[0]
      .replace(/## VICTIM|## THE VICTIM|## MURDER VICTIM/i, '')
      .trim();
    output += victimContent + "\n\n";
  } else {
    // Try to extract victim information from text
    const victimNameMatch = text.match(/\*\*([^*]+)\*\*\s*-\s*([^\n]+)/);
    if (victimNameMatch) {
      output += `**${victimNameMatch[1]}** - ${victimNameMatch[2]}\n\n`;
    } else {
      output += "The victim's details are still being uncovered...\n\n";
    }
  }
  
  // Add murder method section
  output += "## MURDER METHOD\n";
  let methodMatch = text.match(/(?:## MURDER METHOD|## THE MURDER)[^#]*(?=##|$)/i);
  if (methodMatch) {
    const methodContent = methodMatch[0]
      .replace(/## MURDER METHOD|## THE MURDER/i, '')
      .trim();
    output += methodContent + "\n\n";
  } else {
    output += "The details of the murder are still being investigated...\n\n";
  }
  
  // Add character list section
  output += "## CHARACTER LIST (8 PLAYERS)\n";
  
  // Find character list section
  let characterListMatch = text.match(/(?:## CHARACTER LIST|## THE CHARACTERS|## CHARACTERS)[^#]*(?=##|Would this|$)/i);
  
  if (characterListMatch) {
    const characterSection = characterListMatch[0]
      .replace(/## CHARACTER LIST|## THE CHARACTERS|## CHARACTERS/i, '')
      .trim();
    
    // Find all character entries
    const characterEntries = characterSection.match(/(?:\d+\.?\s*)?\*\*[^*]+\*\*[^\n]+/g) || 
                           characterSection.match(/(?:\d+\.?\s*)?[^\n:]+(-|–)[^\n]+/g) || [];
    
    // Add numbered character entries
    for (let i = 0; i < characterEntries.length; i++) {
      let entry = characterEntries[i];
      // Remove any existing numbering
      entry = entry.replace(/^\d+\.?\s*/, '');
      output += `${i+1}. ${entry}\n`;
    }
  } else {
    output += "Character details are being developed...\n";
  }
  
  // Add closing text
  output += "\n\nWould this murder mystery concept work for your event? You can continue to make edits, and once you're satisfied, press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!";
  
  return output;
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
