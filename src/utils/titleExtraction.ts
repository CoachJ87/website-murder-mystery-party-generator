export const extractTitleFromMessages = (messages: any[]) => {
  if (!messages || messages.length === 0) return null;
  
  const filteredMessages = messages.filter(message => {
    const content = (message.content || "").toLowerCase();
    return !(
      content.includes("initial questions") || 
      content.includes("clarification") || 
      content.includes("# questions") || 
      content.includes("## questions")
    );
  });
  
  // Updated regex patterns to better capture titles with apostrophes and special characters
  const titlePattern = /#\s*["']?([^"'\n#]*(?:[''][^"'\n#]*)*)["']?(?:\s*-\s*A\s+MURDER\s+MYSTERY)?/i;
  const alternativeTitlePattern = /title:\s*["']?([^"'\n]*(?:[''][^"'\n]*)*)["']?/i;
  const quotedTitlePattern = /"([^"]*(?:[''][^"]*)*)"\s*(?:-\s*A\s+MURDER\s+MYSTERY)?/i;
  
  for (const message of filteredMessages) {
    if (message.role === 'assistant' || message.is_ai) {
      const content = message.content || '';
      
      const titleMatch = content.match(titlePattern);
      if (titleMatch && titleMatch[1] && titleMatch[1].trim()) {
        return formatTitle(titleMatch[1]);
      }
      
      const quotedMatch = content.match(quotedTitlePattern);
      if (quotedMatch && quotedMatch[1] && quotedMatch[1].trim()) {
        return formatTitle(quotedMatch[1]);
      }
      
      const altMatch = content.match(alternativeTitlePattern);
      if (altMatch && altMatch[1] && altMatch[1].trim()) {
        return formatTitle(altMatch[1]);
      }
    }
  }
  
  return null;
};

export const formatTitle = (title: string) => {
  return title
    .trim()
    .split(' ')
    .map(word => {
      // Handle words with apostrophes - don't capitalize after apostrophes
      if (word.includes("'") || word.includes("'")) {
        // Split by apostrophe, capitalize first part, keep rest as is for contractions
        const parts = word.split(/([''])/);
        return parts.map((part, index) => {
          if (index === 0) {
            // Capitalize first part
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          } else if (part === "'" || part === "'") {
            // Keep apostrophe as is
            return part;
          } else {
            // Don't capitalize after apostrophe for contractions like "s", "t", "re"
            return part.toLowerCase();
          }
        }).join('');
      }
      // Regular word capitalization
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};
