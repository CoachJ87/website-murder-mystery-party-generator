
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Crown, RefreshCw } from "lucide-react";
import { MysteryCharacter } from "@/interfaces/mystery";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface CharacterRoleSelectorProps {
  packageId: string;
  refreshTrigger?: number;
}

const CharacterRoleSelector: React.FC<CharacterRoleSelectorProps> = ({
  packageId,
  refreshTrigger = 0
}) => {
  const [characters, setCharacters] = useState<MysteryCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [murderer, setMurderer] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Fetch characters and current role assignments
  useEffect(() => {
    const fetchData = async () => {
      if (!packageId) return;
      
      setLoading(true);
      try {
        // Fetch characters
        const { data: charactersData, error: charactersError } = await supabase
          .from('mystery_characters')
          .select('*')
          .eq('package_id', packageId)
          .order('character_name');
        
        if (charactersError) throw charactersError;
        
        setCharacters(charactersData || []);
        
        // Fetch package data to get role assignments
        const { data: packageData, error: packageError } = await supabase
          .from('mystery_packages')
          .select('partial_content')
          .eq('id', packageId)
          .single();
          
        if (packageError) {
          console.warn('Could not fetch package data:', packageError);
        } else if (packageData?.partial_content) {
          const roles = packageData.partial_content.roles || {};
          setMurderer(roles.murderer || null);
        }
      } catch (error) {
        console.error('Error fetching data:', error);
        toast.error('Failed to load character data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [packageId, refreshTrigger]);
  
  const handleSaveRoles = async () => {
    if (!packageId) return;
    
    setIsSaving(true);
    try {
      const { data, error } = await supabase
        .from('mystery_packages')
        .update({
          partial_content: {
            roles: {
              murderer
            }
          }
        })
        .eq('id', packageId);
      
      if (error) throw error;
      
      toast.success('Character roles saved successfully');
    } catch (error) {
      console.error('Error saving roles:', error);
      toast.error('Failed to save character roles');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Character Roles</CardTitle>
        <CardDescription>Assign the murderer role for your mystery</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="text-center py-6">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Loading characters...</p>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Crown className="h-4 w-4 text-red-500" />
              <span>Murderer</span>
              <Badge variant="outline" className="ml-1 font-normal">Required</Badge>
            </label>
            <Select value={murderer || "none"} onValueChange={setMurderer}>
              <SelectTrigger>
                <SelectValue placeholder="Select the murderer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None selected</SelectItem>
                {characters.map(character => (
                  <SelectItem 
                    key={character.id} 
                    value={character.id}
                  >
                    {character.character_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="text-xs text-muted-foreground mt-1 pl-6">
              The character who committed the murder
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button 
          onClick={handleSaveRoles} 
          disabled={loading || isSaving || !murderer}
          className="ml-auto"
        >
          {isSaving ? (
            <>
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : "Save Roles"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default CharacterRoleSelector;
