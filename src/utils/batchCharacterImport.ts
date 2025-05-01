
import { toast } from "sonner";
import { processAndSaveCharacter } from "@/services/characterService";
import { supabase } from "@/lib/supabase";

/**
 * Import multiple characters from raw text content
 */
export async function importCharactersFromText(packageId: string, text: string): Promise<string[]> {
  // Split the text by character guide headers
  const characterTexts = text.split(/([A-Z][A-Z\s]+[A-Z])\s*-\s*CHARACTER GUIDE/);
  
  if (characterTexts.length <= 1) {
    toast.error("No character guides found in the provided text");
    return [];
  }
  
  const successfulImports: string[] = [];
  
  // Process character chunks (skip first element as it's before first header)
  for (let i = 1; i < characterTexts.length; i += 2) {
    if (i + 1 >= characterTexts.length) break;
    
    const characterName = characterTexts[i].trim();
    const characterContent = `${characterName} - CHARACTER GUIDE\n${characterTexts[i+1]}`;
    
    try {
      const characterId = await processAndSaveCharacter(packageId, characterContent);
      if (characterId) {
        successfulImports.push(characterId);
        toast.success(`Imported character: ${characterName}`);
      }
    } catch (error) {
      console.error(`Error importing character ${characterName}:`, error);
      toast.error(`Failed to import character: ${characterName}`);
    }
  }
  
  return successfulImports;
}

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
