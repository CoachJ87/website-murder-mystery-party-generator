
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Clock, User, Brush } from "lucide-react";
import type { Mystery } from "@/interfaces/mystery";

interface Character {
  name: string;
  description: string;
}

interface ParsedMysteryDetails {
  premise: string;
  characters: Character[];
}

interface MysteryPreviewCardProps {
  mystery: Mystery;
  parsedDetails: ParsedMysteryDetails | null;
}

const MysteryPreviewCard = ({ mystery, parsedDetails }: MysteryPreviewCardProps) => {
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
                {parsedDetails.characters.map((character, index) => (
                  <div key={index} className="space-y-1">
                    <h4 className="text-sm font-medium">{character.name}</h4>
                    <p className="text-sm text-muted-foreground">{character.description}</p>
                  </div>
                ))}
                {parsedDetails.characters.length < mystery.guests && (
                  <p className="text-sm text-muted-foreground italic">
                    +{mystery.guests - parsedDetails.characters.length} more characters in the full package
                  </p>
                )}
              </div>
            </div>
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
    </Card>
  );
};

export default MysteryPreviewCard;
