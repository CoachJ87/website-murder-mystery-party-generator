import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { CheckCircle, CreditCard, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Mystery } from "@/interfaces/mystery";
import { Separator } from "@/components/ui/separator";

interface Character {
  name: string;
  description: string;
}

interface ParsedMysteryDetails {
  premise: string;
  characters: Character[];
}

const MysteryPurchase = () => {
  const { id } = useParams();
  const [processing, setProcessing] = useState(false);
  const [mystery, setMystery] = useState<Mystery | null>(null);
  const [parsedDetails, setParsedDetails] = useState<ParsedMysteryDetails | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  // Helper function to extract first two sentences
  const extractFirstTwoSentences = (text: string) => {
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
    return sentences.slice(0, 2).join(' ').trim();
  };

  // Helper function to parse characters from AI response
  const parseCharacters = (content: string): Character[] => {
    const characters: Character[] = [];
    // Look for the character list section (both uppercase and lowercase)
    const characterSection = content.match(/## (?:CHARACTER LIST|Characters)([\s\S]*?)(?=##|$)/i)?.[1] || '';
    
    // Match numbered character entries in the format: "1. **Name** - Description"
    const characterEntries = characterSection.match(/\d+\.\s+\*\*(.*?)\*\*\s+-\s+(.*?)(?=\d+\.|$)/g) || [];
    
    characterEntries.forEach(entry => {
      // Remove the number and clean up the entry
      const cleanEntry = entry.replace(/^\d+\.\s+/, '');
      const [name, description] = cleanEntry.split(/\*\*\s*-\s*/).map(s => s.trim().replace(/\*\*/g, ''));
      if (name && description) {
        // Take only the first sentence of the description
        const firstSentence = description.split(/[.!?]/)[0] + '.';
        characters.push({ name, description: firstSentence });
      }
    });

    return characters;
  };

  // Helper function to parse premise from AI response
  const parsePremise = (content: string): string => {
    // Look for the premise section (both uppercase and lowercase)
    const premiseMatch = content.match(/## (?:PREMISE|Premise)([\s\S]*?)(?=##|$)/i);
    if (premiseMatch) {
      return extractFirstTwoSentences(premiseMatch[1].trim());
    }
    return '';
  };

  useEffect(() => {
    const fetchMysteryAndMessages = async () => {
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .select('*, messages(*)')
        .eq('id', id)
        .maybeSingle();

      if (convError) {
        console.error("Error fetching mystery:", convError);
        toast.error("Failed to load mystery details");
        return;
      }

      if (!conversation) {
        toast.error("Mystery not found");
        navigate('/dashboard');
        return;
      }

      // Map conversation data to Mystery type
      const mysteryData: Mystery = {
        id: conversation.id,
        title: conversation.title || "Custom Murder Mystery",
        created_at: conversation.created_at,
        updated_at: conversation.updated_at,
        status: conversation.display_status || "draft",
        guests: conversation.mystery_data?.playerCount || 0,
        premise: "",
        purchase_date: conversation.purchase_date,
        is_purchased: conversation.is_paid
      };

      setMystery(mysteryData);

      // Find the last AI message that contains the full mystery description
      if (conversation.messages) {
        const lastDetailedAIMessage = [...conversation.messages]
          .reverse()
          .find(m => 
            m.is_ai && 
            (m.content.includes('## PREMISE') || 
             m.content.includes('## Premise') ||
             m.content.includes('## CHARACTER LIST') ||
             m.content.includes('## Characters'))
          );

        if (lastDetailedAIMessage) {
          const details = {
            premise: parsePremise(lastDetailedAIMessage.content),
            characters: parseCharacters(lastDetailedAIMessage.content)
          };
          setParsedDetails(details);
        }
      }
    };

    fetchMysteryAndMessages();
  }, [id, navigate]);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }
    
    try {
      setProcessing(true);
      
      // Create a checkout session with Stripe
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mysteryId: id,
          userId: user?.id,
        }),
      });

      const { url, error } = await response.json();
      
      if (error) {
        throw new Error(error);
      }

      // Redirect to Stripe checkout
      window.location.href = url;
      
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (!mystery) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Complete Your Purchase</h1>
            <p className="text-muted-foreground">
              Get full access to your murder mystery package
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mystery Preview Card */}
            <Card>
              <CardHeader>
                <CardTitle>{mystery.title}</CardTitle>
                <CardDescription>
                  Custom murder mystery for {mystery.guests} players
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Details Section */}
                  <div>
                    <h3 className="font-semibold mb-3">Details</h3>
                    <div className="space-y-2">
                      {mystery.guests > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Players:</span>
                          <span>{mystery.guests} players</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <Separator />

                  {/* Premise Section */}
                  {parsedDetails?.premise && (
                    <div>
                      <h3 className="font-semibold mb-2">Premise</h3>
                      <p className="text-muted-foreground">
                        {parsedDetails.premise}
                      </p>
                    </div>
                  )}

                  <Separator />

                  {/* Characters Preview Section */}
                  {parsedDetails?.characters && parsedDetails.characters.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-3">Character Preview</h3>
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

            {/* Purchase Info Section */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Murder Mystery Package</CardTitle>
                  <CardDescription>One-time purchase, instant access</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-start gap-4 mb-6">
                    <div className="h-16 w-16 rounded bg-primary/10 flex items-center justify-center shrink-0">
                      <CreditCard className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <div className="font-bold text-2xl mb-1">$4.99</div>
                      <p className="text-muted-foreground">
                        Complete murder mystery package with all character materials, clues, and hosting instructions.
                      </p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 mb-6">
                    <h3 className="font-medium">What's included:</h3>
                    {[
                      "Full character profiles for all suspects",
                      "Host guide with step-by-step instructions",
                      "Printable character sheets",
                      "Evidence and clue cards",
                      "Timeline of events",
                      "Solution reveal script",
                      "PDF downloads of all materials"
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={handlePurchase}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Complete Purchase
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              <div className="bg-muted rounded-lg p-6">
                <h3 className="font-medium mb-2">Important Notes</h3>
                <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                  <li>This is a one-time purchase for this specific mystery package</li>
                  <li>You'll have permanent access to download all materials</li>
                  <li>Content is for personal use only, not for commercial redistribution</li>
                  <li>Need help? Contact our support at support@mysterygenerator.com</li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => navigate(`/mystery/preview/${id}`)}>
              Back to Preview
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MysteryPurchase;
