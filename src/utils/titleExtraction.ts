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

  // Primary pattern: # TITLE (most reliable - this is how Claude formats titles)
  const headerTitlePattern = /^#\s+(?:\*\*)?([A-Z][A-Za-z0-9\s:'\-']+?)(?:\*\*)?$/m;

  // Secondary patterns (fallbacks)
  const titleLabelPattern = /title:\s*["']?([^"'\n]+)["']?/i;
  const boldTitlePattern = /\*\*([A-Z][A-Za-z0-9\s:'\-']+?)\*\*/;

  // FIRST PASS: Look for # headers only (most reliable indicator of actual title)
  for (const message of filteredMessages) {
    if (message.role === 'assistant' || message.is_ai) {
      const content = message.content || '';

      const headerMatch = content.match(headerTitlePattern);
      if (headerMatch && headerMatch[1] && headerMatch[1].trim()) {
        const title = headerMatch[1].trim();
        // Validate it looks like a title (not a section header like "Questions" or "Character 1")
        if (!isLikelySectionHeader(title)) {
          return formatTitle(title);
        }
      }
    }
  }

  // SECOND PASS: Look for "Title:" label pattern
  for (const message of filteredMessages) {
    if (message.role === 'assistant' || message.is_ai) {
      const content = message.content || '';

      const titleMatch = content.match(titleLabelPattern);
      if (titleMatch && titleMatch[1] && titleMatch[1].trim()) {
        const title = titleMatch[1].trim();
        if (!isLikelySectionHeader(title)) {
          return formatTitle(title);
        }
      }
    }
  }

  // THIRD PASS: Look for bold text that looks like a title (usually early in message)
  for (const message of filteredMessages) {
    if (message.role === 'assistant' || message.is_ai) {
      const content = message.content || '';

      // Only check first 500 chars to avoid grabbing random bold text
      const firstPart = content.substring(0, 500);
      const boldMatch = firstPart.match(boldTitlePattern);
      if (boldMatch && boldMatch[1] && boldMatch[1].trim()) {
        const title = boldMatch[1].trim();
        if (!isLikelySectionHeader(title) && looksLikeTitle(title)) {
          return formatTitle(title);
        }
      }
    }
  }

  return null;
};

// Check if text is likely a section header rather than a mystery title
const isLikelySectionHeader = (text: string): boolean => {
  const sectionHeaders = [
    'questions', 'character', 'background', 'round', 'evidence',
    'clues', 'motives', 'relationships', 'introduction', 'overview',
    'instructions', 'setup', 'premise', 'victim', 'suspect', 'detective',
    'for example', 'example'
  ];
  const lower = text.toLowerCase();
  return sectionHeaders.some(header => lower.startsWith(header) || lower === header);
};

// Check if text looks like a mystery title
const looksLikeTitle = (text: string): boolean => {
  // Titles usually have multiple words and contain murder/mystery/death keywords
  // Or are formatted like "The Something Something"
  const words = text.split(/\s+/);
  if (words.length < 2 || words.length > 10) return false;

  const lower = text.toLowerCase();
  const titleKeywords = ['murder', 'mystery', 'death', 'deadly', 'blood', 'killer', 'crime'];
  const startsWithThe = lower.startsWith('the ') || lower.startsWith('a ');

  return titleKeywords.some(kw => lower.includes(kw)) || startsWithThe;
};

export const formatTitle = (title: string) => {
  // First strip markdown bold markers
  const cleanTitle = title.replace(/\*\*/g, '');
  return cleanTitle
    .trim()
    .split(' ')
    .map(word => {
      // Handle words with apostrophes - don't capitalize after apostrophes
      if (word.includes("'") || word.includes("'")) {
        const parts = word.split(/([''])/);
        return parts.map((part, index) => {
          if (index === 0) {
            return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
          } else if (part === "'" || part === "'") {
            return part;
          } else {
            return part.toLowerCase();
          }
        }).join('');
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(' ');
};
