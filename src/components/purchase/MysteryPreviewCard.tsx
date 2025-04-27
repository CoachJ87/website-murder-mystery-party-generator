
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Tag, Clock } from "lucide-react";

interface MysteryPreviewCardProps {
  mystery: {
    title: string;
    theme?: string;
    guests?: number;
  };
  parsedDetails?: {
    premise?: string;
    characters?: Array<{ name: string }>;
    playtime?: string;
  };
}

const MysteryPreviewCard = ({ mystery, parsedDetails }: MysteryPreviewCardProps) => {
  // Take only the first 2 sentences of the premise if it exists
  const shortenedPremise = parsedDetails?.premise 
    ? parsedDetails.premise.split('.').slice(0, 2).join('.') + '.'
    : '';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{mystery.title}</CardTitle>
        <CardDescription>Murder Mystery Preview</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow space-y-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Players</span>
            </div>
            <p className="font-medium">
              {mystery.guests || parsedDetails?.characters?.length || "4-8"} Players
            </p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Theme</span>
            </div>
            <p className="font-medium">{mystery.theme || "Classic"}</p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Duration</span>
            </div>
            <p className="font-medium">2-3 hours</p>
          </div>
        </div>
        
        {/* Preview Content */}
        <div className="prose prose-sm max-w-none space-y-4">
          {shortenedPremise && (
            <div>
              <h3 className="text-sm font-medium">Story Preview</h3>
              <p className="text-sm text-muted-foreground">{shortenedPremise}</p>
            </div>
          )}
          
          {parsedDetails?.characters && parsedDetails.characters.length > 0 && (
            <div>
              <h3 className="text-sm font-medium">Featured Characters</h3>
              <ul className="text-sm text-muted-foreground list-disc pl-5">
                {parsedDetails.characters.slice(0, 3).map((character, index) => (
                  <li key={index}>{character.name}</li>
                ))}
                {parsedDetails.characters.length > 3 && (
                  <li>And {parsedDetails.characters.length - 3} more characters...</li>
                )}
              </ul>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
          <p className="font-medium mb-2">What's included in the full package:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Detailed host guide with complete setup instructions</li>
            <li>Character guides for each player</li>
            <li>Evidence cards and printable materials</li>
            <li>Full gameplay script and timeline</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default MysteryPreviewCard;
