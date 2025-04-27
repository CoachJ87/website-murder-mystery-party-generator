
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Clock, User, Brush, FileText } from "lucide-react";
import type { Mystery } from "@/interfaces/mystery";

interface Character {
  name: string;
  description: string;
}

interface Evidence {
  title: string;
  description: string;
}

interface ParsedMysteryDetails {
  premise: string;
  overview?: string;
  gameDetails?: string;
  characters: Character[];
  evidence?: Evidence[];
}

interface MysteryPreviewCardProps {
  mystery: Mystery;
  parsedDetails: ParsedMysteryDetails | null;
  showPurchaseButton?: boolean;
  onSimulatePurchase?: () => void;
  isDevMode?: boolean;
}

const MysteryPreviewCard = ({ 
  mystery, 
  parsedDetails, 
  showPurchaseButton,
  onSimulatePurchase,
  isDevMode 
}: MysteryPreviewCardProps) => {
  // Function to truncate text if it's too long
  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>{mystery.title}</CardTitle>
        <CardDescription>
          Murder mystery for {mystery.guests} players
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Details Section */}
          <div>
            <h3 className="font-semibold mb-3">Details</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <div className="flex flex-1 justify-between">
                  <span className="text-muted-foreground">Players:</span>
                  <span className="font-medium">{mystery.guests} players</span>
                </div>
              </div>
              {mystery.theme && (
                <div className="flex items-center gap-3">
                  <Brush className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-1 justify-between">
                    <span className="text-muted-foreground">Theme:</span>
                    <span className="font-medium">{mystery.theme}</span>
                  </div>
                </div>
              )}
              {mystery.status === "purchased" && mystery.purchase_date && (
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-1 justify-between">
                    <span className="text-muted-foreground">Purchased:</span>
                    <span className="font-medium">
                      {new Date(mystery.purchase_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <Separator />

          {/* Game Overview Section */}
          {parsedDetails?.overview && (
            <>
              <div>
                <h3 className="font-semibold mb-2">Game Overview</h3>
                <p className="text-muted-foreground">
                  {parsedDetails.overview}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Premise Section */}
          {parsedDetails?.premise && (
            <>
              <div>
                <h3 className="font-semibold mb-2">Premise</h3>
                <p className="text-muted-foreground">
                  {parsedDetails.premise}
                </p>
              </div>
              <Separator />
            </>
          )}

          {/* Characters Preview Section */}
          {parsedDetails?.characters && parsedDetails.characters.length > 0 && (
            <div>
              <h3 className="font-semibold mb-3">Characters</h3>
              <div className="space-y-4">
                {parsedDetails.characters.slice(0, 3).map((character, index) => (
                  <div key={index} className="space-y-1">
                    <h4 className="text-sm font-medium">{character.name}</h4>
                    <p className="text-sm text-muted-foreground">{truncateText(character.description, 120)}</p>
                  </div>
                ))}
                {parsedDetails.characters.length > 3 && (
                  <p className="text-sm text-muted-foreground italic">
                    +{parsedDetails.characters.length - 3} more characters in the full package
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Evidence Preview Section */}
          {parsedDetails?.evidence && parsedDetails.evidence.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="font-semibold mb-3">Evidence</h3>
                <div className="space-y-4">
                  {parsedDetails.evidence.slice(0, 2).map((item, index) => (
                    <div key={index} className="space-y-1">
                      <div className="flex items-start gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <h4 className="text-sm font-medium">{item.title}</h4>
                      </div>
                      <p className="text-sm text-muted-foreground ml-6">{truncateText(item.description, 100)}</p>
                    </div>
                  ))}
                  {parsedDetails.evidence.length > 2 && (
                    <p className="text-sm text-muted-foreground italic">
                      +{parsedDetails.evidence.length - 2} more evidence items in the full package
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          {(!parsedDetails?.premise && (!parsedDetails?.characters || parsedDetails.characters.length === 0)) && (
            <div className="text-center py-4">
              <p className="text-muted-foreground">
                Purchase the full package to reveal all mystery details, character descriptions, and game materials.
              </p>
            </div>
          )}
        </div>
      </CardContent>

      {showPurchaseButton && isDevMode && (
        <CardFooter>
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full"
            onClick={onSimulatePurchase}
          >
            Simulate Purchase (Dev Mode)
          </Button>
        </CardFooter>
      )}
    </Card>
  );
};

export default MysteryPreviewCard;
