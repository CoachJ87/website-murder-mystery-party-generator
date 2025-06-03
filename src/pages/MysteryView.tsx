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
  
  // Controlled logging and polling
  const DEBUG_MODE = process.env.NODE_ENV === 'development';
  const packageReadyNotified = useRef<boolean>(false);
  const pollingIntervalRef = useRef<number | null>(null);
  const lastStatusCheck = useRef<number>(0);
  const lastLogTime = useRef<number>(0);

  const debugLog = useCallback((message: string, data?: any) => {
    if (!DEBUG_MODE) return;
    
    const now = Date.now();
    // Only log every 15 seconds max
    if (now - lastLogTime.current > 15000) {
      console.log(`[MysteryView] ${message}`, data ? JSON.stringify(data).slice(0, 100) + '...' : '');
      lastLogTime.current = now;
    }
  }, []);

  // Fetch structured package data with proper error handling
  const fetchStructuredPackageData = useCallback(async () => {
    if (!id) {
      console.log("❌ [DEBUG] No ID provided to fetchStructuredPackageData");
      return;
    }

    try {
      console.log("🔍 [DEBUG] Fetching structured package data for:", id);
      
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
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (packageError) {
        console.error("❌ [DEBUG] Error fetching package data:", packageError);
        return;
      }

      if (packageData) {
        console.log("✅ [DEBUG] Package data found:", packageData);
        
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
        console.log("✅ [DEBUG] Structured package data loaded");

        // Fetch characters from database
        const { data: charactersData, error: charactersError } = await supabase
          .from("mystery_characters")
          .select("*")
          .eq("package_id", packageData.id)
          .order("character_name");

        if (charactersError) {
          console.error("❌ [DEBUG] Error fetching characters:", charactersError);
        } else if (charactersData && charactersData.length > 0) {
          setCharacters(charactersData);
          console.log(`✅ [DEBUG] Loaded ${charactersData.length} characters from database`);
        }
      } else {
        console.log("ℹ️ [DEBUG] No package data found");
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error in fetchStructuredPackageData:", error);
    }
  }, [id]);

  // Throttled status checking to prevent spam
  const throttledCheckGenerationStatus = useCallback(async () => {
    if (!id) return null;
    
    const now = Date.now();
    
    // Don't check more than once every 10 seconds
    if (now - lastStatusCheck.current < 10000) {
      debugLog("Status check throttled");
      return generationStatus;
    }
    
    lastStatusCheck.current = now;
    
    try {
      console.log("🔍 [DEBUG] Checking generation status for:", id);
      const status = await getPackageGenerationStatus(id);
      const previousStatus = generationStatus?.status;
      
      console.log("📊 [DEBUG] Status check result:", status.status, "(was:", previousStatus + ")");
      
      setGenerationStatus(status);
      setLastUpdate(new Date());
      
      // Handle completion - only trigger when status changes to completed
      if (status.status === 'completed' && previousStatus !== 'completed') {
        console.log("🎉 [DEBUG] Generation completed! Stopping polling and fetching data...");
        setGenerating(false);
        
        // Stop polling immediately
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          console.log("⏹️ [DEBUG] Polling stopped");
        }
        
        // Fetch the completed package data
        await fetchStructuredPackageData();
        
        // Only show notification once
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
            has_complete_package: true,
            display_status: "purchased"
          })
          .eq("id", id);
          
      } else if (status.status === 'failed' && previousStatus !== 'failed') {
        console.log("❌ [DEBUG] Generation failed");
        setGenerating(false);
        
        // Stop polling on failure
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }
        
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
      
      return status;
    } catch (error) {
      console.error("❌ [DEBUG] Error checking generation status:", error);
      return null;
    }
  }, [id, navigate, generationStatus?.status, fetchStructuredPackageData, debugLog]);

  // Controlled auto-refresh with proper cleanup
  useEffect(() => {
    if (!id) return;

    const cleanup = () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
        console.log("⏹️ [DEBUG] Auto-refresh stopped");
      }
    };

    const shouldStartPolling = generationStatus?.status === 'in_progress' && !generating;
    const isAlreadyPolling = pollingIntervalRef.current !== null;

    if (shouldStartPolling && !isAlreadyPolling) {
      console.log("▶️ [DEBUG] Starting controlled auto-refresh (15s intervals)");
      
      // Initial status check
      throttledCheckGenerationStatus().then((status) => {
        // Only continue polling if still in progress
        if (status && status.status === 'in_progress') {
          pollingIntervalRef.current = window.setInterval(async () => {
            const currentStatus = await throttledCheckGenerationStatus();
            
            // Stop polling if generation is complete or failed
            if (currentStatus && (currentStatus.status === 'completed' || currentStatus.status === 'failed')) {
              cleanup();
            }
          }, 15000); // 15 seconds for faster detection
        }
      });
    } else if (!shouldStartPolling && isAlreadyPolling) {
      cleanup();
    }

    return cleanup;
  }, [id, generationStatus?.status, generating, throttledCheckGenerationStatus]);

  // Resume generation handler
  const handleResumeGeneration = useCallback(async () => {
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
      
      debugLog("Resume generation initiated");
      
    } catch (error: any) {
      debugLog("Error resuming package generation", error);
      setGenerating(false);
      toast.error(error.message || "Failed to resume generation");
    }
  }, [id, debugLog]);

  // Generate package handler
  const handleGeneratePackage = useCallback(async () => {
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
      
      debugLog("Generation started, auto-refresh will check status");
      
    } catch (error: any) {
      debugLog("Error starting package generation", error);
      setGenerating(false);
      toast.error(error.message || "Failed to start package generation");
    }
  }, [id, debugLog]);

  // Initial data loading
  useEffect(() => {
    const fetchMystery = async () => {
      if (!id) return;

      setLoading(true);
      try {
        console.log("🔍 [DEBUG] Starting fetchMystery for:", id);
        
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
          console.error("❌ [DEBUG] Error fetching mystery:", error);
          toast.error("Failed to load mystery");
          return;
        }

        console.log("✅ [DEBUG] Mystery data loaded:", {
          id: conversation.id,
          is_paid: conversation.is_paid,
          needs_package_generation: conversation.needs_package_generation,
          has_complete_package: conversation.has_complete_package
        });

        setMystery(conversation);

        // Check generation status if package generation is needed OR if already paid
        if (conversation.needs_package_generation || conversation.is_paid || conversation.has_complete_package) {
          const status = await getPackageGenerationStatus(id);
          console.log("📊 [DEBUG] Initial status check:", status);
          setGenerationStatus(status);
          setLastUpdate(new Date());
          
          if (status.status === 'in_progress') {
            setGenerating(true);
            console.log("🔄 [DEBUG] Generation in progress, starting polling");
          } else if (status.status === 'completed') {
            // Reset notification state on new page load if package is complete
            packageReadyNotified.current = false;
            console.log("✅ [DEBUG] Generation already completed, loading data");
            
            // Load the package data immediately
            await fetchStructuredPackageData();
            
            await supabase
              .from("conversations")
              .update({
                is_paid: true,
                has_complete_package: true,
                display_status: "purchased",
                mystery_data: {
                  ...conversation.mystery_data,
                  status: "purchased"
                }
              })
              .eq("id", id);
          }
        }

        // Always try to fetch package data if conversation indicates it should exist
        if (conversation.has_complete_package || conversation.is_paid) {
          await fetchStructuredPackageData();
        }
      } catch (error) {
        console.error("❌ [DEBUG] Error in fetchMystery:", error);
        toast.error("Failed to load mystery");
      } finally {
        setLoading(false);
      }
    };

    fetchMystery();
  }, [id, fetchStructuredPackageData]);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    debugLog("Manual refresh triggered");
    throttledCheckGenerationStatus();
  }, [throttledCheckGenerationStatus, debugLog]);

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
            This process takes 3-5 minutes to complete. This page automatically refreshes every 15 seconds.
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
            <strong>Auto-refresh:</strong> This page automatically checks for updates every 15 seconds.
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

  // Updated logic to determine when to show tabs
  const shouldShowTabs = (
    generationStatus?.status === 'completed' || 
    packageContent || 
    packageData ||
    characters.length > 0 ||
    (mystery && (mystery.is_paid || mystery.has_complete_package))
  );

  console.log("🎭 [DEBUG] shouldShowTabs decision:", {
    generationStatus: generationStatus?.status,
    hasPackageContent: !!packageContent,
    hasPackageData: !!packageData,
    charactersCount: characters.length,
    mysteryPaid: mystery?.is_paid,
    mysteryComplete: mystery?.has_complete_package,
    result: shouldShowTabs
  });

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {shouldShowTabs ? (
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
