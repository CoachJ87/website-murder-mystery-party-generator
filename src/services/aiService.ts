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
    
    console.log("Sending request with messages:", messages.length);
    
    try {
      const responsePromise = fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      }).then(response => {
        if (!response.ok) {
          throw new Error(`API responded with status ${response.status}`);
        }
        return response.json();
      });
      
      // Race between the actual request and the timeout
      const data = await Promise.race([responsePromise, timeoutPromise]) as any;

      if (!data || data.error) {
        console.error("Error calling proxy function:", data?.error || "Unknown error");
        return generateMockResponse(messages, promptVersion);
      }

      // Extract the response content
      if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
        return formatResponseText(data.content[0].text, messages); 
      }

      console.error("Invalid response format from proxy function:", data);
      return generateMockResponse(messages, promptVersion);
    } catch (error) {
      console.error("Error with API request:", error);
      return generateMockResponse(messages, promptVersion);
    }
  } catch (error) {
    console.error("Error in getAIResponse:", error);
    return generateMockResponse(messages, promptVersion);
  }
};

// Function to format the response text properly
function formatResponseText(text: string, messages: Message[]): string {
  // Extract theme from user messages
  let theme = "mystery";
  for (const msg of messages) {
    if (!msg.is_ai) {
      const themeMatch = msg.content.match(/theme[:\s]*([a-z0-9\s]+)/i);
      if (themeMatch) {
        theme = themeMatch[1].trim();
      }
    }
  }
  
  // Remove any $2 markers
  text = text.replace(/\$2|\*\*\$2\*\*/g, '');
  
  // Check if this looks like a properly formed response or if we got the default
  if (text.includes("SHADOWS AT THE PREMIERE") && !messages.some(m => 
      !m.is_ai && m.content.toLowerCase().includes("hollywood"))) {
    // We got the default response when we shouldn't have - create a custom one
    return createCustomMystery(theme);
  }
  
  // Ensure proper markdown formatting for headers
  text = text.replace(/^PREMISE$/gmi, "## PREMISE");
  text = text.replace(/^VICTIM$/gmi, "## VICTIM");
  text = text.replace(/^MURDER METHOD$/gmi, "## MURDER METHOD");
  text = text.replace(/^CHARACTER LIST/gmi, "## CHARACTER LIST");
  
  // Ensure character list uses numbers instead of bullets
  const characterListMatch = text.match(/## CHARACTER LIST[^#]+/i);
  if (characterListMatch) {
    let characterList = characterListMatch[0];
    // Replace bullets with numbers
    let updatedList = characterList.replace(/\* \*\*/g, (match, index, str) => {
      // Count how many bullets came before this one to determine the number
      const previousBullets = str.substring(0, index).match(/\* \*\*/g) || [];
      return `${previousBullets.length + 1}. **`;
    });
    
    // Replace the character list in the text
    text = text.replace(characterList, updatedList);
  }
  
  return text;
}

// Create a custom mystery for a given theme when the API fails
function createCustomMystery(theme: string): string {
  const capitalizedTheme = theme.charAt(0).toUpperCase() + theme.slice(1);
  
  return `# "SECRETS OF ${capitalizedTheme.toUpperCase()}" - A ${capitalizedTheme} MURDER MYSTERY

## PREMISE
In the unique setting of ${theme}, a community gathering has turned deadly when a prominent local figure is found murdered under mysterious circumstances. What should have been a celebration has now become a locked-room mystery as a storm prevents anyone from leaving the area. The killer walks among the suspects, each with their own motives and secrets waiting to be uncovered.

## VICTIM
**Taylor Morgan** - A charismatic and influential figure in the ${theme} community who had recently hinted at revealing "information that would change everything." Known for making both devoted friends and bitter enemies, Taylor had accumulated numerous secrets over the years and wasn't afraid to use them for leverage.

## MURDER METHOD
Taylor was killed using a rare poison that was cleverly disguised in a special drink that only Taylor was known to consume. The murder required intimate knowledge of Taylor's habits and access to restricted areas where the drink was prepared. Evidence suggests the killer may have left behind a unique personal item at the scene that could identify them if discovered.

## CHARACTER LIST (8 PLAYERS)
1. **Jordan Reynolds** - Taylor's business partner who stood to gain control of their shared enterprise upon Taylor's death.
2. **Alex Winters** - A rival who had publicly clashed with Taylor over community resources and influence.
3. **Casey Bennett** - Taylor's personal assistant who knows all the victim's secrets but had recently been threatened with dismissal.
4. **Morgan Stein** - A scientist/expert whose groundbreaking work was allegedly stolen by Taylor.
5. **Riley Cooper** - A family member with a disputed inheritance who had been cut from Taylor's will last month.
6. **Quinn Sullivan** - A mysterious newcomer to the ${theme} setting with a hidden connection to Taylor's past.
7. **Avery Jenkins** - A local authority figure who had been investigating Taylor for potential rule violations.
8. **Blake Thompson** - Taylor's ex-partner who had suffered both personally and professionally after their bitter separation.

Would this murder mystery concept work for your event? You can continue to make edits, and once you're satisfied, press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!`;
}

// Generate mock responses when API is not available
const generateMockResponse = (messages: Message[], promptVersion: 'free' | 'paid'): string => {
  if (promptVersion === 'paid') {
    return `Unable to connect to the AI. Your full mystery package will be generated when the connection is restored.`;
  } else {
    // Extract theme from user messages
    let theme = "Hollywood";
    for (const msg of messages) {
      if (!msg.is_ai) {
        const themeMatch = msg.content.match(/theme[:\s]*([a-z0-9\s]+)/i);
        if (themeMatch) {
          theme = themeMatch[1].trim();
        }
      }
    }
    
    return createCustomMystery(theme);
  }
};
