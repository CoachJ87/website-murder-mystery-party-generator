
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
    <Card>
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
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Players:</span>
                <span>{mystery.guests} players</span>
              </div>
              {mystery.theme && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Theme:</span>
                  <span>{mystery.theme}</span>
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
              <div className="space-y-3">
                {parsedDetails.characters.map((character, index) => (
                  <div key={index} className="space-y-1">
                    <h4 className="text-sm font-medium">{character.name}</h4>
                    <p className="text-sm text-muted-foreground">{character.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default MysteryPreviewCard;
