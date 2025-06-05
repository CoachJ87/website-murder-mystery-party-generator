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
import { extractTitleFromMessages } from "@/utils/titleExtraction";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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
  const [messages, setMessages] = useState<any[]>([]);
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
  const isMobile = useIsMobile();
  
  // Controlled logging and polling
  const DEBUG_MODE = process.env.NODE_ENV === 'development';
  const packageReadyNotified = useRef<boolean>(false);
  const lastStatusCheck = useRef<number>(0);
  const lastLogTime = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

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

  // Fetch conversation messages for title extraction
  const fetchMessages = useCallback(async () => {
    if (!id) return;

    try {
      const { data: messagesData, error: messagesError } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (messagesError) {
        console.error("❌ [DEBUG] Error fetching messages:", messagesError);
        return;
      }

      if (messagesData) {
        setMessages(messagesData);
        console.log(`✅ [DEBUG] Loaded ${messagesData.length} messages for title extraction`);
      }
    } catch (error) {
      console.error("❌ [DEBUG] Error in fetchMessages:", error);
    }
  }, [id]);

  // Extract mystery title using the same logic as HomeDashboard
  const extractedTitle = useCallback(() => {
    if (!messages || messages.length === 0) return null;
    
    try {
      return extractTitleFromMessages(messages);
    } catch (error) {
      console.error("❌ [DEBUG] Error extracting title:", error);
      return null;
    }
  }, [messages]);

  // Get the best available title with proper fallback hierarchy
  const getMysteryTitle = useCallback(() => {
    const aiGeneratedTitle = extractedTitle();
    
    // Fallback hierarchy: AI title → conversation.title → theme → "Mystery Package"
    return aiGeneratedTitle || 
           mystery?.title || 
           mystery?.mystery_data?.theme || 
           "Mystery Package";
  }, [extractedTitle, mystery]);

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

  // Enhanced status checking with comprehensive completion detection
  const checkGenerationStatus = useCallback(async () => {
    if (!id) return null;
    
    const now = Date.now();
    
    // Don't check more than once every 10 seconds
    if (now - lastStatusCheck.current < 10000) {
      debugLog("🔄 Status check throttled");
      return generationStatus;
    }
    
    lastStatusCheck.current = now;
    
    try {
      console.log("=== STATUS CHECK DEBUG === Starting comprehensive status check");
      
      // STEP 1: Check mystery_packages table for completion indicators
      const { data: packageData, error: packageError } = await supabase
        .from("mystery_packages")
        .select(`
          title,
          host_guide,
          generation_completed_at,
          generation_status,
          id
        `)
        .eq("conversation_id", id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log("=== STATUS CHECK DEBUG === Package data:", packageData);
      if (packageError) {
        console.error("=== STATUS CHECK DEBUG === Package error:", packageError);
      }

      // STEP 2: Check conversations table for completion indicators  
      const { data: conversationData, error: conversationError } = await supabase
        .from("conversations")
        .select(`
          has_complete_package,
          is_paid,
          needs_package_generation,
          status,
          display_status
        `)
        .eq("id", id)
        .single();

      console.log("=== STATUS CHECK DEBUG === Conversation data:", conversationData);
      if (conversationError) {
        console.error("=== STATUS CHECK DEBUG === Conversation error:", conversationError);
      }

      // STEP 3: Determine completion status from multiple indicators
      const hasActualContent = packageData && (
        packageData.title || 
        packageData.host_guide || 
        packageData.generation_completed_at
      );

      const conversationIndicatesComplete = conversationData && (
        conversationData.has_complete_package === true ||
        conversationData.is_paid === true
      );

      const packageStatusComplete = packageData?.generation_status?.status === 'completed';

      console.log("=== STATUS CHECK DEBUG === Completion indicators:", {
        hasActualContent,
        conversationIndicatesComplete,
        packageStatusComplete,
        packageGenerationStatus: packageData?.generation_status,
        conversationStatus: conversationData
      });

      // STEP 4: If any completion indicator is true, force completion
      if (hasActualContent || conversationIndicatesComplete || packageStatusComplete) {
        const previousStatus = generationStatus?.status;
        console.log("=== STATUS CHECK DEBUG === Completion detected, previous status:", previousStatus);
        
        // Create completed status object
        const completedStatus = {
          status: 'completed' as const,
          progress: 100,
          currentStep: 'Package generation completed',
          sections: {
            hostGuide: true,
            characters: true,
            clues: true
          },
          resumable: false
        };
        
        // Update the database status to match reality
        if (packageData?.id) {
          await supabase
            .from("mystery_packages")
            .update({
              generation_status: completedStatus
            })
            .eq("id", packageData.id);
        }
        
        console.log("=== STATUS CHECK DEBUG === Forced status to completed");
        setGenerationStatus(completedStatus);
        setLastUpdate(new Date());
        
        // Only trigger completion actions when status changes to completed
        if (previousStatus !== 'completed') {
          console.log("=== STATUS CHECK DEBUG === Status changed to completed - triggering completion actions");
          setGenerating(false);
          
          // Fetch the completed package data
          await fetchStructuredPackageData();
          
          // Update conversation status for consistency
          await supabase
            .from("conversations")
            .update({
              status: "purchased",
              is_paid: true,
              needs_package_generation: false,
              display_status: "purchased",
              has_complete_package: true
            })
            .eq("id", id);
          
          // Show success notification only once
          if (!packageReadyNotified.current) {
            toast.success("Your mystery package is ready! The page will refresh automatically.", {
              duration: 10000,
              id: 'mystery-completed'
            });
            packageReadyNotified.current = true;
            
            // Force page refresh after 2 seconds to ensure all data loads
            setTimeout(() => window.location.reload(), 2000);
          }
        }
        
        return completedStatus;
      }
      
      // STEP 5: Fallback to normal status checking if no completion detected
      console.log("=== STATUS CHECK DEBUG === No completion detected, using normal status check");
      const status = await getPackageGenerationStatus(id);
      const previousStatus = generationStatus?.status;
      
      console.log("=== STATUS CHECK DEBUG === Normal status result:", {
        currentStatus: status.status,
        previousStatus,
        statusChanged: status.status !== previousStatus
      });
      
      setGenerationStatus(status);
      setLastUpdate(new Date());
      
      // Handle failed status
      if (status.status === 'failed' && previousStatus !== 'failed') {
        console.log("=== STATUS CHECK DEBUG === Generation failed");
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
      
      return status;
    } catch (error) {
      console.error("=== STATUS CHECK DEBUG === Error in status checking:", error);
      return null;
    }
  }, [id, navigate, generationStatus?.status, fetchStructuredPackageData, debugLog, handleResumeGeneration, handleGeneratePackage]);

  // Fixed auto-refresh polling with proper cleanup
  useEffect(() => {
    if (!id) return;

    // Clear any existing interval
    const clearPolling = () => {
      if (pollingIntervalRef.current) {
        console.log("🛑 [DEBUG] Clearing existing polling interval");
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };

    // Determine if we should be polling
    const shouldPoll = (
      (generationStatus?.status === 'in_progress') || 
      (generating && !generationStatus) ||
      (generating && generationStatus?.status !== 'completed' && generationStatus?.status !== 'failed')
    );

    console.log("🔍 [DEBUG] Polling decision:", {
      shouldPoll,
      generationStatus: generationStatus?.status,
      generating,
      hasInterval: !!pollingIntervalRef.current
    });

    if (shouldPoll && !pollingIntervalRef.current) {
      console.log("▶️ [DEBUG] Starting auto-refresh polling (30s intervals)");
      
      // Start polling
      pollingIntervalRef.current = setInterval(async () => {
        console.log("🔄 [DEBUG] Polling tick - checking generation status");
        
        try {
          const currentStatus = await checkGenerationStatus();
          
          // Stop polling if generation is complete or failed
          if (currentStatus && (currentStatus.status === 'completed' || currentStatus.status === 'failed')) {
            console.log(`✅ [DEBUG] Generation finished with status: ${currentStatus.status} - stopping polling`);
            clearPolling();
          }
        } catch (error) {
          console.error("❌ [DEBUG] Error during polling tick:", error);
        }
      }, 30000); // 30-second intervals
      
    } else if (!shouldPoll && pollingIntervalRef.current) {
      console.log("⏹️ [DEBUG] Stopping polling - conditions no longer met");
      clearPolling();
    }

    // Cleanup function
    return () => {
      console.log("🧹 [DEBUG] useEffect cleanup - clearing polling interval");
      clearPolling();
    };
  }, [id, generationStatus?.status, generating, checkGenerationStatus]);

  // NEW: Realtime subscription for instant updates
  useEffect(() => {
    if (!id) return;

    console.log("🔔 [REALTIME] Setting up Supabase Realtime subscription for mystery_packages");
    
    const subscription = supabase
      .channel('mystery_packages')
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'mystery_packages',
          filter: `conversation_id=eq.${id}`
        }, 
        async (payload) => {
          console.log("🔔 [REALTIME] Real-time update received:", payload);
          
          // Trigger immediate status check when update is received
          try {
            await checkGenerationStatus();
            console.log("🔔 [REALTIME] Status check triggered by real-time update");
          } catch (error) {
            console.error("🔔 [REALTIME] Error during real-time triggered status check:", error);
          }
        }
      )
      .subscribe((status) => {
        console.log("🔔 [REALTIME] Subscription status:", status);
      });

    // Cleanup function
    return () => {
      console.log("🔔 [REALTIME] Unsubscribing from real-time updates");
      subscription.unsubscribe();
    };
  }, [id, checkGenerationStatus]);

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

        // Fetch messages for title extraction
        await fetchMessages();

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
  }, [id, fetchStructuredPackageData, fetchMessages]);

  // Manual refresh function
  const handleManualRefresh = useCallback(() => {
    debugLog("Manual refresh triggered");
    checkGenerationStatus();
  }, [checkGenerationStatus, debugLog]);

  // Render generation progress with mobile optimization
  const renderGenerationProgress = () => {
    if (!generationStatus) return null;
    
    // Show error state for failed generation
    if (generationStatus.status === 'failed') {
      return (
        <Card className={cn(
          "mb-6 border-red-200 bg-red-50",
          isMobile && "mx-2"
        )}>
          <CardHeader className={cn(isMobile && "p-4 pb-3")}>
            <CardTitle className={cn(
              "flex items-center justify-between text-red-700",
              isMobile ? "text-lg flex-col space-y-2 items-start" : "flex-row"
            )}>
              <div className="flex items-center space-x-2">
                <XCircle className={cn(
                  "text-red-500",
                  isMobile ? "h-4 w-4" : "h-5 w-5"
                )} />
                <span className={cn(isMobile && "text-base")}>Generation Failed</span>
              </div>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleManualRefresh} 
                className={cn(
                  "h-8 w-8 p-0",
                  isMobile && "self-end"
                )}
                title="Refresh status"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription className={cn(
              "text-red-600",
              isMobile && "text-sm"
            )}>
              {generationStatus.currentStep || "An error occurred during generation"}
            </CardDescription>
          </CardHeader>
          <CardContent className={cn(
            "space-y-4",
            isMobile && "p-4 pt-0 space-y-3"
          )}>
            <Alert className="border-red-200">
              <AlertTriangle className={cn(
                isMobile ? "h-3 w-3" : "h-4 w-4"
              )} />
              <AlertTitle className={cn(isMobile && "text-sm")}>What happened?</AlertTitle>
              <AlertDescription className={cn(isMobile && "text-xs")}>
                {generationStatus.resumable 
                  ? "Your generation encountered an issue but can be resumed from where it left off. Your progress has been saved."
                  : "The generation process failed and needs to be restarted. Don't worry - this happens sometimes and trying again usually works."
                }
              </AlertDescription>
            </Alert>
            
            <div className={cn(
              "flex space-x-2",
              isMobile && "flex-col space-x-0 space-y-2"
            )}>
              {generationStatus.resumable ? (
                <Button 
                  onClick={handleResumeGeneration} 
                  disabled={generating} 
                  className={cn(
                    "flex-1",
                    isMobile && "w-full text-sm h-10"
                  )}
                >
                  <RefreshCw className={cn(
                    "mr-2",
                    isMobile ? "h-3 w-3" : "h-4 w-4"
                  )} />
                  Resume Generation
                </Button>
              ) : (
                <Button 
                  onClick={handleGeneratePackage} 
                  disabled={generating} 
                  className={cn(
                    "flex-1",
                    isMobile && "w-full text-sm h-10"
                  )}
                >
                  <RefreshCw className={cn(
                    "mr-2",
                    isMobile ? "h-3 w-3" : "h-4 w-4"
                  )} />
                  Try Again
                </Button>
              )}
              <Button 
                variant="outline" 
                onClick={() => navigate("/dashboard")}
                className={cn(isMobile && "w-full text-sm h-10")}
              >
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }
    
    return (
      <Card className={cn(
        "mb-6",
        isMobile && "mx-2"
      )}>
        <CardHeader className={cn(isMobile && "p-4 pb-3")}>
          <CardTitle className={cn(
            "flex items-center justify-between",
            isMobile ? "text-lg flex-col space-y-2 items-start" : "flex-row"
          )}>
            <span className={cn(isMobile && "text-base")}>Generating Your Mystery Package</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleManualRefresh} 
              className={cn(
                "h-8 w-8 p-0",
                isMobile && "self-end"
              )}
              title="Refresh status"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription className={cn(isMobile && "text-sm")}>
            This process takes 3-5 minutes to complete. This page automatically refreshes every 15 seconds.
          </CardDescription>
        </CardHeader>
        <CardContent className={cn(
          "space-y-4",
          isMobile && "p-4 pt-0 space-y-3"
        )}>
          <div className={cn(
            "flex flex-col md:flex-row gap-4 text-sm",
            isMobile && "gap-3"
          )}>
            <div className={cn(
              "flex-1 border rounded-md p-3",
              isMobile && "p-3"
            )}>
              <div className={cn(
                "font-medium mb-2 flex items-center",
                isMobile && "text-sm"
              )}>
                <Clock className={cn(
                  "mr-2",
                  isMobile ? "h-3 w-3" : "h-4 w-4"
                )} />
                <span>Current Step</span>
              </div>
              <p className={cn(
                "text-muted-foreground",
                isMobile && "text-xs leading-relaxed"
              )}>
                {generationStatus.currentStep}
              </p>
            </div>
            
            <div className={cn(
              "flex-1 border rounded-md p-3",
              isMobile && "p-3"
            )}>
              <div className={cn(
                "font-medium mb-2",
                isMobile && "text-sm"
              )}>
                Generation Progress
              </div>
              <div className="space-y-1">
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${generationStatus.sections?.hostGuide ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className={cn(
                    generationStatus.sections?.hostGuide ? "" : "text-muted-foreground",
                    isMobile && "text-xs"
                  )}>
                    Host Guide
                  </span>
                </div>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${generationStatus.sections?.characters ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className={cn(
                    generationStatus.sections?.characters ? "" : "text-muted-foreground",
                    isMobile && "text-xs"
                  )}>
                    Character Guides
                  </span>
                </div>
                <div className="flex items-center">
                  <div className={`h-2 w-2 rounded-full mr-2 ${generationStatus.sections?.clues ? "bg-green-500" : "bg-muted"}`}></div>
                  <span className={cn(
                    generationStatus.sections?.clues ? "" : "text-muted-foreground",
                    isMobile && "text-xs"
                  )}>
                    Clues & Materials
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <p className={cn(
            "text-sm text-muted-foreground",
            isMobile && "text-xs"
          )}>
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
        <main className={cn(
          "flex-1 py-12 px-4",
          isMobile && "py-6 px-3"
        )}>
          <div className="container mx-auto max-w-4xl">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className={cn(
              "text-center mt-4",
              isMobile && "text-sm mt-3"
            )}>
              Loading your mystery...
            </p>
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
      <main className={cn(
        "flex-1 py-12 px-4",
        isMobile && "py-6 px-3"
      )}>
        <div className={cn(
          "container mx-auto max-w-4xl",
          isMobile && "max-w-full"
        )}>
          {shouldShowTabs ? (
            <MysteryPackageTabView 
              packageContent={packageContent || ""} 
              mysteryTitle={getMysteryTitle()}
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
              <Card className={cn(
                "mb-6",
                isMobile && "mx-2"
              )}>
                <CardHeader className={cn(isMobile && "p-4 pb-3")}>
                  <CardTitle className={cn(isMobile && "text-lg")}>
                    Generate Your Mystery Package
                  </CardTitle>
                  <CardDescription className={cn(isMobile && "text-sm")}>
                    Your mystery is ready to be generated. Click the button below to create your custom murder mystery package.
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn(isMobile && "p-4 pt-0")}>
                  <Button
                    onClick={handleGeneratePackage}
                    disabled={generating}
                    className={cn(
                      "w-full sm:w-auto",
                      isMobile && "w-full text-sm h-11"
                    )}
                  >
                    {generating ? (
                      <>
                        <RefreshCw className={cn(
                          "mr-2 animate-spin",
                          isMobile ? "h-3 w-3" : "h-4 w-4"
                        )} />
                        Starting Generation...
                      </>
                    ) : (
                      "Generate Mystery Package"
                    )}
                  </Button>
                  <p className={cn(
                    "text-sm text-muted-foreground mt-3",
                    isMobile && "text-xs mt-2"
                  )}>
                    Generation takes 3-5 minutes. This page will auto-refresh to show progress.
                  </p>
                </CardContent>
              </Card>
            )
          )}
          
          <div className={cn(
            "flex justify-center mt-8",
            isMobile && "mt-6"
          )}>
            <Button 
              variant="outline" 
              onClick={() => navigate("/dashboard")}
              className={cn(isMobile && "text-sm h-10 px-6")}
            >
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
