import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Tag } from "lucide-react";

const MysteryPreviewCard = ({ mystery, parsedDetails }) => {
  // Take only the first 2 sentences of the premise
  const shortenedPremise = parsedDetails?.premise 
    ? parsedDetails.premise.split('.').slice(0, 2).join('.') + '.'
    : '';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{mystery.title}</CardTitle>
        <CardDescription>Mystery preview</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Players:</span>
            </div>
            <p className="font-medium">{mystery.guests || parsedDetails?.characters?.length || "3"} Players</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Theme:</span>
            </div>
            <p className="font-medium">{mystery.theme || "Classic"}</p>
          </div>
        </div>
        
        {/* Premise Section */}
        {shortenedPremise && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-1">Premise:</h3>
            <p className="text-sm text-muted-foreground">{shortenedPremise}</p>
          </div>
        )}
        
        {/* Characters Section */}
        {parsedDetails?.characters && parsedDetails.characters.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-1">Characters:</h3>
            <ul className="text-sm text-muted-foreground list-disc pl-5">
              {parsedDetails.characters.map((character, index) => (
                <li key={index}>{character.name}</li>
              ))}
            </ul>
          </div>
        )}
        
        <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground mt-4">
          <p>
            <strong>Note:</strong> This is a preview of your mystery. Purchase the full package to get detailed character guides, host instructions, and all game materials.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MysteryPreviewCard;
