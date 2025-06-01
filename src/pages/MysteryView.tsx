import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { 
  generateCompletePackage, 
  resumePackageGeneration,
  getPackageGenerationStatus, 
  GenerationStatus 
} from "@/services/mysteryPackageService";
import { useAuth } from "@/context/AuthContext";
import { RefreshCw, AlertTriangle, Clock, CheckCircle2 } from "lucide-react";
import MysteryPackageTabView from "@/components/MysteryPackageTabView";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MysteryCharacter } from "@/interfaces/mystery";

interface MysteryPackageData {
  title?: string;
  gameOverview?: string;
  hostGuide?: string;
  materials?: string;
  preparation?: string;
  timeline?: string;
  hostingTips?: string;
  evidenceCards?: string;
  relationshipMatrix?: string;
  detectiveScript?: string;
}

const MysteryView = () => {
  const [mystery, setMystery] = useState<any | null>(null);
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [packageData, setPackageData] = useState<MysteryPackageData | null>(null);
  const [characters, setCharacters] = useState<MysteryCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Track notification state
  const packageReadyNotified = useRef<boolean>(false);

  // Simplified status checking function
  const checkGenerationStatus = useCallback(async () => {
    if (!id) return;
    
    try {
      const status = await getPackageGenerationStatus(id);
      setGenerationStatus(status);
      setLastUpdate(new Date());
      
      console.log("Status check result:", status);
      
      // Handle completion
      if (status.status === 'completed') {
        setGenerating(false);
        
        // Fetch the completed package data
        await fetchStructuredPackageData();
        
        // Only show notification once
        if (!packageReadyNotified.current) {
          toast.success("Your mystery package is ready!");
          packageReadyNotified.current = true;
        }
        
        // Update conversation status
        await supabase
          .from("conversations")
          .update({
            status: "purchased",
            is_paid: true,
            needs_package_generation: false,
            display_status: "purchased"
          })
          .eq("id", id);
          
      } else if (status.status === 'failed') {
        setGenerating(false);
        
        if (status.resumable) {
          toast.error(
            <div className="space-y-2">
              <p>Generation encountered an error but can be resumed.</p>
              <Button size="sm" variant="outline" onClick={handleResumeGeneration}>
                Resume Generation
              </Button>
            </div>,
            { duration: 10000 }
          );
        } else {
          toast.error("Generation failed. You can try again.");
        }
      }
    } catch (error) {
      console.error("Error checking generation status:", error);
    }
  }, [id]);

  // Auto-refresh effect - simple 30-second interval
  useEffect(() => {
    if (!id) return;

    let refreshInterval: number | null = null;

    const startAutoRefresh = () => {
      console.log("Starting auto-refresh every 30 seconds");
      
      // Initial status check
      checkGenerationStatus();
      
      // Set up 30-second auto-refresh
      refreshInterval = window.setInterval(() => {
        console.log("Auto-refreshing generation status...");
        checkGenerationStatus();
      }, 30000); // 30 seconds
    };

    const stopAutoRefresh = () => {
      if (refreshInterval) {
        console.log("Stopping auto-refresh");
        clearInterval(refreshInterval);
        refreshInterval = null;
      }
    };

    // Start auto-refresh if generation is in progress
    if (generationStatus?.status === 'in_progress' || generating) {
      startAutoRefresh();
    } else {
      stopAutoRefresh();
    }

    // Cleanup on unmount or dependency change
    return () => {
      stopAutoRefresh();
    };
  }, [id, generationStatus?.status, generating, checkGenerationStatus]);

  // Fetch structured package data
  const fetchStructuredPackageData = async () => {
    if (!id) return;

    try {
      // Fetch mystery packages data with structured fields
      const { data: packageData, error: packageError } = await supabase
        .from("mystery_packages")
        .select(`
          title,
          game_overview,
          host_guide,
          materials,
          preparation_instructions,
          timeline,
          hosting_tips,
          evidence_cards,
          relationship_matrix,
          detective_script,
          id
        `)
        .eq("conversation_id", id)
        .single();

      if (packageError) {
        console.error("Error fetching package data:", packageError);
        return;
      }

      if (packageData) {
        // Map database fields to component props
        const structuredPackageData: MysteryPackageData = {
          title: packageData.title,
          gameOverview: packageData.game_overview,
          hostGuide: packageData.host_guide,
          materials: packageData.materials,
          preparation: packageData.preparation_instructions,
          timeline: packageData.timeline,
          hostingTips: packageData.hosting_tips,
          evidenceCards: packageData.evidence_cards,
          relationshipMatrix: packageData.relationship_matrix,
          detectiveScript: packageData.detective_script,
        };
        
        setPackageData(structuredPackageData);
        console.log("Structured package data loaded:", structuredPackageData);

        // Fetch characters using the package ID
        const { data: charactersData, error: charactersError } = await supabase
          .from("mystery_characters")
          .select("*")
          .eq("package_id", packageData.id)
          .order("character_name");

        if (charactersError) {
          console.error("Error fetching characters:", charactersError);
        } else if (charactersData) {
          setCharacters(charactersData);
          console.log("Characters loaded:", charactersData);
        }
      }
    } catch (error) {
      console.error("Error fetching structured package data:", error);
    }
  };

  // Initial data loading
  useEffect(() => {
    const fetchMystery = async () => {
      if (!id) return;

      setLoading(true);
      try {
        // Check if this is a redirect from a purchase
        const urlParams = new URLSearchParams(window.location.search);
        const purchaseStatus = urlParams.get('purchase');
        
        if (purchaseStatus === 'success') {
          toast.success("Purchase successful! You now have full access to this mystery package.");
        }
        
        const { data: conversation, error } = await supabase
          .from("conversations")
          .select("*, mystery_data, is_paid, has_complete_package, needs_package_generation")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching mystery:", error);
          toast.error("Failed to load mystery");
          return;
        }

        console.log("Mystery data loaded:", {
          id: conversation.id,
          is_paid: conversation.is_paid,
          needs_package_generation: conversation.needs_package_generation,
          has_complete_package: conversation.has_complete_package
        });

        setMystery(conversation);

        // Check generation status if package generation is needed
        if (conversation.needs_package_generation || conversation.is_paid) {
          const status = await getPackageGenerationStatus(id);
          setGenerationStatus(status);
          setLastUpdate(new Date());
          
          if (status.status === 'in_progress') {
            setGenerating(true);
          } else if (status.status === 'completed') {
            // Reset notification state on new page load if package is complete
            packageReadyNotified.current = false;
            await supabase
              .from("conversations")
              .update({
                is_paid: true,
                is_purchased: true,
                display_status: "purchased",
                mystery_data: {
                  ...conversation.mystery_data,
                  status: "purchased"
                }
              })
              .eq("id", id);
          }
        }

        // Fetch package data if it exists
        if (conversation.has_complete_package || conversation.is_paid) {
          await fetchStructuredPackageData();

          // Fallback to legacy content if structured data is not available
          const { data: packageData, error: packageError } = await supabase
            .from("mystery_packages")
            .select("legacy_content")
            .eq("conversation_id", id)
            .single();

          if (!packageError && packageData && packageData.legacy_content) {
            setPackageContent(packageData.legacy_content);
          }
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load mystery");
      } finally {
        setLoading(false);
      }
    };

    fetchMystery();
  }, [id]);

  // Manual refresh function
  const handleManualRefresh = () => {
    console.log("Manual refresh triggered");
    checkGenerationStatus();
  };

  // Resume generation handler
  const handleResumeGeneration = async () => {
    if (!id) {
      toast.error("Mystery ID is missing");
      return;
    }

    setGenerating(true);
    try {
      toast.info("Resuming your mystery generation...");
      
      // Reset notification state on resume
      packageReadyNotified.current = false;
      
      await resumePackageGeneration(id);
      
      console.log("Resume generation initiated");
      
    } catch (error: any) {
      console.error("Error resuming package generation:", error);
      setGenerating(false);
      toast.error(error.message || "Failed to resume generation");
    }
  };

  // Generate package handler
  const handleGeneratePackage = async () => {
    if (!id) {
      toast.error("Mystery ID is missing");
      return;
    }

    setGenerating(true);
    packageReadyNotified.current = false; // Reset notification flag
    
    try {
      toast.info("Starting generation of your mystery package. This will take 3-5 minutes...");
      
      // Just call the webhook - don't wait for completion
      await generateCompletePackage(id);
      
      // The auto-refresh will handle checking status
      console.log("Generation started, auto-refresh will check status");
      
    } catch (error: any) {
      console.error("Error starting package generation:", error);
      setGenerating(false);
      toast.error(error.message || "Failed to start package generation");
    }
  };

  // Render generation progress
  const renderGenerationProgress = () => {
    if (!generationStatus) return null;
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Generating Your Mystery Package</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleManualRefresh} 
              className="h-8 w-8 p-0"
              title="Refresh status"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            This process takes 3-5 minutes to complete. This page automatically refreshes every 30 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{generationStatus.currentStep}</span>
              <span>{generationStatus.progress}%</span>
            </div>
            <Progress value={generationStatus.progress} className="h-2" />
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 text-sm">
            <div className="flex-1 border rounded-md p-3">
              <div className="font-medium mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Estimated Time</span>
              </div>
              <p className="text-muted-foreground">
                Full generation takes 3-5 minutes. Remaining: 
                {generationStatus.progress < 30 ? " 4-5 minutes" : 
                 generationStatus.progress < 60 ? " 2-4 minutes" : 
                 generationStatus.progress < 90 ? " 1-2 minutes" : 
                 " less than 1 minute"}
              </p>
            </div>
            
            <div className="flex-1 border rounded-md p-3">
              <div className="font-medium mb-2">Generation Progress</div>
              <div className="space-y-1">
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${generationStatus.sections?.hostGuide ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className={generationStatus.sections?.hostGuide ? "" : "text-muted-foreground"}>Host Guide</span>
                </div>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${generationStatus.sections?.characters ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className={generationStatus.sections?.characters ? "" : "text-muted-foreground"}>Character Guides</span>
                </div>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${generationStatus.sections?.clues ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className={generationStatus.sections?.clues ? "" : "text-muted-foreground"}>Clues & Materials</span>
                </div>
              </div>
            </div>
          </div>
          
          <p className="text-sm text-muted-foreground">
            <strong>Auto-refresh:</strong> This page automatically checks for updates every 30 seconds.
            {lastUpdate && ` Last update: ${lastUpdate.toLocaleTimeString()}`}
          </p>
          
          {generationStatus.status === 'failed' && generationStatus.resumable && (
            <Button onClick={handleResumeGeneration} disabled={generating} className="mt-2">
              Resume Generation
            </Button>
          )}
        </CardContent>
      </Card>
    );
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Show tabs for completed or purchased mysteries */}
          {(generationStatus?.status === 'completed' || 
            packageContent || 
            packageData ||
            (mystery && mystery.is_paid)) ? (
            <MysteryPackageTabView 
              packageContent={packageContent || ""} 
              mysteryTitle={mystery?.title || mystery?.mystery_data?.theme || "Mystery Package"}
              generationStatus={generationStatus || undefined}
              conversationId={id}
              onGenerateClick={handleGeneratePackage}
              isGenerating={generating}
              packageData={packageData || undefined}
              characters={characters}
            />
          ) : (
            // Show generation progress or start button
            generationStatus?.status === 'in_progress' ? renderGenerationProgress() : (
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Generate Your Mystery Package</CardTitle>
                  <CardDescription>
                    Your mystery is ready to be generated. Click the button below to create your custom murder mystery package.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={handleGeneratePackage}
                    disabled={generating}
                    className="w-full sm:w-auto"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Starting Generation...
                      </>
                    ) : (
                      "Generate Mystery Package"
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-3">
                    Generation takes 3-5 minutes. This page will auto-refresh to show progress.
                  </p>
                </CardContent>
              </Card>
            )
          )}
          
          <div className="flex justify-center mt-8">
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
