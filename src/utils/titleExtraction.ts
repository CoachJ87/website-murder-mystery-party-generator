
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
  
  const titlePattern = /#\s*["']?([^"'\n#]+)["']?(?:\s*-\s*A MURDER MYSTERY)?/i;
  const alternativeTitlePattern = /title:\s*["']?([^"'\n]+)["']?/i;
  const quotedTitlePattern = /"([^"]+)"\s*(?:-\s*A\s+MURDER\s+MYSTERY)?/i;
  
  for (const message of filteredMessages) {
    if (message.role === 'assistant' || message.is_ai) {
      const content = message.content || '';
      
      const titleMatch = content.match(titlePattern);
      if (titleMatch && titleMatch[1]) {
        return formatTitle(titleMatch[1]);
      }
      
      const quotedMatch = content.match(quotedTitlePattern);
      if (quotedMatch && quotedMatch[1]) {
        return formatTitle(quotedMatch[1]);
      }
      
      const altMatch = content.match(alternativeTitlePattern);
      if (altMatch && altMatch[1]) {
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
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};
