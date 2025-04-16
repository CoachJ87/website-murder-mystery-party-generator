import { useState, useEffect } from "react";
// ... other imports

const MysteryChat = ({ /* props */ }) => {
  // ... existing component code

  // Function to format the assistant's response
  const formatMysteryResponse = (content) => {
    // Remove any $2 markers
    content = content.replace(/\$2|\*\*\$2\*\*/g, '');
    
    // Extract the different sections using regex
    const titleMatch = content.match(/(?:\*\*|# ")([^*"]+)(?:\*\*|")/);
    const title = titleMatch ? titleMatch[1] : "Mystery Title";
    
    // Find premise section - look for various possible headers
    let premiseMatch = content.match(/## PREMISE[^#]*(?=##|$)/i);
    if (!premiseMatch) {
      premiseMatch = content.match(/## THE PREMISE[^#]*(?=##|$)/i);
    }
    if (!premiseMatch) {
      // Try to find a paragraph that could be the premise
      const paragraphs = content.split('\n\n');
      const potentialPremise = paragraphs.find(p => 
        !p.startsWith('#') && p.length > 100 && 
        !p.includes('**') && !p.includes('Would this')
      );
      premiseMatch = potentialPremise ? [potentialPremise] : null;
    }
    const premise = premiseMatch ? premiseMatch[0].replace(/## PREMISE|## THE PREMISE/i, '').trim() : "";
    
    // Find victim section
    let victimMatch = content.match(/## VICTIM[^#]*(?=##|$)/i);
    if (!victimMatch) {
      victimMatch = content.match(/## THE VICTIM[^#]*(?=##|$)/i);
    }
    if (!victimMatch) {
      victimMatch = content.match(/## MURDER VICTIM[^#]*(?=##|$)/i);
    }
    const victim = victimMatch ? victimMatch[0].replace(/## VICTIM|## THE VICTIM|## MURDER VICTIM/i, '').trim() : "";
    
    // Find murder method section
    let methodMatch = content.match(/## MURDER METHOD[^#]*(?=##|$)/i);
    if (!methodMatch) {
      methodMatch = content.match(/## THE MURDER[^#]*(?=##|$)/i);
    }
    const method = methodMatch ? methodMatch[0].replace(/## MURDER METHOD|## THE MURDER/i, '').trim() : "";
    
    // Find character list section
    let characterListMatch = content.match(/## CHARACTER LIST[^#]*(?=##|Would this|$)/i);
    if (!characterListMatch) {
      characterListMatch = content.match(/## THE CHARACTERS[^#]*(?=##|Would this|$)/i);
    }
    if (!characterListMatch) {
      characterListMatch = content.match(/## CHARACTERS[^#]*(?=##|Would this|$)/i);
    }
    
    // Parse and format characters
    let characters = [];
    if (characterListMatch) {
      const characterSection = characterListMatch[0].replace(/## CHARACTER LIST|## THE CHARACTERS|## CHARACTERS/i, '').trim();
      
      // Find character entries by looking for patterns like "**Name**" or "Name -"
      const characterEntries = characterSection.match(/\*\*[^*]+\*\*[^\n]+/g) || 
                             characterSection.match(/[^\n:]+(-|–)[^\n]+/g) || [];
      
      characters = characterEntries.map((entry, i) => {
        // Clean up entry by removing any existing numbers
        entry = entry.replace(/^\d+\.?\s+/, '');
        return entry;
      });
    }
    
    // Return structured content
    return {
      title,
      premise,
      victim,
      method,
      characters
    };
  };

  // Render the latest assistant message in a structured format
  const renderStructuredMystery = () => {
    const latestAssistantMessage = messages
      .filter(msg => msg.role === "assistant")
      .pop();
    
    if (!latestAssistantMessage) return null;
    
    const { title, premise, victim, method, characters } = formatMysteryResponse(latestAssistantMessage.content);
    
    return (
      <div className="mystery-preview">
        <h1 className="text-2xl font-bold text-center mb-4">"{title}" - A MURDER MYSTERY</h1>
        
        <section className="mb-4">
          <h2 className="text-xl font-semibold mb-2">PREMISE</h2>
          <p>{premise}</p>
        </section>
        
        <section className="mb-4">
          <h2 className="text-xl font-semibold mb-2">VICTIM</h2>
          <div dangerouslySetInnerHTML={{ __html: victim }} />
        </section>
        
        <section className="mb-4">
          <h2 className="text-xl font-semibold mb-2">MURDER METHOD</h2>
          <p>{method}</p>
        </section>
        
        <section className="mb-4">
          <h2 className="text-xl font-semibold mb-2">CHARACTER LIST ({characters.length} PLAYERS)</h2>
          <ol className="list-decimal pl-5">
            {characters.map((character, index) => (
              <li key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: character }} />
            ))}
          </ol>
        </section>
        
        <p className="mt-6">
          Would this murder mystery concept work for your event? You can continue to make edits, 
          and once you're satisfied, press the 'Generate Mystery' button to create a complete 
          game package with detailed character guides, host instructions, and all the game 
          materials you'll need if you choose to purchase the full version!
        </p>
      </div>
    );
  };

  // Use this in your component's render method
  return (
    <div className="flex flex-col h-full">
      {/* ... existing component JSX */}
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-background/50 min-h-[400px] max-h-[500px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>Start creating your murder mystery by sending your first message.</p>
          </div>
        ) : (
          <>
            {/* Show user messages normally */}
            {messages.filter(m => m.role === "user").map((message) => (
              <Card key={message.id} className="max-w-[80%] ml-auto bg-primary text-primary-foreground">
                <CardContent className="p-4">
                  <p>{message.content}</p>
                  <div className="text-xs opacity-70 mt-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {/* Render the latest assistant message in structured format */}
            {renderStructuredMystery()}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* ... rest of component JSX */}
    </div>
  );
};

export default MysteryChat;
