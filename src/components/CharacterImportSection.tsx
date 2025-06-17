
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserRound, FileText, UserX, RefreshCw } from "lucide-react";
import { MysteryCharacter } from "@/interfaces/mystery";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import ImportCharactersDialog from "./ImportCharactersDialog";

interface CharacterImportSectionProps {
  packageId: string;
  refreshTrigger?: number;
}

const CharacterImportSection: React.FC<CharacterImportSectionProps> = ({ 
  packageId,
  refreshTrigger = 0
}) => {
  const { t } = useTranslation();
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
        toast.error(t('character.import.toasts.loadError'));
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
      toast.success(t('character.import.toasts.refreshSuccess'));
    } catch (error) {
      console.error('Error refreshing characters:', error);
      toast.error(t('character.import.toasts.refreshError'));
    } finally {
      setLoading(false);
    }
  };
  
  const handleImportComplete = () => {
    refreshCharacters();
  };
  
  const handleDeleteCharacter = async (characterId: string, characterName: string) => {
    if (!window.confirm(t('character.import.deleteConfirm', { name: characterName }))) {
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
      toast.success(t('character.import.toasts.deleteSuccess', { name: characterName }));
    } catch (error) {
      console.error('Error deleting character:', error);
      toast.error(t('character.import.toasts.deleteError'));
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>{t('character.import.title')}</CardTitle>
            <CardDescription>{t('character.import.description')}</CardDescription>
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
            <p className="mt-2 text-muted-foreground">{t('character.import.loading')}</p>
          </div>
        ) : characters.length === 0 ? (
          <div className="text-center py-12 border rounded-md bg-muted/30">
            <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium mb-1">{t('character.import.noCharacters')}</h3>
            <p className="text-muted-foreground mb-4">
              {t('character.import.importPrompt')}
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
                  <TableHead>{t('character.import.table.headers.characterName')}</TableHead>
                  <TableHead>{t('character.import.table.headers.details')}</TableHead>
                  <TableHead>{t('character.import.table.headers.scripts')}</TableHead>
                  <TableHead className="w-[100px]">{t('character.import.table.headers.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {characters.map((character) => (
                  <TableRow key={character.id}>
                    <TableCell className="font-medium">{character.character_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {character.description && <Badge variant="outline">{t('character.import.table.badges.description')}</Badge>}
                        {character.background && <Badge variant="outline">{t('character.import.table.badges.background')}</Badge>}
                        {character.relationships?.length > 0 && <Badge variant="outline">{t('character.import.table.badges.relationships')}</Badge>}
                        {character.secrets?.length > 0 && <Badge variant="outline">{t('character.import.table.badges.secrets')}</Badge>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {character.introduction && <Badge variant="secondary">{t('character.import.table.badges.intro')}</Badge>}
                        {character.round1_statement && <Badge variant="secondary">{t('character.import.table.badges.round1')}</Badge>}
                        {character.round2_statement && <Badge variant="secondary">{t('character.import.table.badges.round2')}</Badge>}
                        {character.round3_statement && <Badge variant="secondary">{t('character.import.table.badges.round3')}</Badge>}
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
                            toast.info(t('character.import.toasts.viewing', { name: character.character_name }));
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
