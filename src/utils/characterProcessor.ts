
import { MysteryCharacter } from "@/interfaces/mystery";

// Parse a character script section from raw text
export function parseCharacterSection(text: string, sectionName: string): string | null {
  if (!text) return null;
  
  // Handle both uppercase and proper case section headers
  const sectionRegex = new RegExp(`(${sectionName.toUpperCase()}|${sectionName})\\s*[:]{0,1}\\s*\\n`, 'i');
  const match = text.match(sectionRegex);
  
  if (!match) return null;
  
  const startIndex = match.index! + match[0].length;
  
  // Find the next section heading or end of string
  const nextSectionRegex = /\n\s*[A-Z][A-Z\s]+[A-Z][:]{0,1}\s*\n/;
  const nextMatch = text.slice(startIndex).match(nextSectionRegex);
  
  const endIndex = nextMatch ? startIndex + nextMatch.index! : text.length;
  
  return text.slice(startIndex, endIndex).trim();
}

// Extract relationships from relationship text
export function extractRelationships(text: string | null): { character: string, description: string }[] {
  if (!text) return [];
  
  const relationships: { character: string, description: string }[] = [];
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  for (const line of lines) {
    // Look for pattern like "Person Name: Description"
    // Also handle different format patterns
    const colonMatch = line.match(/^([^:]+):\s*(.+)$/);
    const dashMatch = line.match(/^([^-]+)-\s*(.+)$/);
    const parenthesisMatch = line.match(/^([^(]+)\s*\(([^)]+)\):\s*(.+)$/);
    
    if (parenthesisMatch) {
      // Format: "Person Name (Role): Description"
      relationships.push({
        character: `${parenthesisMatch[1].trim()} (${parenthesisMatch[2].trim()})`,
        description: parenthesisMatch[3].trim()
      });
    } else if (colonMatch) {
      // Format: "Person: Description"
      relationships.push({
        character: colonMatch[1].trim(),
        description: colonMatch[2].trim()
      });
    } else if (dashMatch) {
      // Format: "Person - Description"
      relationships.push({
        character: dashMatch[1].trim(),
        description: dashMatch[2].trim()
      });
    } else if (line.trim()) {
      // Just add the line as character name if we can't parse it
      relationships.push({
        character: line.trim(),
        description: ""
      });
    }
  }
  
  return relationships;
}

// Extract secrets from secrets text
export function extractSecrets(text: string | null): string[] {
  if (!text) return [];
  
  // Split by lines and filter empty lines
  let lines = text.split('\n').filter(line => line.trim().length > 0);
  
  // If only one line, try to split by periods or by "bullet" indicators
  if (lines.length === 1) {
    if (lines[0].includes('.')) {
      // Split by sentences if there's periods
      lines = lines[0]
        .split(/\.(?=\s|$)/)
        .map(s => s.trim())
        .filter(s => s.length > 0);
    } else if (lines[0].includes('•')) {
      // Split by bullets
      lines = lines[0]
        .split('•')
        .map(s => s.trim())
        .filter(s => s.length > 0);
    }
  }
  
  // Look for numbered list format: "1. Secret description"
  const numberedSecrets = lines.map(line => {
    const match = line.match(/^\d+\.\s*(.+)$/);
    return match ? match[1].trim() : line.trim();
  });
  
  return numberedSecrets;
}

// Parse questioning options from text
export function parseQuestioningOptions(text: string | null): { target: string, question: string }[] {
  if (!text) return [];
  
  const options: { target: string, question: string }[] = [];
  
  // Look for patterns like "Ask Character: "Question text"" or similar formats
  const askRegex = /Ask\s+([^:]+):\s*[""]([^""]+)[""]/gi;
  let match;
  
  if (text) {
    while ((match = askRegex.exec(text)) !== null) {
      options.push({
        target: match[1].trim(),
        question: match[2].trim()
      });
    }
  }
  
  return options;
}

