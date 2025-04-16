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
    console.log(`Sending ${messages.length} messages`);
    
    // Set a timeout to avoid hanging if there's an issue
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Request timed out")), 30000)
    );
    
    // Format messages for API
    const formattedMessages = messages.map(msg => ({
      role: msg.is_ai ? "assistant" : "user",
      content: msg.content
    }));
    
    // Your Vercel deployed URL
    const apiUrl = 'https://website-murder-mystery-party-generator.vercel.app/api/proxy-with-prompts';
    
    // Prepare the request with messages and prompt version
    const requestBody = {
      messages: formattedMessages,
      promptVersion: promptVersion
    };
    
    console.log("Request payload:", JSON.stringify(requestBody));
    
    try {
      // Make the API request
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`API error: ${response.status} - ${errorText}`);
        // Return mock response if API fails
        return generateMockResponse(messages, promptVersion);
      }
      
      const data = await response.json();
      console.log("API response received:", data ? "success" : "empty");
      
      if (!data || data.error) {
        console.error("Error in API response:", data?.error || "Unknown error");
        return generateMockResponse(messages, promptVersion);
      }
      
      // Extract the response content
      if (data && data.content && data.content.length > 0 && data.content[0].type === 'text') {
        let text = data.content[0].text;
        // Ensure proper markdown formatting
        return formatResponseText(text, messages);
      }
      
      console.error("Invalid response format:", data);
      return generateMockResponse(messages, promptVersion);
    } catch (error) {
      console.error("API request error:", error);
      return generateMockResponse(messages, promptVersion);
    }
  } catch (error) {
    console.error("Error in getAIResponse:", error);
    return generateMockResponse(messages, promptVersion);
  }
};

// Function to format response text
function formatResponseText(text: string, messages: Message[]): string {
  // Extract theme from user messages
  let theme = extractThemeFromMessages(messages);
  
  // Remove any $2 markers
  text = text.replace(/\$2|\*\*\$2\*\*/g, '');
  
  // If we got the default response for a non-default theme, use a custom one
  if (text.includes("SHADOWS AT THE PREMIERE") && theme.toLowerCase() !== "hollywood") {
    return createCustomMystery(theme);
  }
  
  // Ensure proper markdown formatting
  if (!text.startsWith('# "')) {
    // Try to extract a title
    const titleMatch = text.match(/\*\*([^*]+)\*\*/);
    const title = titleMatch ? titleMatch[1].toUpperCase() : theme.toUpperCase();
    text = `# "${title}" - A ${theme.toUpperCase()} MURDER MYSTERY\n\n` + text;
  }
  
  // Ensure headers are properly formatted
  text = text.replace(/^PREMISE\n/mi, "## PREMISE\n");
  text = text.replace(/^VICTIM\n/mi, "## VICTIM\n");
  text = text.replace(/^MURDER METHOD\n/mi, "## MURDER METHOD\n");
  text = text.replace(/^CHARACTER LIST/mi, "## CHARACTER LIST");
  
  // Ensure characters are properly numbered
  if (text.includes("CHARACTER LIST")) {
    const parts = text.split(/## CHARACTER LIST[^#]*/i);
    if (parts.length > 1) {
      const beforeList = parts[0];
      let characterList = text.match(/## CHARACTER LIST[^#]*/i)?.[0] || "";
      const afterList = parts.slice(1).join("");
      
      // Replace * with numbered list
      let characterLines = characterList.split('\n');
      let numberedList = characterLines[0] + '\n'; // Keep the header
      
      let counter = 1;
      for (let i = 1; i < characterLines.length; i++) {
        const line = characterLines[i];
        if (line.trim().startsWith('*') || line.trim().startsWith('1.')) {
          numberedList += line.replace(/^[\s*\d.]+/, `${counter}. `) + '\n';
          counter++;
        } else if (line.trim()) {
          numberedList += line + '\n';
        }
      }
      
      text = beforeList + numberedList + afterList;
    }
  }
  
  // Ensure the closing text is present
  if (!text.includes("Would this murder mystery concept work for your event?")) {
    text += "\n\nWould this murder mystery concept work for your event? You can continue to make edits, and once you're satisfied, press the 'Generate Mystery' button to create a complete game package with detailed character guides, host instructions, and all the game materials you'll need if you choose to purchase the full version!";
  }
  
  return text;
}

// Extract theme from messages
function extractThemeFromMessages(messages: Message[]): string {
  for (const msg of messages) {
    if (!msg.is_ai) {
      // Look for theme in message content
      const themeMatch = msg.content.match(/theme[:\s]*([a-z0-9\s]+)/i) ||
                         msg.content.match(/with a ([a-z0-9\s]+) theme/i);
      if (themeMatch) {
        return themeMatch[1].trim();
      }
    }
  }
  return "Mystery";
}

// Create custom murder mystery
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

// Generate mock response
const generateMockResponse = (messages: Message[], promptVersion: 'free' | 'paid'): string => {
  if (promptVersion === 'paid') {
    return `Unable to connect to the AI. Your full mystery package will be generated when the connection is restored.`;
  } else {
    const theme = extractThemeFromMessages(messages);
    return createCustomMystery(theme);
  }
};
