// src/components/MysteryPackage.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateCompletePackage } from "@/services/mysteryPackageService";
import { supabase } from "@/lib/supabase";

interface MysteryPackageProps {
  mysteryId: string;
  title: string;
}

const MysteryPackage = ({ mysteryId, title }: MysteryPackageProps) => {
  const [packageContent, setPackageContent] = useState<string | null>(
`# The Masquerade Ball Murder - Complete Mystery Package

## Host Guide

### Setup Instructions
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

1. Venue Preparation
   - Set up the grand ballroom with Victorian-era decorations
   - Create designated areas for key scenes
   - Position clue cards in their starting locations

2. Timeline Management
   - 6:30 PM: Host arrival and final setup
   - 7:00 PM: Guest arrival and character distribution
   - 8:00 PM: First round of clues revealed
   - 9:00 PM: Murder discovery
   - 10:30 PM: Final accusations and revelation

### Character Distribution

#### Primary Characters

1. **Lady Victoria Winchester** (The Host)
   - Background: Lorem ipsum dolor sit amet, consectetur adipiscing elit
   - Secrets: Deeply in debt from gambling addiction
   - Motivations: Needs Lord Blackwood's investment to save her estate
   - Key Relationships: Former business partner with the victim
   - Evidence in possession: Mysterious ledger showing financial transactions

2. **Dr. James Morton** (The Physician)
   - Background: Respected doctor with a dark past
   - Secrets: Knows about Lord Blackwood's terminal illness
   - Motivations: Protecting his medical reputation
   - Key Relationships: Lord Blackwood's personal physician
   - Evidence in possession: Medical records and a suspicious prescription

3. **Miss Eleanor Grey** (The Debutante)
   - Background: Young socialite with hidden depths
   - Secrets: Secret engagement to Lord Blackwood
   - Motivations: Revenge for a broken promise
   - Key Relationships: Lord Blackwood's secret fiancée
   - Evidence in possession: Love letters and a broken locket

### Evidence Items

1. Poison Vial
   - Location: Conservatory
   - Description: Small crystal bottle with traces of arsenic
   - Significance: Murder weapon
   - When Found: After the first hour

2. Torn Letter
   - Location: Study desk
   - Description: Partially burned correspondence
   - Significance: Reveals secret business dealings
   - When Found: During second round of investigation

3. Bloody Handkerchief
   - Location: Garden maze
   - Description: Fine silk with embroidered initials
   - Significance: Links killer to crime scene
   - When Found: Near climax of the evening

### Scene Descriptions

#### The Grand Ballroom
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.

#### The Conservatory
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident.

#### The Study
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit.

### Clue Distribution Timeline

1. Opening Phase (7:00-8:00 PM)
   - Initial character introductions
   - Background story establishment
   - First round of subtle hints

2. Mid-Game Phase (8:00-9:00 PM)
   - Major clue discoveries
   - Character conflicts emerge
   - Secret alliances form

3. Final Phase (9:00-10:30 PM)
   - Critical evidence revealed
   - Confrontations and accusations
   - Murder solution presentation

### Resolution Guide

The murderer is revealed to be Dr. James Morton, who poisoned Lord Blackwood to prevent the exposure of his medical malpractice. Key evidence includes:

1. The poison vial matching his medical bag
2. Torn prescription showing altered medications
3. Witness testimony from the conservatory
4. Financial records of blackmail payments

### Props and Materials Checklist

1. Character Name Tags (8)
2. Evidence Cards (12)
3. Location Markers (6)
4. Timeline Cards (8)
5. Clue Envelopes (15)
6. Solution Sealed Envelope (1)
`
  );

  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const checkForExistingPackage = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from("conversations")
          .select("*, messages(*)")
          .eq("mystery_id", mysteryId)
          .eq("prompt_version", "paid")
          .eq("is_completed", true)
          .maybeSingle();
          
        if (error && error.code !== 'PGRST116') {
          console.error("Error checking for package:", error);
          return;
        }
        
        if (data && data.messages && data.messages.length > 0) {
          const packageMessage = data.messages.find(msg => msg.is_ai === true);
          if (packageMessage) {
            setPackageContent(packageMessage.content);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkForExistingPackage();
  }, [mysteryId]);

  const handleGeneratePackage = async () => {
    try {
      setGenerating(true);
      const content = await generateCompletePackage(mysteryId);
      setPackageContent(content);
      toast.success("Murder mystery package generated successfully!");
    } catch (error) {
      console.error("Error generating package:", error);
      toast.error("Failed to generate mystery package. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    toast.info("PDF generation will be implemented soon!");
  };

  const handleDownloadText = () => {
    if (!packageContent) return;
    
    const blob = new Blob([packageContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_murder_mystery.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex justify-center items-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading package details...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title} - Murder Mystery Package</CardTitle>
      </CardHeader>
      
      <CardContent>
        {packageContent ? (
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto p-4 border rounded-md bg-muted/30">
              <pre className="whitespace-pre-wrap">{packageContent.slice(0, 500)}...</pre>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleDownloadText}>
                <FileText className="h-4 w-4 mr-2" />
                Download as Text
              </Button>
              <Button onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download as PDF
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p>You've purchased this murder mystery! Generate your complete package to get:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Detailed character guides for each player</li>
              <li>Comprehensive host instructions</li>
              <li>Evidence cards and game materials</li>
              <li>Complete gameplay script</li>
            </ul>
            
            <Button 
              onClick={handleGeneratePackage} 
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Package...
                </>
              ) : (
                "Generate Full Mystery Package"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MysteryPackage;
