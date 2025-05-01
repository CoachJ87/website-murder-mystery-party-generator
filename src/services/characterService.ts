
import { supabase } from "@/lib/supabase";
import { MysteryCharacter } from "@/interfaces/mystery";
import { toast } from "sonner";

// Parse a character script section from raw text
export function parseCharacterSection(text: string, sectionName: string): string | null {
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

// Parse questioning options from text
export function parseQuestioningOptions(text: string): { target: string, question: string }[] {
  const options: { target: string, question: string }[] = [];
  
  // Look for patterns like "Ask Character: "Question text"" or similar formats
  const askRegex = /Ask\s+([^:]+):\s*[""]([^""]+)[""]/gi;
  let match;
  
  while ((match = askRegex.exec(text)) !== null) {
    options.push({
      target: match[1].trim(),
      question: match[2].trim()
    });
  }
  
  return options;
}

// Extract full character information from text
export function extractCharacterInfo(text: string): Partial<MysteryCharacter> {
  const character: Partial<MysteryCharacter> = {};
  
  // Extract name from possible header formats
  const nameMatch = text.match(/([A-Z][A-Z\s]+[A-Z])\s*-\s*CHARACTER GUIDE/i);
  if (nameMatch) {
    character.character_name = nameMatch[1].trim();
  }
  
  // Extract sections
  character.description = parseCharacterSection(text, "CHARACTER DESCRIPTION");
  character.background = parseCharacterSection(text, "YOUR BACKGROUND");
  character.whereabouts = parseCharacterSection(text, "YOUR WHEREABOUTS");
  character.introduction = parseCharacterSection(text, "YOUR INTRODUCTION");
  character.round1_statement = parseCharacterSection(text, "ROUND 1");
  character.round2_statement = parseCharacterSection(text, "ROUND 2");
  character.round3_statement = parseCharacterSection(text, "ROUND 3");
  
  // Extract relationships
  const relationshipsText = parseCharacterSection(text, "YOUR RELATIONSHIPS");
  if (relationshipsText) {
    const relationshipLines = relationshipsText.split('\n').filter(line => line.trim());
    character.relationships = relationshipLines.map(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        return {
          character: line.substring(0, colonIndex).trim(),
          description: line.substring(colonIndex + 1).trim()
        };
      }
      return { character: line, description: '' };
    });
  }
  
  // Extract secrets
  const secretsText = parseCharacterSection(text, "YOUR SECRETS");
  if (secretsText) {
    const secretLines = secretsText.split('\n').filter(line => line.trim());
    character.secrets = secretLines.map(line => line.trim());
  }
  
  // Extract questioning options
  const round1Text = parseCharacterSection(text, "CHOOSE SOMEONE TO QUESTION");
  if (round1Text) {
    character.questioning_options = parseQuestioningOptions(round1Text);
  }
  
  return character;
}

// Save a character to the database
export async function saveCharacterInfo(
  packageId: string,
  character: Partial<MysteryCharacter>
): Promise<string | null> {
  try {
    // Ensure we have a character name
    if (!character.character_name) {
      toast.error("Character must have a name");
      return null;
    }
    
    const { data, error } = await supabase
      .from('mystery_characters')
      .insert({
        package_id: packageId,
        character_name: character.character_name,
        description: character.description || null,
        background: character.background || null,
        relationships: Array.isArray(character.relationships) ? character.relationships : [],
        secrets: Array.isArray(character.secrets) ? character.secrets : [],
        introduction: character.introduction || null,
        whereabouts: character.whereabouts || null,
        round1_statement: character.round1_statement || null,
        round2_statement: character.round2_statement || null,
        round3_statement: character.round3_statement || null,
        questioning_options: character.questioning_options || []
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error saving character:', error);
      toast.error(`Failed to save character: ${error.message}`);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Error saving character:', error);
    toast.error('Failed to save character due to an unexpected error');
    return null;
  }
}

// Get a character by ID
export async function getCharacterById(id: string): Promise<MysteryCharacter | null> {
  try {
    const { data, error } = await supabase
      .from('mystery_characters')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      console.error('Error fetching character:', error);
      return null;
    }
    
    return data as MysteryCharacter;
  } catch (error) {
    console.error('Error fetching character:', error);
    return null;
  }
}

// Process and save raw character text
export async function processAndSaveCharacter(
  packageId: string, 
  characterText: string
): Promise<string | null> {
  try {
    const characterInfo = extractCharacterInfo(characterText);
    
    if (!characterInfo.character_name) {
      // Try to extract name from first line if header parsing failed
      const firstLine = characterText.split('\n')[0].trim();
      if (firstLine) {
        characterInfo.character_name = firstLine.split('-')[0].trim();
      }
      
      if (!characterInfo.character_name) {
        toast.error("Could not determine character name from text");
        return null;
      }
    }
    
    return await saveCharacterInfo(packageId, characterInfo);
  } catch (error) {
    console.error('Error processing character text:', error);
    toast.error('Failed to process character text');
    return null;
  }
}
