import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { generateCompletePackage } from "@/services/mysteryPackageService";
import { useAuth } from "@/context/AuthContext";
import { RefreshCw, AlertCircle, CheckCircle } from "lucide-react";
import MysteryPackageTabView from "@/components/MysteryPackageTabView";

const MysteryView = () => {
  const [mystery, setMystery] = useState<any | null>(null);
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStage, setGenerationStage] = useState("");
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  
  // Check if we've just completed a purchase
  const justPurchased = location.search.includes('purchase=success');

  useEffect(() => {
    if (justPurchased) {
      toast.success("Purchase successful! Your mystery is being prepared...");
    }
  }, [justPurchased]);

  useEffect(() => {
    const fetchMystery = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Get the conversation and check if it's paid
        const { data: conversation, error } = await supabase
          .from("conversations")
          .select("*, mystery_data, is_paid, has_complete_package")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching mystery:", error);
          toast.error("Failed to load mystery");
          return;
        }

        // If not paid, redirect to preview
        if (!conversation.is_paid) {
          navigate(`/mystery/preview/${id}`);
          return;
        }

        setMystery(conversation);

        // Check if we already have generated package content
        if (conversation.has_complete_package) {
          const { data: packageData, error: packageError } = await supabase
            .from("mystery_packages")
            .select("content")
            .eq("conversation_id", id)
            .single();

          if (!packageError && packageData && packageData.content) {
            console.log("Found existing package content, length:", packageData.content.length);
            setPackageContent(packageData.content);
          } else {
            // If the flag is true but content is missing, regenerate
            console.log("Package marked as complete but content missing. Regenerating...");
            handleGeneratePackage();
          }
        } else if (justPurchased || conversation.needs_package_generation) {
          // Auto-generate if just purchased or needs generation
          console.log("Auto-generating package after purchase...");
          handleGeneratePackage();
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load mystery");
      } finally {
        setLoading(false);
      }
    };

    fetchMystery();
  }, [id, navigate, justPurchased]);

  const handleGeneratePackage = async () => {
    if (!id) {
      toast.error("Mystery ID is missing");
      return;
    }

    setGenerating(true);
    setGenerationError(null);
    setGenerationProgress(0);
    setGenerationStage("Initializing generation...");
    
    try {
      toast.info("Generating your complete murder mystery package. This may take 3-5 minutes...");
      
      // Use the client-side generation with progress updates
      const content = await generateCompletePackage(id, (progress, stage) => {
        console.log(`Generation progress: ${progress}%, Stage: ${stage}`);
        setGenerationProgress(progress);
        setGenerationStage(stage);
      });
      
      if (!content) {
        throw new Error("No content was generated");
      }
      
      setPackageContent(content);
      toast.success("Your complete mystery package is ready!");
      
    } catch (error: any) {
      console.error("Error generating package:", error);
      
      // Format user-friendly error message
      let errorMessage = "Failed to generate your mystery package. Please try again.";
      
      if (error.message.includes("TIMEOUT") || error.message.includes("504")) {
        errorMessage = "Generation took too long. Please try again in a few minutes.";
      } else if (error.message.includes("token")) {
        errorMessage = "Your mystery is too complex for automatic generation. Please try again with a simpler mystery.";
      }
      
      setGenerationError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-center mt-4">Loading your mystery...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (generating) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold mb-2">{mystery?.title || "Your Murder Mystery"}</h1>
              <p className="text-muted-foreground">Generating your complete murder mystery package</p>
            </div>
            
            <Card className="mx-auto max-w-2xl">
              <CardContent className="pt-6">
                <div className="text-center py-8">
                  <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                  
                  <h2 className="text-2xl font-semibold mb-4">Creating Your Murder Mystery</h2>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    {generationStage || "Processing your mystery details..."}
                  </p>
                  
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2 max-w-md mx-auto">
                    <div 
                      className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                      style={{ width: `${generationProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {generationProgress}% complete
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Helper function to extract a summary
  const extractSummary = (mystery: any) => {
    if (!mystery?.mystery_data) return "A murder mystery awaits...";
    
    const data = mystery.mystery_data;
    let summary = `A ${data.theme || 'classic'} murder mystery for ${data.playerCount || 'multiple'} players`;
    if (data.hasAccomplice) summary += ' featuring an accomplice mechanism';
    if (data.scriptType) summary += ` with ${data.scriptType === 'full' ? 'detailed scripts' : 'point-form summaries'}`;
    if (data.additionalDetails) summary += `. ${data.additionalDetails}`;
    
    return summary;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{mystery?.title || "Your Murder Mystery"}</h1>
            <p className="text-muted-foreground">
              Your purchased murder mystery package.
            </p>
          </div>

          {packageContent ? (
            <MysteryPackageTabView 
              packageContent={packageContent} 
              mysteryTitle={mystery?.title || "Murder Mystery"}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Generate Your Complete Murder Mystery Package</CardTitle>
                <CardDescription>
                  You've purchased this mystery! Generate your complete package now.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generationError && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md flex items-start gap-3 mb-4">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Generation Error</h4>
                      <p className="text-sm text-red-700 dark:text-red-400 mt-1">{generationError}</p>
                    </div>
                  </div>
                )}
                
                {generationProgress === 100 && !packageContent && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md flex items-start gap-3 mb-4">
                    <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-green-800 dark:text-green-300">Generation Complete</h4>
                      <p className="text-sm text-green-700 dark:text-green-400 mt-1">Your mystery package has been generated! Refresh the page to view it.</p>
                    </div>
                  </div>
                )}
                
                <div className="p-4 bg-muted/30 rounded-md">
                  <h3 className="font-semibold mb-2">Mystery Summary</h3>
                  <p>{extractSummary(mystery)}</p>
                </div>
                
                <div className="space-y-2">
                  <p>
                    Click the button below to generate the complete murder
                    mystery package with all materials you need to host your event:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Detailed character guides for each player</li>
                    <li>Comprehensive host instructions</li>
                    <li>Evidence cards and game materials</li>
                    <li>Complete gameplay script</li>
                  </ul>
                  
                  <Button
                    onClick={handleGeneratePackage}
                    disabled={generating || generationProgress === 100}
                    className="w-full mt-4"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating Full Package...
                      </>
                    ) : generationProgress === 100 ? (
                      "Refresh Page to View Package"
                    ) : (
                      "Generate Complete Mystery Package"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default MysteryView;