// Extract character role-specific statements from text
export function extractRoleStatements(text: string | null): {
  innocent?: string;
  guilty?: string;
  accomplice?: string;
} {
  if (!text) return {};
  
  const result: { innocent?: string; guilty?: string; accomplice?: string } = {};
  
  // Look for section headers
  const innocentMatch = text.match(/IF YOU ARE INNOCENT:[\s\n]*(.+?)(?=(IF YOU ARE GUILTY|IF YOU ARE ACCOMPLICE|\Z))/is);
  const guiltyMatch = text.match(/IF YOU ARE GUILTY:[\s\n]*(.+?)(?=(IF YOU ARE INNOCENT|IF YOU ARE ACCOMPLICE|\Z))/is);
  const accompliceMatch = text.match(/IF YOU ARE ACCOMPLICE:[\s\n]*(.+?)(?=(IF YOU ARE INNOCENT|IF YOU ARE GUILTY|\Z))/is);
  
  if (innocentMatch) {
    result.innocent = innocentMatch[1].trim();
  }
  
  if (guiltyMatch) {
    result.guilty = guiltyMatch[1].trim();
  }
  
  if (accompliceMatch) {
    result.accomplice = accompliceMatch[1].trim();
  }
  
  return result;
}

// Extract full character information from text
export function processCharacterText(text: string): Partial<MysteryCharacter> {
  const character: Partial<MysteryCharacter> = {};
  
  // Extract name from header
  const nameMatch = text.match(/([A-Z][A-Z\s]+[A-Z])\s*-\s*CHARACTER GUIDE/i);
  if (nameMatch) {
    character.character_name = nameMatch[1].trim();
  }
  
  // Extract basic sections
  character.description = parseCharacterSection(text, "CHARACTER DESCRIPTION");
  character.background = parseCharacterSection(text, "YOUR BACKGROUND");
  character.whereabouts = parseCharacterSection(text, "YOUR WHEREABOUTS");
  
  // Extract relationships
  const relationshipsText = parseCharacterSection(text, "YOUR RELATIONSHIPS");
  if (relationshipsText) {
    character.relationships = extractRelationships(relationshipsText);
  }
  
  // Extract secrets
  const secretsText = parseCharacterSection(text, "YOUR SECRETS");
  if (secretsText) {
    character.secrets = extractSecrets(secretsText);
  }
  
  // Extract round statements
  character.introduction = parseCharacterSection(text, "YOUR INTRODUCTION");
  if (!character.introduction) {
    character.introduction = parseCharacterSection(text, "INTRODUCTION");
  }
  
  // Round 1
  character.round1_statement = parseCharacterSection(text, "ROUND 1");
  if (!character.round1_statement) {
    character.round1_statement = parseCharacterSection(text, "INITIAL INVESTIGATION");
  }
  
  // Get questioning options from round 1
  const questionText = parseCharacterSection(text, "CHOOSE SOMEONE TO QUESTION");
  if (questionText) {
    character.questioning_options = parseQuestioningOptions(questionText);
  }
  
  // Round 2
  character.round2_statement = parseCharacterSection(text, "ROUND 2");
  if (!character.round2_statement) {
    character.round2_statement = parseCharacterSection(text, "DEEPER REVELATIONS");
  }
  
  // Round 3
  character.round3_statement = parseCharacterSection(text, "ROUND 3");
  if (!character.round3_statement) {
    character.round3_statement = parseCharacterSection(text, "FINAL CLUES");
  }
  
  // Create round scripts with role variations
  const round_scripts: any = {};
  
  // Extract conditional responses for rounds
  const innocent_guilty_responses1 = parseCharacterSection(text, "YOUR RESPONSES WHEN QUESTIONED");
  if (innocent_guilty_responses1) {
    const roleResponses = extractRoleStatements(innocent_guilty_responses1);
    if (Object.keys(roleResponses).length > 0) {
      round_scripts.round1 = roleResponses;
    }
  }
  
  // Extract final statement
  const finalStatement = parseCharacterSection(text, "FINAL STATEMENT");
  if (finalStatement) {
    round_scripts.final = extractRoleStatements(finalStatement);
  }
  
  // Add round scripts if we found any
  if (Object.keys(round_scripts).length > 0) {
    character.round_scripts = round_scripts;
  }
  
  return character;
}

// Split multi-character text into individual character texts
export function splitCharacterTexts(text: string): string[] {
  // Split by character guide headers
  const characters = text.split(/([A-Z][A-Z\s]+[A-Z])\s*-\s*CHARACTER GUIDE/);
  
  // Process the split results (skip first element as it's before first header)
  const result: string[] = [];
  for (let i = 1; i < characters.length; i += 2) {
    if (i + 1 >= characters.length) break;
    
    const characterName = characters[i].trim();
    const characterContent = `${characterName} - CHARACTER GUIDE\n${characters[i+1]}`;
    result.push(characterContent);
  }
  
  return result;
}
