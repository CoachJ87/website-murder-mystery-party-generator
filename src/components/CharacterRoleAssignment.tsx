
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { MysteryCharacter } from "@/interfaces/mystery";

interface CharacterRoleAssignmentProps {
  characters: MysteryCharacter[];
  onRoleAssign: (guiltyId: string | null) => void;
}

const CharacterRoleAssignment: React.FC<CharacterRoleAssignmentProps> = ({
  characters,
  onRoleAssign
}) => {
  const [guiltyCharacterId, setGuiltyCharacterId] = useState<string | null>(null);

  const handleGuiltyChange = (id: string) => {
    setGuiltyCharacterId(id);
    onRoleAssign(id);
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
            value={guiltyCharacterId || "none"} 
            onValueChange={handleGuiltyChange}
          >
            <SelectTrigger id="guilty-character">
              <SelectValue placeholder="Select the murderer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None Selected</SelectItem>
              {characters.map((character) => (
                <SelectItem key={character.id} value={character.id}>
                  {character.character_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardContent>
    </Card>
  );
};

export default CharacterRoleAssignment;
