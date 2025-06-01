
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users, Tag } from "lucide-react";

interface MysteryPreviewCardProps {
  mystery: {
    title: string;
    theme?: string;
    guests?: number;
  };
  parsedDetails?: {
    premise?: string;
    characters?: Array<{ name: string }>;
  };
}

const MysteryPreviewCard = ({ mystery, parsedDetails }: MysteryPreviewCardProps) => {
  // Extract first paragraph from premise as teaser
  const teaser = parsedDetails?.premise?.split('\n\n')[0] || '';

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{mystery.title}</CardTitle>
        <CardDescription>Murder Mystery Preview</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-grow space-y-6">
        {/* Core Details Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Players</span>
            </div>
            <p className="font-medium">
              {mystery.guests || "4-8"} Players
            </p>
          </div>
        
        {/* Story Teaser */}
        {teaser && (
          <div className="prose prose-sm max-w-none">
            <h3 className="text-sm font-medium">Story Preview</h3>
            <p className="text-sm text-muted-foreground">{teaser}</p>
            <p className="text-xs italic text-muted-foreground mt-2">
              Purchase to unlock the complete mystery package with all character details, clues, and materials.
            </p>
          </div>
        )}
        
        {/* Package Contents Preview */}
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
