
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { Conversation, MysteryData, Mystery } from "@/interfaces/mystery";

const MysteryPreview = () => {
  const [loading, setLoading] = useState(true);
  const [mystery, setMystery] = useState<Partial<Conversation> | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (id) {
      loadMystery();
    }
  }, [id]);

  const loadMystery = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("conversations")
        .select("*, messages(*)")
        .eq("id", id)
        .single();
      
      if (error) {
        console.error("Error loading mystery:", error);
        toast.error("Failed to load mystery details");
        return;
      }

      let theme = "", title = "", premise = "", playerCount = 0;
      if (data.messages) {
        const aiMessages = data.messages
          .filter((msg: any) => msg.role === "assistant")
          .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
          
        for (const msg of aiMessages) {
          const content = msg.content;
          
          // Try to find the title in the AI message content
          if (content) {
            // Look for title in quotes with "A MURDER MYSTERY" or similar pattern
            const titleRegex = /"([^"]+)"(?:\s*[-–]\s*A\s+\w+\s+MURDER\s+MYSTERY)/i;
            const titleWithoutQuotes = /^# "?([^"]+)"?\s*[-–].*?MURDER MYSTERY/im;
            const simpleTitleWithoutQuotes = /^# (.*?MURDER MYSTERY)/im;
            const titleMatch = content.match(titleRegex) || 
                              content.match(titleWithoutQuotes) || 
                              content.match(simpleTitleWithoutQuotes);
            
            if (titleMatch && titleMatch[1]) {
              // Format title properly - capitalize first letter of each word
              title = titleMatch[1].trim().split(/\s+/).map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(" ");
            }
            
            // Extract theme
            const themeMatch = content.match(/theme:\s*([^\n]+)/i) || 
                              content.match(/with a\s+([^\s]+(?:\s+[^\s]+)?)\s+theme/i);
            if (themeMatch && themeMatch[1]) {
              theme = themeMatch[1].trim();
            }
            
            // Extract premise
            if (content.includes("PREMISE") || content.includes("## PREMISE")) {
              const premiseSection = content.split(/##?\s*PREMISE/i)[1];
              if (premiseSection) {
                const premiseEnd = premiseSection.search(/##?\s*VICTIM|##?\s*CHARACTER LIST|##?\s*MURDER METHOD/i);
                if (premiseEnd !== -1) {
                  premise = premiseSection.substring(0, premiseEnd).trim();
                } else {
                  premise = premiseSection.trim().split('\n\n')[0];
                }
                
                // Ensure we have a complete sentence ending with period, question mark, or exclamation point
                if (premise && premise.length > 100) {
                  const lastSentenceEnd = Math.max(
                    premise.lastIndexOf('.'), 
                    premise.lastIndexOf('!'), 
                    premise.lastIndexOf('?')
                  );
                  
                  if (lastSentenceEnd > 100) {
                    premise = premise.substring(0, lastSentenceEnd + 1);
                  }
                }
              }
            }
            
            // Safely extract playerCount
            const mysteryData = data.mystery_data as Record<string, unknown>;
            playerCount = typeof mysteryData?.playerCount === 'number' 
              ? mysteryData.playerCount 
              : (typeof mysteryData?.playerCount === 'string' 
                ? parseInt(mysteryData.playerCount, 10) 
                : 0);
          }
        }
      }

      // Create a proper MysteryData object with all required fields
      const mysteryDataObj: MysteryData = {
        ...(typeof data.mystery_data === 'object' && data.mystery_data !== null ? data.mystery_data as MysteryData : {}),
        title: data.title || title || `${theme || "Mystery"} Adventure`,  // Ensure title is always set
        playerCount: playerCount || 0
      };

      // Create the mystery object with proper typing
      const mysteryObj: Partial<Conversation> = {
        ...data,
        theme,
        title: title || data.title || `${theme || "Mystery"} Adventure`,
        premise,
        mystery_data: mysteryDataObj
      };

      setMystery(mysteryObj);
    } catch (error) {
      console.error("Error loading mystery:", error);
      toast.error("Failed to load mystery details");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }

    // Skip the purchase page and go directly to Stripe (or simulate purchase in development)
    try {
      setPurchasing(true);
      
      // In a production environment, this would call a function to create a Stripe checkout session
      // For now, we'll just simulate the purchase
      
      toast.info("Redirecting to payment...");
      
      // In production, you would redirect to Stripe here instead of simulating
      // window.location.href = stripeCheckoutUrl;
      
      // For development/demo purposes, simulate the purchase
      handleSimulatePurchase();
      
    } catch (error) {
      console.error("Error initiating purchase:", error);
      toast.error("Failed to initiate purchase");
      setPurchasing(false);
    }
  };

  const handleSimulatePurchase = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }
    
    try {
      setPurchasing(true);
      
      // Update the conversation to mark it as purchased
      const { error: conversationError } = await supabase
        .from("conversations")
        .update({ 
          is_purchased: true,
          purchase_date: new Date().toISOString(),
          is_completed: true // Mark as completed so it appears in the purchased mysteries section
        })
        .eq("id", id);
        
      if (conversationError) {
        throw new Error("Failed to update purchase status");
      }
      
      // If user has profile table, update it too
      if (user) {
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ 
            id: user.id,
            has_purchased: true,
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }
      
      toast.success("Purchase successful!");
      
      // Navigate to the mystery view page
      navigate(`/mystery/${id}`);
      
    } catch (error) {
      console.error("Error simulating purchase:", error);
      toast.error("Failed to simulate purchase");
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        
        <Footer />
      </div>
    );
  }

  if (!mystery) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Mystery Not Found</h2>
            <p className="mb-6 text-muted-foreground">The mystery you're looking for doesn't exist or has been deleted.</p>
            <Button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
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
        <div className="container mx-auto max-w-4xl">
          {mystery && (
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <Card>
                  <CardHeader>
                    <CardTitle>Mystery Overview</CardTitle>
                    <CardDescription>The key elements of your murder mystery</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <h3 className="font-medium"><strong>Theme</strong></h3>
                      <p>{mystery.theme || "Not specified"}</p>
                    </div>
                    <div>
                      <h3 className="font-medium"><strong>Number of Players</strong></h3>
                      <p>{mystery.mystery_data?.playerCount || "Not specified"} players</p>
                    </div>
                    <div>
                      <h3 className="font-medium"><strong>Premise</strong></h3>
                      <p>{mystery.premise || "Custom setting"}</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Purchase Complete Package</CardTitle>
                    <CardDescription>Get everything you need to host your mystery</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="font-bold text-2xl mb-4">$4.99</div>
                    <div className="space-y-2">
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
                  <CardFooter className="flex flex-col gap-3">
                    <Button 
                      className="w-full" 
                      onClick={handlePurchase} 
                      disabled={purchasing}
                    >
                      {purchasing ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        "Purchase Now"
                      )}
                    </Button>
                    
                    <Button 
                      className="w-full" 
                      variant="outline"
                      size="sm"
                      onClick={handleSimulatePurchase} 
                      disabled={purchasing}
                    >
                      Simulate Purchase (Dev Only)
                    </Button>
                  </CardFooter>
                </Card>
                
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm">
                    <strong>Important Notes</strong>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      <li>This is a one-time purchase for this specific mystery package</li>
                      <li>You'll have permanent access to download all materials</li>
                      <li>Content is for personal use only, not for commercial redistribution</li>
                      <li>Need help? Contact our support at support@mysterygenerator.com</li>
                    </ul>
                  </p>
                </div>
              </div>
            </div>
          )}
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => navigate(`/mystery/edit/${id}`)}>
              Continue Editing
            </Button>
            <Button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MysteryPreview;
