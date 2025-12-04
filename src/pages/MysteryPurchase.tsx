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
import MysteryPreviewCard from "@/components/purchase/MysteryPreviewCard";
import { extractTitleFromMessages } from "@/utils/titleExtraction";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

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

const MysteryPurchase = () => {
  const { id } = useParams();
  const [processing, setProcessing] = useState(false);
  const [mystery, setMystery] = useState<Mystery | null>(null);
  const [parsedDetails, setParsedDetails] = useState<ParsedMysteryDetails | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isDevMode = import.meta.env.DEV || (window.location.hostname === 'localhost');
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Enhanced extraction functions with better pattern matching
  const extractGameOverview = (content: string): string => {
    // Look for game overview section which might be marked with different headers
    const overviewPatterns = [
      /(?:##?\s*(?:GAME OVERVIEW|OVERVIEW|GAME INTRODUCTION|INTRODUCTION))([\s\S]*?)(?=##|$)/i,
      /(?:".*?")\s+is\s+a\s+([\s\S]*?)(?=\.\s)/i
    ];
    
    for (const pattern of overviewPatterns) {
      const match = content.match(pattern);
      if (match?.[1]) {
        return match[1].trim().replace(/^\s*[-*]\s*/, '');
      }
    }
    
    return '';
  };

  const extractPremise = (content: string): string => {
    // Look for premise or similar sections with case-insensitive matching
    const premisePatterns = [
      /(?:##?\s*(?:PREMISE|Background|Setting|SETTING|SCENARIO|Scenario|THE STORY|Story))([\s\S]*?)(?=##|$)/i,
      /(?:GAME OVERVIEW)([\s\S]*?)(?=##|MATERIALS NEEDED|BEFORE THE PARTY|$)/i
    ];
    
    for (const pattern of premisePatterns) {
      const match = content.match(pattern);
      if (match?.[1] && match[1].trim().length > 20) {
        return match[1].trim().replace(/^\s*[-*]\s*/, '');
      }
    }
    
    // Fallback: try to find the first substantial paragraph if no premise section exists
    const fallbackMatch = content.match(/^([^#]+)/);
    if (fallbackMatch?.[1] && fallbackMatch[1].trim().length > 50) {
      return fallbackMatch[1].trim().replace(/^\s*[-*]\s*/, '');
    }
    
    return '';
  };

  const parseCharacters = (content: string): Character[] => {
    const characters: Character[] = [];
    
    // Try to find character sections with case-insensitive matching
    const characterSectionsPatterns = [
      /(?:##?\s*(?:CHARACTER LIST|Characters|CHARACTERS|CHARACTER|SUSPECTS))([\s\S]*?)(?=##|$)/i,
      /(?:##?\s*(?:[A-Z\s]+ - CHARACTER GUIDE))([\s\S]*?)(?=##|$)/i
    ];
    
    let characterSection = '';
    for (const pattern of characterSectionsPatterns) {
      const match = content.match(pattern);
      if (match?.[1]) {
        characterSection = match[1];
        break;
      }
    }
    
    if (!characterSection) return characters;
    
    // Pattern 1: Character with description after colon/dash
    const formatOneMatches = Array.from(characterSection.matchAll(/(?:\d+\.|\*|\-)\s*\*\*([^*]+)\*\*\s*[-–:]\s*([^#\n]+)/g));
    
    // Pattern 2: Character name in bold followed by description
    const formatTwoMatches = Array.from(characterSection.matchAll(/\*\*([^*]+)\*\*\s*[-–:]\s*([^#\n]+)/g));
    
    // Pattern 3: Character name as header followed by description
    const formatThreeMatches = Array.from(content.matchAll(/##?\s*([A-Z\s]+)\s*-\s*CHARACTER GUIDE\s*\n+(?:CHARACTER DESCRIPTION\s*\n+)?([\s\S]*?)(?=YOUR BACKGROUND|YOUR RELATIONSHIPS|##|$)/ig));

    // Use the most populated set of matches
    let allMatches = [];
    if (formatOneMatches.length >= formatTwoMatches.length && formatOneMatches.length >= formatThreeMatches.length) {
      allMatches = formatOneMatches;
    } else if (formatTwoMatches.length >= formatOneMatches.length && formatTwoMatches.length >= formatThreeMatches.length) {
      allMatches = formatTwoMatches;
    } else {
      allMatches = formatThreeMatches;
    }
    
    for (const match of allMatches) {
      const [_, name, description] = match;
      if (name && description) {
        const cleanName = name.trim().replace(/^\d+\.\s*/, '');
        let cleanDescription = description.trim();
        
        characters.push({
          name: cleanName,
          description: cleanDescription
        });
      }
    }

    // If we still don't have characters, try another approach for character names only
    if (characters.length === 0) {
      const nameOnlyMatches = characterSection.match(/\*\*([^*]+)\*\*/g);
      if (nameOnlyMatches) {
        nameOnlyMatches.forEach(match => {
          const name = match.replace(/\*\*/g, '').trim();
          if (name) {
            characters.push({
              name,
              description: t("purchase.preview.characterPlaceholder")
            });
          }
        });
      }
      
      // Last resort: look for character names as headers
      if (characters.length === 0) {
        const headerMatches = Array.from(content.matchAll(/##\s*([A-Z][A-Z\s]+[A-Z])\s*(?:-|–)/g));
        headerMatches.forEach(match => {
          const name = match[1].trim();
          if (name && name.length > 2 && !name.match(/EVIDENCE CARD|HOST GUIDE/i)) {
            characters.push({
              name,
              description: t("purchase.preview.characterPlaceholderFull")
            });
          }
        });
      }
    }

    return characters;
  };
  
  const parseEvidence = (content: string): Evidence[] => {
    const evidence: Evidence[] = [];
    
    // Try to find evidence sections
    const evidenceSectionsPattern = /(?:##?\s*(?:EVIDENCE CARDS|CLUES|EVIDENCE|CLUE CARDS))([\s\S]*?)(?=##|$)/i;
    
    const evidenceItemPattern = /(?:##?\s*EVIDENCE CARD #?\d+:?\s*([^\n]+)|"?EVIDENCE CARD #?\d+:?\s*([^\n]+)"?)([\s\S]*?)(?=(?:##?\s*EVIDENCE CARD)|##|$)/gi;
    
    const match = content.match(evidenceSectionsPattern);
    const evidenceSection = match?.[1] || content;
    
    const evidenceMatches = Array.from(evidenceSection.matchAll(evidenceItemPattern));
    
    for (const match of evidenceMatches) {
      const title = (match[1] || match[2]).trim();
      const description = match[3].trim().split('\n')[0]; // Get just the first line
      
      if (title) {
        evidence.push({
          title,
          description: description || t("purchase.preview.evidencePlaceholder")
        });
      }
    }
    
    return evidence;
  };

  useEffect(() => {
    const fetchMysteryAndMessages = async () => {
      try {
        // Check if this is a redirect from Stripe with a success parameter
        const urlParams = new URLSearchParams(window.location.search);
        const purchaseStatus = urlParams.get('purchase');
        
        if (purchaseStatus === 'success') {
          toast.success(t("purchase.toasts.success"));
          
          // Need to update the local state to reflect the purchase
          await supabase
            .from('conversations')
            .update({ is_paid: true, purchase_date: new Date().toISOString() })
            .eq('id', id);
        }
        
        if (purchaseStatus === 'cancel') {
          toast.error(t("purchase.toasts.cancel"));
        }
        
        const { data: conversation, error: convError } = await supabase
          .from('conversations')
          .select('*, messages(*)')
          .eq('id', id)
          .maybeSingle();

        if (convError) {
          console.error("Error fetching mystery:", convError);
          toast.error(t("purchase.toasts.loadFailed"));
          return;
        }

        if (!conversation) {
          toast.error(t("purchase.toasts.notFound"));
          navigate('/dashboard');
          return;
        }

        // Extract title from messages before creating mysteryData
        const extractedTitle = conversation.messages ? extractTitleFromMessages(conversation.messages) : null;

        const mysteryData: Mystery = {
          id: conversation.id,
          title: extractedTitle || conversation.title || t("purchase.preview.defaultTitle"),
          created_at: conversation.created_at,
          updated_at: conversation.updated_at,
          status: conversation.is_paid ? "purchased" : (conversation.display_status || "draft"),
          guests: conversation.player_count || 0,
          theme: conversation.theme || "",
          premise: "",
          purchase_date: conversation.purchase_date,
          is_purchased: conversation.is_paid
        };

        setMystery(mysteryData);

        if (conversation.messages && conversation.messages.length > 0) {
          const aiMessages = conversation.messages
            .filter(m => m.is_ai)
            .sort((a, b) => new Date(b.created_at || b.timestamp).getTime() - new Date(a.created_at || a.timestamp).getTime());
          
          let detailedMessage = null;
          
          // First, look for a message with both premise and characters
          for (const msg of aiMessages) {
            const hasPremise = /(?:##\s*(?:PREMISE|GAME OVERVIEW|Background|Setting|SETTING|SCENARIO|Scenario|THE STORY|Story))/i.test(msg.content);
            const hasCharacters = /(?:##\s*(?:CHARACTER LIST|Characters|CHARACTERS|CHARACTER|SUSPECTS))/i.test(msg.content);
            
            if (hasPremise && hasCharacters) {
              detailedMessage = msg;
              break;
            }
          }
          
          // If no complete message found, look for one with any detailed content
          if (!detailedMessage) {
            for (const msg of aiMessages) {
              const hasSomeDetails = /(?:##\s*(?:PREMISE|GAME OVERVIEW|Background|Setting|CHARACTER LIST|Characters|CHARACTERS|VICTIM|MURDER|SCENARIO|EVIDENCE))/i.test(msg.content);
              if (hasSomeDetails) {
                detailedMessage = msg;
                break;
              }
            }
          }
          
          // Last resort: use the most recent message
          if (!detailedMessage && aiMessages.length > 0) {
            detailedMessage = aiMessages[0];
          }

          if (detailedMessage) {
            const details: ParsedMysteryDetails = {
              premise: extractPremise(detailedMessage.content),
              overview: extractGameOverview(detailedMessage.content),
              characters: parseCharacters(detailedMessage.content),
              evidence: parseEvidence(detailedMessage.content)
            };
            
            setParsedDetails(details);
            console.log("Extracted details:", details); // Debug log
          }
        }
      } catch (error) {
        console.error("Error in fetchMysteryAndMessages:", error);
        toast.error(t("purchase.toasts.genericError"));
      }
    };

    fetchMysteryAndMessages();
  }, [id, navigate, t]);

  const handleSimulatePurchase = async () => {
    if (!isDevMode) return;
    
    try {
      toast.info(t("purchase.toasts.devPurchaseSim"));
      
      // Update conversation to mark as purchased
      await supabase
        .from('conversations')
        .update({ 
          is_paid: true,
          purchase_date: new Date().toISOString()
        })
        .eq('id', id);
        
      toast.success(t("purchase.toasts.devPurchaseSuccess"));
      
      // Redirect to the mystery page view (with the tabs)
      setTimeout(() => {
        navigate(`/mystery/${id}`);
      }, 1500);
      
    } catch (error) {
      console.error("Error simulating purchase:", error);
      toast.error(t("purchase.toasts.devPurchaseFailed"));
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error(t("purchase.toasts.signInRequired"));
      navigate("/sign-in");
      return;
    }
    
    try {
      setProcessing(true);
      toast.info(t("purchase.toasts.checkoutRedirect"));
      
      // Construct Stripe URL with conversation ID in metadata
      const baseUrl = window.location.origin;
      const successUrl = `${baseUrl}/payment-success?conversation_id=${id}`;
      const cancelUrl = `${baseUrl}/mystery/purchase/${id}?purchase=cancel`;
      
      // Add client_reference_id to pass conversation ID to Stripe
      const stripeUrl = `https://buy.stripe.com/dRm4gAgls6c47UccYV2Nq03?prefilled_email=${encodeURIComponent(user?.email || '')}&client_reference_id=${id}&success_url=${encodeURIComponent(successUrl)}&cancel_url=${encodeURIComponent(cancelUrl)}`;
      
      // Store conversation ID in localStorage as fallback in case URL params are lost
      if (id) {
        localStorage.setItem('pendingConversationId', id);
        console.log('Stored conversation ID in localStorage:', id);
      }

      // Debug logging
      console.log('=== STRIPE URL DEBUG ===');
      console.log('Conversation ID from useParams:', id);
      console.log('ID type:', typeof id);
      console.log('Base URL:', baseUrl);
      console.log('Success URL being constructed:', successUrl);
      console.log('Final Stripe URL:', stripeUrl);
      console.log('=== END STRIPE DEBUG ===');
      
      // Redirect to Stripe
      window.location.href = stripeUrl;
      
    } catch (error) {
      console.error("Error redirecting to Stripe:", error);
      toast.error(t("purchase.toasts.checkoutFailed"));
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
      
      <main className={cn(
        "flex-1",
        isMobile ? "py-4 px-3" : "py-12 px-4"
      )}>
        <div className={cn(
          "container mx-auto",
          isMobile ? "max-w-full" : "max-w-7xl"
        )}>
          {/* Header Section - Mobile Optimized */}
          <div className={cn("mb-6 text-center", isMobile && "mb-4")}>
            <h1 className={cn(
              "font-bold mb-2",
              isMobile ? "text-xl" : "text-3xl"
            )}>
              {t("purchase.title")}
            </h1>
            <p className={cn(
              "text-muted-foreground",
              isMobile ? "text-sm px-2" : "text-base"
            )}>
              {t("purchase.subtitle")}
            </p>
          </div>
          
          {/* Main Content - Responsive Grid */}
          <div className={cn(
            "grid gap-6",
            isMobile 
              ? "grid-cols-1 space-y-4" 
              : "grid-cols-1 md:grid-cols-2 gap-8"
          )}>
            <MysteryPreviewCard 
              mystery={mystery} 
              parsedDetails={parsedDetails} 
            />

            <div className="space-y-4 sm:space-y-6">
              <Card className={cn(isMobile && "shadow-sm")}>
                <CardHeader className={cn(isMobile && "p-4")}>
                  <CardTitle className={cn(isMobile ? "text-lg" : "text-xl")}>
                    {t("purchase.package.title")}
                  </CardTitle>
                  <CardDescription className={cn(isMobile && "text-sm")}>
                    {t("purchase.package.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn(isMobile && "p-4 pt-0")}>
                  <div className={cn(
                    "flex items-start gap-4 mb-6",
                    isMobile && "mb-4"
                  )}>
                    <div className={cn(
                      "rounded bg-primary/10 flex items-center justify-center shrink-0",
                      isMobile ? "h-12 w-12" : "h-16 w-16"
                    )}>
                      <CreditCard className={cn(
                        "text-primary",
                        isMobile ? "h-6 w-6" : "h-8 w-8"
                      )} />
                    </div>
                    <div>
                      <div className={cn(
                        "font-bold mb-1",
                        isMobile ? "text-xl" : "text-2xl"
                      )}>
                        $24.99
                      </div>
                      <p className={cn(
                        "text-muted-foreground",
                        isMobile && "text-sm"
                      )}>
                        {t("purchase.package.priceDescription")}
                      </p>
                    </div>
                  </div>
                  
                  <div className={cn(
                    "space-y-3 mb-6",
                    isMobile && "space-y-2 mb-4"
                  )}>
                    <h3 className={cn(
                      "font-medium",
                      isMobile && "text-sm"
                    )}>
                      {t("purchase.package.whatsIncluded")}
                    </h3>
                    {(t('purchase.package.includes', { returnObjects: true }) as string[]).map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className={cn(
                          "text-green-500 shrink-0 mt-0.5",
                          isMobile ? "h-4 w-4" : "h-5 w-5"
                        )} />
                        <span className={cn(isMobile && "text-sm")}>
                          {item}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className={cn(
                  "flex-col gap-4",
                  isMobile && "p-4 pt-0 gap-3"
                )}>
                  <p className="text-sm text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
                    <strong>Note:</strong> Once purchased, the mystery content cannot be edited through our AI system. Please ensure all character details and story elements are finalized before completing your purchase.
                  </p>
                  <Button 
                    className={cn(
                      "w-full font-medium",
                      isMobile ? "h-12 text-base" : "h-11"
                    )}
                    size="lg" 
                    onClick={handlePurchase}
                    disabled={processing}
                  >
                    {processing ? (
                      <>
                        <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        {t("purchase.buttons.processing")}
                      </>
                    ) : (
                      <>
                        {t("purchase.buttons.complete")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>

              {/* Important Notes Section - Mobile Optimized */}
              <div className={cn(
                "bg-muted rounded-lg p-6",
                isMobile && "p-4"
              )}>
                <h3 className={cn(
                  "font-medium mb-2",
                  isMobile && "text-sm"
                )}>
                  {t("purchase.notes.title")}
                </h3>
                <ul className={cn(
                  "list-disc pl-5 space-y-1 text-muted-foreground",
                  isMobile ? "text-xs pl-4" : "text-sm"
                )}>
                  {(t('purchase.notes.items', { returnObjects: true }) as string[]).map((item, index) => (
                    <li key={index}>
                      {item.includes('{{email}}') 
                        ? item.replace('{{email}}', 'support@mysterymaker.party')
                        : item
                      }
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Back Button - Mobile Optimized */}
          <div className={cn(
            "mt-8 text-center",
            isMobile && "mt-6"
          )}>
            <Button 
              variant="outline" 
              onClick={() => navigate(`/mystery/chat/${id}`)}
              className={cn(isMobile && "w-full h-11")}
            >
              {t("purchase.buttons.backToDesign")}
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MysteryPurchase;
