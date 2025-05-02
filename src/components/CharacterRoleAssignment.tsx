
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { MysteryCharacter } from "@/interfaces/mystery";

interface CharacterRoleAssignmentProps {
  characters: MysteryCharacter[];
  onRoleAssign: (guiltyId: string | null, accompliceId: string | null) => void;
  hasAccomplice?: boolean;
}

const CharacterRoleAssignment: React.FC<CharacterRoleAssignmentProps> = ({
  characters,
  onRoleAssign,
  hasAccomplice = false
}) => {
  const [guiltyCharacterId, setGuiltyCharacterId] = useState<string | null>(null);
  const [accompliceCharacterId, setAccompliceCharacterId] = useState<string | null>(null);
  const [useAccomplice, setUseAccomplice] = useState(hasAccomplice);

  const handleGuiltyChange = (id: string) => {
    setGuiltyCharacterId(id);
    // If the guilty character is selected as accomplice, reset accomplice
    if (id === accompliceCharacterId) {
      setAccompliceCharacterId(null);
    }
    onRoleAssign(id, useAccomplice ? accompliceCharacterId : null);
  };

  const handleAccompliceChange = (id: string) => {
    setAccompliceCharacterId(id);
    onRoleAssign(guiltyCharacterId, id);
  };

  const handleToggleAccomplice = (checked: boolean) => {
    setUseAccomplice(checked);
    if (!checked) {
      setAccompliceCharacterId(null);
      onRoleAssign(guiltyCharacterId, null);
    } else {
      onRoleAssign(guiltyCharacterId, accompliceCharacterId);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assign Character Roles</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="guilty-character">Who is the murderer?</Label>
          <Select 
            value={guiltyCharacterId || ""} 
            onValueChange={handleGuiltyChange}
          >
            <SelectTrigger id="guilty-character">
              <SelectValue placeholder="Select the murderer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">None Selected</SelectItem>
              {characters.map((character) => (
                <SelectItem key={character.id} value={character.id}>
                  {character.character_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Switch 
            id="use-accomplice" 
            checked={useAccomplice}
            onCheckedChange={handleToggleAccomplice}
          />
          <Label htmlFor="use-accomplice">Include an accomplice</Label>
        </div>

        {useAccomplice && (
          <div className="space-y-2">
            <Label htmlFor="accomplice-character">Who is the accomplice?</Label>
            <Select 
              value={accompliceCharacterId || ""} 
              onValueChange={handleAccompliceChange}
              disabled={!useAccomplice}
            >
              <SelectTrigger id="accomplice-character">
                <SelectValue placeholder="Select the accomplice" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None Selected</SelectItem>
                {characters
                  .filter(c => c.id !== guiltyCharacterId)
                  .map((character) => (
                    <SelectItem key={character.id} value={character.id}>
                      {character.character_name}
                    </SelectItem>
                  ))
                }
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CharacterRoleAssignment;
