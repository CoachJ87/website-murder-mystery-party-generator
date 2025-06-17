
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { processCharacterText, splitCharacterTexts } from "./characterProcessor";
import { MysteryCharacter } from "@/interfaces/mystery";

/**
 * Check if a package already has characters
 */
export async function packageHasCharacters(packageId: string): Promise<boolean> {
  const { count, error } = await supabase
    .from('mystery_characters')
    .select('*', { count: 'exact', head: true })
    .eq('package_id', packageId);
    
  if (error) {
    console.error('Error checking for existing characters:', error);
    return false;
  }
  
  return (count || 0) > 0;
}

/**
 * Save a character to the database
 */
export async function saveCharacterToDatabase(
  packageId: string,
  characterData: Partial<MysteryCharacter>
): Promise<string | null> {
  try {
    if (!characterData.character_name) {
      console.error("Cannot save character without a name");
      return null;
    }
    
    console.log(`Saving character: ${characterData.character_name}`);
    
    const { data, error } = await supabase
      .from('mystery_characters')
      .insert({
        package_id: packageId,
        character_name: characterData.character_name,
        description: characterData.description || null,
        background: characterData.background || null,
        relationships: characterData.relationships || [],
        secrets: characterData.secrets || [],
        introduction: characterData.introduction || null,
        whereabouts: characterData.whereabouts || null,
        round1_statement: characterData.round1_statement || null,
        round2_statement: characterData.round2_statement || null,
        round3_statement: characterData.round3_statement || null,
        questioning_options: characterData.questioning_options || [],
        round_scripts: characterData.round_scripts || {}
      })
      .select('id')
      .single();
    
    if (error) {
      console.error('Error saving character:', error);
      return null;
    }
    
    return data.id;
  } catch (error) {
    console.error('Error in saveCharacterToDatabase:', error);
    return null;
  }
}

/**
 * Process and import multiple characters from raw text
 */
export async function importCharactersFromText(packageId: string, text: string): Promise<string[]> {
  const characterTexts = splitCharacterTexts(text);
  
  if (characterTexts.length === 0) {
    toast.error("No character guides found in the provided text");
    return [];
  }
  
  console.log(`Found ${characterTexts.length} characters to import`);
  const successfulImports: string[] = [];
  
  for (const charText of characterTexts) {
    try {
      const characterData = processCharacterText(charText);
      
      if (!characterData.character_name) {
        console.warn("Could not determine character name from text");
        continue;
      }
      
      const characterId = await saveCharacterToDatabase(packageId, characterData);
      if (characterId) {
        successfulImports.push(characterId);
        toast.success(`Imported character: ${characterData.character_name}`);
      } else {
        toast.error(`Failed to import character: ${characterData.character_name}`);
      }
    } catch (error) {
      console.error(`Error processing character text:`, error);
      toast.error("Failed to process a character");
    }
  }
  
  return successfulImports;
}

/**
 * Import character batch and update package status
 */
export async function importCharacterBatch(
  packageId: string, 
  characterText: string
): Promise<boolean> {
  try {
    // First check if this package already has characters
    const hasExisting = await packageHasCharacters(packageId);
    
    if (hasExisting) {
      const shouldReplace = window.confirm(
        'This mystery already has character data. Do you want to replace the existing characters?'
      );
      
      if (!shouldReplace) {
        return false;
      }
      
      // Delete existing characters
      const { error: deleteError } = await supabase
        .from('mystery_characters')
        .delete()
        .eq('package_id', packageId);
        
      if (deleteError) {
        console.error('Error deleting existing characters:', deleteError);
        toast.error('Failed to remove existing characters');
        return false;
      }
    }
    
    // Import new characters
    const importedIds = await importCharactersFromText(packageId, characterText);
    
    if (importedIds.length > 0) {
      // Update package generation status
      const { error: updateError } = await supabase
        .from('mystery_packages')
        .update({
          generation_status: {
            status: 'completed',
            progress: 100,
            currentStep: 'Character import completed',
            sections: {
              characters: true,
              hostGuide: true,
              clues: true
            }
          }
        })
        .eq('id', packageId);
        
      if (updateError) {
        console.error('Error updating package status:', updateError);
        toast.error('Characters imported but failed to update package status');
      } else {
        toast.success(`Successfully imported ${importedIds.length} characters`);
      }
      
      return true;
    } else {
      toast.error('No characters were successfully imported');
      return false;
    }
  } catch (error) {
    console.error('Error in batch character import:', error);
    toast.error('An unexpected error occurred during character import');
    return false;
  }
}
