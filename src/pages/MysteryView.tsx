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
import { RefreshCw, AlertTriangle, Clock, CheckCircle2, Eye, XCircle } from "lucide-react";
import MysteryPackageTabView from "@/components/MysteryPackageTabView";
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
  // Track polling state
  const pollingIntervalRef = useRef<number | null>(null);

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

  // Enhanced check for package existence - THIS IS THE KEY FIX
  const checkForExistingPackage = useCallback(async () => {
    if (!id) return false;
    
    try {
      // Check if package exists in database
      const { data: packageData, error } = await supabase
        .from("mystery_packages")
        .select("*")
        .eq("conversation_id", id)
        .single();

      console.log("🔍 Package existence check:", { 
        found: !!packageData, 
        hasHostGuide: !!packageData?.host_guide,
        hasTitle: !!packageData?.title,
        packageData: packageData 
      });

      if (packageData && (packageData.host_guide || packageData.title)) {
        console.log("✅ Package found with content - loading structured data");
        await fetchStructuredPackageData();
        return true;
      }
      
      return false;
    } catch (error) {
      console.error("Error checking package existence:", error);
      return false;
    }
  }, [id]);

  // Simplified status checking function
  const checkGenerationStatus = useCallback(async () => {
    if (!id) return;
    
    try {
      const status = await getPackageGenerationStatus(id);
      const previousStatus = generationStatus?.status;
      
      setGenerationStatus(status);
      setLastUpdate(new Date());
      
      console.log("Status check result:", status);
      
      // Handle completion - only trigger when status changes to completed
      if (status.status === 'completed' && previousStatus !== 'completed') {
        setGenerating(false);
        
        // Fetch the completed package data
        await fetchStructuredPackageData();
        
        // Only show notification once with action buttons
        if (!packageReadyNotified.current) {
          toast.success(
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <span className="font-semibold">Your Mystery Package is Ready!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your complete mystery package has been generated and is ready to use.
              </p>
              <div className="flex space-x-2">
                <Button size="sm" onClick={() => window.location.reload()}>
                  <Eye className="h-3 w-3 mr-1" />
                  View Mystery
                </Button>
                <Button size="sm" variant="outline" onClick={() => navigate("/dashboard")}>
                  Go to Dashboard
                </Button>
              </div>
            </div>,
            { 
              duration: 10000,
              id: 'mystery-completed'
            }
          );
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
          
      } else if (status.status === 'failed' && previousStatus !== 'failed') {
        setGenerating(false);
        
        // Show detailed error message with current step
        const errorMessage = status.currentStep || "Generation failed at an unknown step";
        
        if (status.resumable) {
          toast.error(
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-semibold">Generation Paused</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <p className="text-sm text-muted-foreground">
                Don't worry - your progress has been saved and you can resume where you left off.
              </p>
              <Button size="sm" onClick={handleResumeGeneration} className="w-full">
                <RefreshCw className="h-3 w-3 mr-1" />
                Resume Generation
              </Button>
            </div>,
            { 
              duration: 15000,
              id: 'mystery-failed-resumable'
            }
          );
        } else {
          toast.error(
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <span className="font-semibold">Generation Failed</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <p className="text-sm text-muted-foreground">
                You can try generating your mystery package again.
              </p>
              <Button size="sm" onClick={handleGeneratePackage} className="w-full">
                <RefreshCw className="h-3 w-3 mr-1" />
                Try Again
              </Button>
            </div>,
            { 
              duration: 15000,
              id: 'mystery-failed-retry'
            }
          );
        }
      }
      
      // Return status to help with polling control
      return status;
    } catch (error) {
      console.error("Error checking generation status:", error);
      return null;
    }
  }, [id, navigate, generationStatus?.status, handleResumeGeneration, handleGeneratePackage]);

  // Auto-refresh effect - simple 30-second interval with proper cleanup
  useEffect(() => {
    if (!id) return;

    const startAutoRefresh = () => {
      console.log("Starting auto-refresh every 30 seconds");
      
      // Clear any existing interval
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      
      // Initial status check
      checkGenerationStatus().then((status) => {
        // Only continue polling if generation is still in progress
        if (status && status.status === 'in_progress') {
          // Set up 30-second auto-refresh
          pollingIntervalRef.current = window.setInterval(async () => {
            console.log("Auto-refreshing generation status...");
            const currentStatus = await checkGenerationStatus();
            
            // Stop polling if generation is complete or failed
            if (currentStatus && (currentStatus.status === 'completed' || currentStatus.status === 'failed')) {
              if (pollingIntervalRef.current) {
                console.log("Stopping auto-refresh - generation finished");
                clearInterval(pollingIntervalRef.current);
                pollingIntervalRef.current = null;
              }
            }
          }, 30000); // 30 seconds
        }
      });
    };

    const stopAutoRefresh = () => {
      if (pollingIntervalRef.current) {
        console.log("Stopping auto-refresh");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Start auto-refresh if generation is in progress or generating
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
          evidenceCards: packageData.evidence_cards ? JSON.stringify(packageData.evidence_cards) : null,
          relationshipMatrix: packageData.relationship_matrix ? JSON.stringify(packageData.relationship_matrix) : null,
          detectiveScript: packageData.detective_script,
        };
        
        setPackageData(structuredPackageData);
        console.log("Structured package data loaded:", structuredPackageData);

        // PRIMARY: Fetch characters from database using the package ID
        const { data: charactersData, error: charactersError } = await supabase
          .from("mystery_characters")
          .select("*")
          .eq("package_id", packageData.id)
          .order("character_name");

        if (charactersError) {
          console.error("Error fetching characters from database:", charactersError);
          // FALLBACK: If database query fails, try text parsing
          console.log("Falling back to text parsing for characters");
          const parsedCharacters = extractCharactersFromText();
          setCharacters(parsedCharacters);
        } else if (charactersData && charactersData.length > 0) {
          // SUCCESS: Use database characters as primary source
          console.log("Characters loaded from database:", charactersData);
          setCharacters(charactersData);
        } else {
          // FALLBACK: If database is empty, try text parsing
          console.log("No characters in database, falling back to text parsing");
          const parsedCharacters = extractCharactersFromText();
          setCharacters(parsedCharacters);
        }
      }
    } catch (error) {
      console.error("Error fetching structured package data:", error);
    }
  };

  // Helper function to extract characters from text (fallback only)
  const extractCharactersFromText = (): MysteryCharacter[] => {
    if (!packageContent) return [];
    
    const charactersList: MysteryCharacter[] = [];
    const characterPattern = /# ([^-\n]+) - CHARACTER GUIDE\n([\s\S]*?)(?=# \w+ - CHARACTER GUIDE|# |$)/g;
    
    let match;
    while ((match = characterPattern.exec(packageContent)) !== null) {
      const characterName = match[1].trim();
      const characterContent = match[2].trim();
      
      charactersList.push({
        id: crypto.randomUUID(),
        package_id: id || "",
        character_name: characterName,
        description: characterContent.substring(0, characterContent.indexOf('\n\n')) || '',
        background: '',
        relationships: [],
        secrets: []
      });
    }
    
    console.log("Characters extracted from text parsing:", charactersList);
    return charactersList;
  };

  // Initial data loading - UPDATED WITH BETTER PACKAGE DETECTION
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

        // ENHANCED: Always check for existing package first
        const hasExistingPackage = await checkForExistingPackage();
        
        if (!hasExistingPackage) {
          // Only check generation status if no existing package found
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
  }, [id, checkForExistingPackage]);

  // Manual refresh function
  const handleManualRefresh = () => {
    console.log("Manual refresh triggered");
    checkGenerationStatus();
  };

  // Render generation progress
  const renderGenerationProgress = () => {
    if (!generationStatus) return null;
    
    // Show error state for failed generation
    if (generationStatus.status === 'failed') {
      return (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-red-700">
              <div className="flex items-center space-x-2">
                <XCircle className="h-5 w-5" />
                <span>Generation Failed</span>
              </div>
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
            <CardDescription className="text-red-600">
              {generationStatus.currentStep || "An error occurred during generation"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="border-red-200">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>What happened?</AlertTitle>
              <AlertDescription>
                {generationStatus.resumable 
                  ? "Your generation encountered an issue but can be resumed from where it left off. Your progress has been saved."
                  : "The generation process failed and needs to be restarted. Don't worry - this happens sometimes and trying again usually works."
                }
              </AlertDescription>
            </Alert>
            
            <div className="flex space-x-2">
              {generationStatus.resumable ? (
                <Button onClick={handleResumeGeneration} disabled={generating} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Resume Generation
                </Button>
              ) : (
                <Button onClick={handleGeneratePackage} disabled={generating} className="flex-1">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
              <Button variant="outline" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    
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
          <div className="flex flex-col md:flex-row gap-4 text-sm">
            <div className="flex-1 border rounded-md p-3">
              <div className="font-medium mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Current Step</span>
              </div>
              <p className="text-muted-foreground">
                {generationStatus.currentStep}
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

  // UPDATED: Better logic for determining when to show tabs vs generation
  const shouldShowTabs = () => {
    return (
      generationStatus?.status === 'completed' || 
      packageContent || 
      packageData ||
      (mystery && mystery.is_paid && mystery.has_complete_package) ||
      (packageData && (packageData.hostGuide || packageData.title))
    );
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {/* Show tabs for completed or purchased mysteries */}
          {shouldShowTabs() ? (
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
