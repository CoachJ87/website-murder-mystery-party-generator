import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarDays, Clock, Users, Tag } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const MysteryPreviewCard = ({ 
  mystery, 
  parsedDetails, 
  showPurchaseButton = false, 
  onSimulatePurchase, 
  isDevMode = false 
}) => {
  // Format the creation date
  const formattedDate = mystery?.created_at
    ? formatDistanceToNow(new Date(mystery.created_at), { addSuffix: true })
    : "Recently";
    
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
            <p className="font-medium">{mystery.guests || parsedDetails?.characters?.length || "Multiple"} Players</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Tag className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Theme:</span>
            </div>
            <p className="font-medium">{mystery.theme || "Classic"}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Created:</span>
            </div>
            <p className="font-medium">{formattedDate}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-center text-sm">
              <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
              <span>Duration:</span>
            </div>
            <p className="font-medium">2-3 hours</p>
          </div>
        </div>
        
        {shortenedPremise && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-1">Premise:</h3>
            <p className="text-sm text-muted-foreground">{shortenedPremise}</p>
          </div>
        )}
        
        {parsedDetails?.characters && parsedDetails.characters.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-1">Characters:</h3>
            <ul className="text-sm text-muted-foreground list-disc pl-5">
              {parsedDetails.characters.slice(0, 4).map((character, index) => (
                <li key={index}>{character.name}</li>
              ))}
              {parsedDetails.characters.length > 4 && (
                <li>...and {parsedDetails.characters.length - 4} more</li>
              )}
            </ul>
          </div>
        )}
        
        <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground mt-4">
          <p>
            <strong>Note:</strong> This is a preview of your mystery. Purchase the full package to get detailed character guides, host instructions, and all game materials.
          </p>
        </div>
      </CardContent>
      
      {showPurchaseButton && isDevMode && (
        <CardFooter>
          <Button 
            variant="outline" 
            onClick={onSimulatePurchase} 
            className="w-full"
          >
            Simulate Purchase (Dev Mode)
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MysteryPreviewCard;
