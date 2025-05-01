
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRound, FileText, UserX, RefreshCw } from "lucide-react";
import { MysteryCharacter } from "@/interfaces/mystery";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import ImportCharactersDialog from "./ImportCharactersDialog";

interface CharacterImportSectionProps {
  packageId: string;
  refreshTrigger?: number;
}

const CharacterImportSection: React.FC<CharacterImportSectionProps> = ({ 
  packageId,
  refreshTrigger = 0
}) => {
  const [characters, setCharacters] = useState<MysteryCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  
  // Fetch characters
  React.useEffect(() => {
    const fetchCharacters = async () => {
      if (!packageId) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('mystery_characters')
          .select('*')
          .eq('package_id', packageId)
          .order('character_name');
        
        if (error) {
          throw error;
        }
        
        setCharacters(data || []);
      } catch (error) {
        console.error('Error fetching characters:', error);
        toast.error('Failed to load character data');
      } finally {
        setLoading(false);
      }
    };
    
    fetchCharacters();
  }, [packageId, refreshTrigger]);
  
  const refreshCharacters = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('mystery_characters')
        .select('*')
        .eq('package_id', packageId)
        .order('character_name');
      
      if (error) {
        throw error;
      }
      
      setCharacters(data || []);
      toast.success('Character list refreshed');
    } catch (error) {
      console.error('Error refreshing characters:', error);
      toast.error('Failed to refresh character data');
    } finally {
      setLoading(false);
    }
  };
  
  const handleImportComplete = () => {
    refreshCharacters();
  };
  
  const handleDeleteCharacter = async (characterId: string, characterName: string) => {
    if (!window.confirm(`Are you sure you want to delete ${characterName}?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('mystery_characters')
        .delete()
        .eq('id', characterId);
      
      if (error) {
        throw error;
      }
      
      setCharacters(characters.filter(c => c.id !== characterId));
      toast.success(`Deleted character: ${characterName}`);
    } catch (error) {
      console.error('Error deleting character:', error);
      toast.error('Failed to delete character');
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Mystery Characters</CardTitle>
            <CardDescription>Manage the characters in your murder mystery</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={refreshCharacters}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </Button>
            <Button 
              onClick={() => setImportDialogOpen(true)}
              size="sm"
              className="flex items-center gap-2"
            >
              <UserRound className="h-4 w-4" />
              <span>Import Characters</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
            <p className="mt-2 text-muted-foreground">Loading characters...</p>
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center py-12 border rounded-md bg-muted/30">
            <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">No characters yet</h3>
            <p className="text-muted-foreground mb-4">
              Import character data to populate your murder mystery.
            </p>
            <Button 
              onClick={() => setImportDialogOpen(true)}
              className="flex items-center gap-2"
            >
              <UserRound className="h-4 w-4" />
              <span>Import Characters</span>
            </Button>
          </div>
        ) : (
          <div className="border rounded-md overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Character Name</TableHead>
                  <TableHead>Details</TableHead>
                  <TableHead>Scripts</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {characters.map((character) => (
                  <TableRow key={character.id}>
                    <TableCell className="font-medium">{character.character_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {character.description && <Badge variant="outline">Description</Badge>}
                        {character.background && <Badge variant="outline">Background</Badge>}
                        {character.relationships?.length > 0 && <Badge variant="outline">Relationships</Badge>}
                        {character.secrets?.length > 0 && <Badge variant="outline">Secrets</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {character.introduction && <Badge variant="secondary">Intro</Badge>}
                        {character.round1_statement && <Badge variant="secondary">Round 1</Badge>}
                        {character.round2_statement && <Badge variant="secondary">Round 2</Badge>}
                        {character.round3_statement && <Badge variant="secondary">Round 3</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => {
                            // View character details (can implement later)
                            toast.info(`Viewing ${character.character_name}`);
                          }}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteCharacter(character.id, character.character_name)}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t pt-4 pb-2">
        <p className="text-xs text-muted-foreground">
          {characters.length} characters found in database
        </p>
      </CardFooter>
      
      <ImportCharactersDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        packageId={packageId}
        onImportComplete={handleImportComplete}
      />
    </Card>
  );
};

export default CharacterImportSection;
