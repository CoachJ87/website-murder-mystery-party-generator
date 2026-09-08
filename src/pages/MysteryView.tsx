import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  GenerationStatus,
  updatePackageField,
  updateCharacterField,
} from "@/services/mysteryPackageService";
import { useAuth } from "@/context/AuthContext";
import { RefreshCw, AlertTriangle, Clock, CheckCircle2, Eye, XCircle, Loader2 } from "lucide-react";
import MysteryPackageTabView from "@/components/MysteryPackageTabView";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MysteryCharacter } from "@/interfaces/mystery";
import { extractTitleFromMessages } from "@/utils/titleExtraction";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";
import { trackMysteryCreation, trackGenerationCompleted, trackGenerationFailed } from "@/lib/analytics";
import GenerationProgress from "@/components/GenerationProgress";

interface MysteryPackageData {
  title?: string;
  gameOverview?: string;
  hostGuide?: string;
  materials?: string;
  preparation?: string;
  timeline?: string;
  hostingTips?: string;
  evidenceCards?: string;
  detectiveScript?: string;
  // Set by a DB trigger when generation_status flips to needs_review; cleared
  // when it flips away. Used to gate the customer-facing warning so they don't
  // see it during the auto-recovery window (< 10 min).
  needs_review_at?: string | null;
}

// Window during which auto-recovery is expected to heal partial failures.
// While needs_review is younger than this, the warning is suppressed.
const NEEDS_REVIEW_SILENT_WINDOW_MS = 10 * 60 * 1000;

// Window during which generation_status can flip to 'completed' before every
// requested character's row has actually landed (ADR-0103 Addendum 29 — async
// child writers outside this app's own gating). Longest observed real gap was
// ~3 hours on a 30-character package; this only widens the destination of an
// already-legitimate "still finalizing" screen for fresh generations, so a
// generous cushion is cheap. Only applied while a package is this recently
// started — older packages (which may have since been legitimately reduced by
// Remove-a-Character, ADR-0036) are never blocked by a stale character count.
const CHARACTER_COUNT_GATE_WINDOW_MS = 4 * 60 * 60 * 1000;

// Generation timing scales with cast size (ADR-0043 follow-up). A 32-player
// package legitimately takes ~17 min, so the old flat 15-min client timeout
// false-alarmed on large jobs — firing notify-generation-issue and showing the
// customer a "team notified" card mid-success ("Death At Thornfield Manor",
// 2026-07-27). The timeout for each tier is kept comfortably above the ETA we
// display for that tier, so we never alarm before the time we promised.
// Tiers map to the mysteryView.timing.{small,medium,large,xlarge} i18n keys.
const getGenerationTiming = (playerCount: number): { etaKey: string; timeoutMin: number } => {
  const n = playerCount || 6;
  if (n <= 10) return { etaKey: 'small', timeoutMin: 20 };
  if (n <= 18) return { etaKey: 'medium', timeoutMin: 30 };
  if (n <= 28) return { etaKey: 'large', timeoutMin: 40 };
  return { etaKey: 'xlarge', timeoutMin: 50 };
};

const MysteryView = () => {
  const [mystery, setMystery] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [packageData, setPackageData] = useState<MysteryPackageData | null>(null);
  const [packageId, setPackageId] = useState<string | null>(null);
  const [characters, setCharacters] = useState<MysteryCharacter[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  
  // Controlled logging and polling
  const DEBUG_MODE = process.env.NODE_ENV === 'development';
  const packageReadyNotified = useRef<boolean>(false);
  const lastStatusCheck = useRef<number>(0);
  const lastLogTime = useRef<number>(0);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const generationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutNotifiedRef = useRef<boolean>(false);
  const [generationTimedOut, setGenerationTimedOut] = useState(false);

  // Hard quality guarantee (ADR-0077): while a package is held `needs_review`
  // and still inside the silent self-heal window, content is never revealed —
  // the building screen shows instead. `needs_review_at == null` (trigger
  // didn't stamp it, or ADR-0058's ordering fix hasn't run for this row) is
  // treated as OUT of the window rather than hidden forever, so a package can
  // never get stuck — it falls through to the existing post-window reveal +
  // warning banner immediately, same as today's ts-is-null handling below.
  const needsReviewWithinWindow = useMemo(() => {
    if (generationStatus?.status !== 'needs_review') return false;
    const ts = packageData?.needs_review_at;
    if (!ts) return false;
    const ageMs = Date.now() - new Date(ts).getTime();
    return ageMs < NEEDS_REVIEW_SILENT_WINDOW_MS;
  }, [generationStatus?.status, packageData?.needs_review_at]);

  // No `startedAt` (older packages predating this field, or ones already
  // stably completed) is treated as OUT of the window — same fail-open
  // principle as needsReviewWithinWindow above, so a legitimately-adapted or
  // just-old package is never permanently blocked by a stale character count.
  const generationRecentlyStarted = useMemo(() => {
    const ts = generationStatus?.startedAt;
    if (!ts) return false;
    const ageMs = Date.now() - new Date(ts).getTime();
    return ageMs < CHARACTER_COUNT_GATE_WINDOW_MS;
  }, [generationStatus?.startedAt]);

  const debugLog = useCallback((message: string, data?: any) => {
    if (!DEBUG_MODE) return;
    
    const now = Date.now();
    // Only log every 15 seconds max
    if (now - lastLogTime.current > 15000) {
      console.log(`[MysteryView] ${message}`, data ? JSON.stringify(data).slice(0, 100) + '...' : '');
      lastLogTime.current = now;
    }
  }, []);

  // Generation time is consistent regardless of player count
  const getEstimatedTime = useCallback((playerCount: number) => {
    return t(`mysteryView.timing.${getGenerationTiming(playerCount).etaKey}`);
  }, [t]);

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
          evidence_card_images,
          detective_script,
          master_context,
          extracted_characters,
          needs_review_at,
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
          evidenceCardImages: packageData.evidence_card_images,
          detectiveScript: packageData.detective_script,
          master_context: packageData.master_context,
          extracted_characters: packageData.extracted_characters,
          needs_review_at: packageData.needs_review_at,
        };
        
        console.log("✅ [DEBUG] Structured package data loaded");

        // Fetch characters from database before setting state,
        // so all tabs populate at once (no partial content flash)
        const { data: charactersData, error: charactersError } = await supabase
          .from("mystery_characters")
          .select("*")
          .eq("package_id", packageData.id)
          .order("character_name");

        if (charactersError) {
          console.error("❌ [DEBUG] Error fetching characters:", charactersError);
        }

        // Batch state updates so all tabs show content simultaneously
        setPackageData(structuredPackageData);
        setPackageId(packageData.id);
        if (charactersData && charactersData.length > 0) {
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
    const title = aiGeneratedTitle || 
                 mystery?.title || 
                 mystery?.mystery_data?.theme || 
                 "Mystery Package";
    return title.replace(/\*\*/g, '');
  }, [extractedTitle, mystery]);

  // Save extracted title to database when available
  useEffect(() => {
    const updateMysteryTitle = async () => {
      if (!mystery?.id) return;

      const aiGeneratedTitle = extractedTitle();

      // Only update if we have a valid extracted title
      if (!aiGeneratedTitle) return;

      // Only update if current title is the default format
      const isDefaultTitle = mystery.title?.includes(' - ') && mystery.title?.includes('Players');
      if (!isDefaultTitle) return;

      console.log('🏷️ Updating mystery title to:', aiGeneratedTitle);

      const { error } = await supabase
        .from('conversations')
        .update({ title: aiGeneratedTitle })
        .eq('id', mystery.id);

      if (error) {
        console.error('Failed to update mystery title:', error);
      } else {
        console.log('✅ Mystery title updated successfully');
      }
    };

    updateMysteryTitle();
  }, [mystery?.id, mystery?.title, extractedTitle, messages]);

  // Resume generation handler
  const handleResumeGeneration = useCallback(async () => {
    if (!id) {
      toast.error(t("mysteryView.toasts.mysteryIdMissing"));
      return;
    }

    setGenerating(true);
    setGenerationTimedOut(false);
    timeoutNotifiedRef.current = false;
    try {
      toast.info(t("mysteryView.toasts.resumingGeneration"));

      // Reset notification state on resume
      packageReadyNotified.current = false;

      await resumePackageGeneration(id);

      debugLog("Resume generation initiated");

    } catch (error: any) {
      debugLog("Error resuming package generation", error);
      setGenerating(false);
      toast.error(error.message || t("mysteryView.toasts.resumeFailed"));
    }
  }, [id, debugLog, t]);

  // Generate package handler
  const handleGeneratePackage = useCallback(async () => {
    if (!id) {
      toast.error(t("mysteryView.toasts.mysteryIdMissing"));
      return;
    }

    setGenerating(true);
    packageReadyNotified.current = false; // Reset notification flag
    setGenerationTimedOut(false);
    timeoutNotifiedRef.current = false;

    // Immediately show the progress card so the UI doesn't linger on the
    // "Generate" button in its disabled state while we wait for the first
    // poll to flip generationStatus to in_progress.
    setGenerationStatus({
      status: 'in_progress',
      progress: 0,
      currentStep: 'Package generation in progress...',
      sections: {
        hostGuide: false,
        characters: false,
        clues: false,
      },
    });
    setLastUpdate(new Date());

    try {
      const estimatedTime = getEstimatedTime(mystery?.player_count || 6);
      toast.info(t("mysteryView.toasts.startingGeneration", { time: estimatedTime }));

      // Just call the webhook - don't wait for completion
      const genResult = await generateCompletePackage(id);

      // Concept-completeness entry gate (ADR-0043): generation was refused because
      // the mystery concept isn't finished (no character list yet). Don't leave the
      // user on a spinner — roll back and tell them to complete the chat.
      if (genResult === "needs_more_info") {
        setGenerating(false);
        setGenerationStatus(null);
        toast.error(
          t("mysteryView.toasts.conceptIncomplete"),
          { duration: 12000 }
        );
        return;
      }

      // Track mystery creation event for analytics
      trackMysteryCreation(mystery?.theme || 'unknown', {
        mystery_id: id,
        player_count: mystery?.player_count || 6,
        has_theme: !!mystery?.theme
      });

      debugLog("Generation started, auto-refresh will check status");

    } catch (error: any) {
      debugLog("Error starting package generation", error);
      setGenerating(false);
      // Roll back the optimistic progress card so the user can retry from the
      // Generate button instead of being stuck on an in_progress view.
      setGenerationStatus(null);
      toast.error(error.message || t("mysteryView.toasts.startGenerationFailed"));
    }
  }, [id, debugLog, t]);

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
          id,
          extracted_characters,
          characters:mystery_characters(count)
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

      // NOTE: is_paid alone does NOT indicate completion — it's set when the user pays,
      // before generation finishes. Only has_complete_package is a reliable completion signal.
      const conversationIndicatesComplete = conversationData && (
        conversationData.has_complete_package === true
      );

      const packageStatusComplete = packageData?.generation_status?.status === 'completed';
      const packageNeedsReview = packageData?.generation_status?.status === 'needs_review';

      // If flagged as needs_review, respect that and don't override
      if (packageNeedsReview) {
        const needsReviewStatus = {
          status: 'needs_review' as const,
          progress: 100,
          currentStep: packageData?.generation_status?.currentStep || 'Some character content needs attention',
          sections: packageData?.generation_status?.sections || { hostGuide: true, characters: false, clues: true },
          resumable: false,
        };
        setGenerationStatus(needsReviewStatus as any);
        setLastUpdate(new Date());
        setGenerating(false);
        return needsReviewStatus as any;
      }

      // Validate that all expected characters have been generated.
      // Completion invariant (ADR-0043): real character rows MUST exist before we
      // treat a package as complete. Previously this defaulted to `true` when
      // extracted_characters was empty/unparseable, so a package with zero
      // characters but a populated game_overview was force-completed (the
      // "Victorian mansion - 32 Players" incident). `generatedCount > 0` is now a
      // hard precondition — no characters, never complete.
      const generatedCount = packageData?.characters?.[0]?.count ?? 0;
      let allCharactersGenerated = generatedCount > 0;
      if (allCharactersGenerated && packageData?.extracted_characters) {
        try {
          const extracted = typeof packageData.extracted_characters === 'string'
            ? JSON.parse(packageData.extracted_characters)
            : packageData.extracted_characters;
          const expectedCount = Array.isArray(extracted) ? extracted.length : 0;
          allCharactersGenerated = expectedCount === 0 || generatedCount >= expectedCount;
          console.log(`=== STATUS CHECK DEBUG === Character count: ${generatedCount} generated, ${expectedCount} expected, allGenerated: ${allCharactersGenerated}`);
        } catch {
          // Parse failure: keep the "characters exist" result from above rather
          // than optimistically completing a package we can't validate.
          allCharactersGenerated = generatedCount > 0;
        }
      }

      console.log("=== STATUS CHECK DEBUG === Completion indicators:", {
        hasActualContent,
        conversationIndicatesComplete,
        packageStatusComplete,
        allCharactersGenerated,
        packageGenerationStatus: packageData?.generation_status,
        conversationStatus: conversationData
      });

      // If generation_status is explicitly 'in_progress', don't auto-complete unless
      // there is actual content (title/host_guide). This prevents premature completion
      // when the user navigates away during generation and comes back.
      const generationExplicitlyInProgress = packageData?.generation_status?.status === 'in_progress';

      // STEP 4: If completion indicators are true AND all characters generated, force completion
      // When generation is explicitly in-progress, require actual content — don't rely solely
      // on conversation-level flags which may have been set before generation finished.
      if ((hasActualContent || ((conversationIndicatesComplete || packageStatusComplete) && !generationExplicitlyInProgress)) && allCharactersGenerated) {
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
          // Keep generating=true until all data is loaded so tabs show spinner, not placeholder

          // Track generation completion for analytics
          trackGenerationCompleted(id!, {
            theme: mystery?.theme,
            player_count: mystery?.player_count,
          });

          // Fetch the completed package data BEFORE clearing generating state
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

          // Now that data is loaded, clear generating state so content shows
          setGenerating(false);

          // Show success notification only once
          if (!packageReadyNotified.current) {
            toast.success(t("mysteryView.toasts.packageReady"), {
              duration: 10000,
              id: 'mystery-completed'
            });
            packageReadyNotified.current = true;
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

        // Track generation failure for analytics
        trackGenerationFailed(id!, {
          error_step: status.currentStep || 'unknown',
          resumable: status.resumable,
        });
        
        // Show detailed error message with current step
        const errorMessage = status.currentStep || t("mysteryView.errors.unknownStep");

        if (status.resumable) {
          toast.error(
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="font-semibold">{t("mysteryView.errors.generationPaused")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("mysteryView.errors.progressSavedResume")}
              </p>
              <Button size="sm" onClick={handleResumeGeneration} className="w-full">
                <RefreshCw className="h-3 w-3 mr-1" />
                {t("mysteryView.buttons.resumeGeneration")}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {t("mysteryView.errors.stillTrouble")} <a href="/support" className="underline text-primary hover:text-primary/80">{t("mysteryView.errors.contactSupport")}</a>
              </p>
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
                <span className="font-semibold">{t("mysteryView.errors.generationFailed")}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                {errorMessage}
              </p>
              <p className="text-sm text-muted-foreground">
                {t("mysteryView.errors.canTryAgain")}
              </p>
              <Button size="sm" onClick={handleGeneratePackage} className="w-full">
                <RefreshCw className="h-3 w-3 mr-1" />
                {t("mysteryView.buttons.tryAgain")}
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                {t("mysteryView.errors.stillTrouble")} <a href="/support" className="underline text-primary hover:text-primary/80">{t("mysteryView.errors.contactSupport")}</a>
              </p>
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

  // Polling has been removed in favor of Supabase Realtime subscriptions
  // for more efficient and immediate updates

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

          // Trigger immediate status check + character/package refresh.
          // Without the package re-fetch, characters state stays stale and
          // the "We're Finalizing" warning fires even after children land.
          try {
            await Promise.all([
              checkGenerationStatus(),
              fetchStructuredPackageData(),
            ]);
            console.log("🔔 [REALTIME] Status + package refresh triggered by real-time update");
          } catch (error) {
            console.error("🔔 [REALTIME] Error during real-time triggered refresh:", error);
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
  }, [id, checkGenerationStatus, fetchStructuredPackageData]);

  // Realtime subscription for mystery_characters INSERT and UPDATE events.
  // INSERT: each child scenario completion → live "X of Y characters ready" count updates.
  // UPDATE: auto-recovery (or manual edits) fills in previously-missing fields →
  //         the UI silently refreshes so the customer never sees empty sections.
  useEffect(() => {
    if (!packageId) return;

    console.log("🔔 [REALTIME] Setting up mystery_characters subscription for packageId:", packageId);

    const subscription = supabase
      .channel(`mystery_characters_${packageId}`)
      .on('postgres_changes',
        {
          event: '*', // INSERT + UPDATE + DELETE (DELETE never happens in normal flow)
          schema: 'public',
          table: 'mystery_characters',
          filter: `package_id=eq.${packageId}`,
        },
        async () => {
          try {
            await fetchStructuredPackageData();
          } catch (error) {
            console.error("🔔 [REALTIME] Error refreshing on character change:", error);
          }
        }
      )
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [packageId, fetchStructuredPackageData]);

  // Generation timeout detection — scales with cast size (see getGenerationTiming).
  const GENERATION_TIMEOUT_MS = getGenerationTiming(mystery?.player_count || 6).timeoutMin * 60 * 1000;

  const notifyGenerationIssue = useCallback(async (conversationId: string) => {
    if (timeoutNotifiedRef.current) return;
    timeoutNotifiedRef.current = true;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      await supabase.functions.invoke('notify-generation-issue', {
        body: { conversation_id: conversationId },
        headers: session?.access_token
          ? { Authorization: `Bearer ${session.access_token}` }
          : undefined,
      });
      console.log("📧 Generation issue notification sent");
    } catch (err) {
      console.error("Failed to send generation issue notification:", err);
    }
  }, []);

  useEffect(() => {
    // Start timer when generation is in progress
    if (generating && generationStatus?.status === 'in_progress' && id) {
      // Clear any previous timer
      if (generationTimerRef.current) clearTimeout(generationTimerRef.current);

      generationTimerRef.current = setTimeout(async () => {
        // Only trigger if still generating when timer fires
        if (!generating) return;

        // Re-confirm against the DB before declaring a timeout. The client can
        // miss the realtime UPDATE that flips status to completed (backgrounded
        // tab, dropped websocket, network blip), leaving stale 'in_progress'
        // state. In that case the package is actually done — load it instead of
        // showing the "team notified" card and emailing support for a healthy
        // package. Mirrors the on-load completed path above.
        try {
          const freshStatus = await getPackageGenerationStatus(id);
          if (freshStatus.status === 'completed' || freshStatus.status === 'needs_review') {
            console.log("✅ Timeout fired but package is complete — loading instead of alerting");
            setGenerationStatus(freshStatus);
            setLastUpdate(new Date());
            await fetchStructuredPackageData();
            setGenerating(false);
            return;
          }
        } catch (err) {
          console.error("Timeout status re-check failed, falling back to timeout alert:", err);
        }

        console.log(`⏰ Generation timeout reached (${GENERATION_TIMEOUT_MS / 60000} min)`);
        setGenerationTimedOut(true);
        notifyGenerationIssue(id);
      }, GENERATION_TIMEOUT_MS);
    }

    // Clear timer when generation completes or fails
    if (!generating || generationStatus?.status === 'completed' || generationStatus?.status === 'failed') {
      if (generationTimerRef.current) {
        clearTimeout(generationTimerRef.current);
        generationTimerRef.current = null;
      }
      if (generationStatus?.status === 'completed') {
        setGenerationTimedOut(false);
        timeoutNotifiedRef.current = false;
      }
    }

    return () => {
      if (generationTimerRef.current) {
        clearTimeout(generationTimerRef.current);
      }
    };
  }, [generating, generationStatus?.status, id, notifyGenerationIssue, GENERATION_TIMEOUT_MS]);

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

          // is_paid is set server-side by the Stripe webhook only (ADR-0033) —
          // client writes to it are blocked at the DB. The webhook almost always
          // lands before the redirect; poll briefly for the rare case it hasn't.
          for (let attempt = 0; attempt < 5; attempt++) {
            const { data: paidCheck } = await supabase
              .from("conversations")
              .select("is_paid")
              .eq("id", id)
              .maybeSingle();
            if (paidCheck?.is_paid) break;
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }

          await supabase
            .from("conversations")
            .update({ display_status: "purchased" })
            .eq("id", id);
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

            // Check if generation has already been running past its (cast-scaled)
            // timeout on page load. Computed from the just-fetched player_count so a
            // 32-player job (~17 min) isn't flagged at a flat 15 min.
            const onLoadTimeoutMs = getGenerationTiming(conversation.player_count || 6).timeoutMin * 60 * 1000;
            const { data: pkgCheck } = await supabase
              .from("mystery_packages")
              .select("generation_started_at")
              .eq("conversation_id", id)
              .order("updated_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (pkgCheck?.generation_started_at) {
              const elapsed = Date.now() - new Date(pkgCheck.generation_started_at).getTime();
              if (elapsed > onLoadTimeoutMs) {
                console.log(`⏰ Generation already exceeded ${onLoadTimeoutMs / 60000} min on page load`);
                setGenerationTimedOut(true);
                notifyGenerationIssue(id);
              }
            }
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

  // Manual refresh function — bypasses the 10s throttle on checkGenerationStatus,
  // and re-pulls character/package data (the throttled path doesn't always do that).
  const handleManualRefresh = useCallback(async () => {
    debugLog("Manual refresh triggered");
    lastStatusCheck.current = 0; // bypass throttle
    await Promise.all([
      checkGenerationStatus(),
      fetchStructuredPackageData(),
    ]);
    setLastUpdate(new Date());
  }, [checkGenerationStatus, fetchStructuredPackageData, debugLog]);

  // Field-level update handler for mystery_packages
  const handlePackageFieldUpdate = useCallback(async (fieldName: string, value: string) => {
    if (!packageId) throw new Error("Package ID not available");
    await updatePackageField(packageId, fieldName, value);
    // Optimistically update local state
    const fieldMap: Record<string, keyof MysteryPackageData> = {
      game_overview: 'gameOverview',
      host_guide: 'hostGuide',
      materials: 'materials',
      preparation_instructions: 'preparation',
      timeline: 'timeline',
      hosting_tips: 'hostingTips',
      evidence_cards: 'evidenceCards',
      detective_script: 'detectiveScript',
    };
    const stateKey = fieldMap[fieldName];
    if (stateKey && packageData) {
      setPackageData(prev => prev ? { ...prev, [stateKey]: value } : prev);
    }
  }, [packageId, packageData]);

  // Field-level update handler for mystery_characters
  const handleCharacterFieldUpdate = useCallback(async (characterId: string, fieldName: string, value: string) => {
    await updateCharacterField(characterId, fieldName, value);
    // Optimistically update local state
    setCharacters(prev =>
      prev.map(c =>
        c.id === characterId ? { ...c, [fieldName]: value } : c
      )
    );
  }, []);

  // Render generation progress with mobile optimization
  const renderGenerationProgress = () => {
    if (!generationStatus) return null;
    
    // Show error state for failed generation
    if (generationStatus.status === 'failed') {
      return (
        <Card className={cn(
          "mb-6 border-red-500/30",
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
                <span className={cn(isMobile && "text-base")}>{t("mysteryView.errors.generationFailed")}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleManualRefresh}
                className={cn(
                  "h-8 w-8 p-0 text-muted-foreground hover:text-foreground",
                  isMobile && "self-end"
                )}
                title={t("mysteryView.buttons.refreshStatus")}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </CardTitle>
            <CardDescription className={cn(
              "text-red-600",
              isMobile && "text-sm"
            )}>
              {generationStatus.currentStep || t("mysteryView.errors.errorDuringGeneration")}
            </CardDescription>
          </CardHeader>
          <CardContent className={cn(
            "space-y-4",
            isMobile && "p-4 pt-0 space-y-3"
          )}>
            <Alert className="border-red-500/30">
              <AlertTriangle className={cn(
                isMobile ? "h-3 w-3" : "h-4 w-4"
              )} />
              <AlertTitle className={cn(isMobile && "text-sm")}>{t("mysteryView.errors.whatHappened")}</AlertTitle>
              <AlertDescription className={cn(isMobile && "text-xs")}>
                {generationStatus.resumable
                  ? t("mysteryView.errors.resumableExplanation")
                  : t("mysteryView.errors.nonResumableExplanation")
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
                  {t("mysteryView.buttons.resumeGeneration")}
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
                  {t("mysteryView.buttons.tryAgain")}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      );
    }

    // Timeout state — generation has been running for over 15 minutes
    if (generationTimedOut) {
      return (
        <Card className={cn(
          "mb-6 border-amber-500/30",
          isMobile && "mx-2"
        )}>
          <CardHeader className={cn(isMobile && "p-4 pb-3")}>
            <CardTitle className={cn(
              "flex items-center space-x-2 text-amber-800",
              isMobile && "text-base"
            )}>
              <AlertTriangle className={cn(
                "text-amber-600",
                isMobile ? "h-4 w-4" : "h-5 w-5"
              )} />
              <span>{t("mysteryView.timeout.title")}</span>
            </CardTitle>
            <CardDescription className={cn(
              "text-amber-700",
              isMobile && "text-sm"
            )}>
              {t("mysteryView.timeout.description")}
            </CardDescription>
          </CardHeader>
          <CardContent className={cn(
            "space-y-4",
            isMobile && "p-4 pt-0 space-y-3"
          )}>
            <Alert className="border-amber-500/30">
              <CheckCircle2 className={cn(
                "text-green-500",
                isMobile ? "h-3 w-3" : "h-4 w-4"
              )} />
              <AlertTitle className={cn(isMobile && "text-sm")}>{t("mysteryView.timeout.reassuranceTitle")}</AlertTitle>
              <AlertDescription className={cn(isMobile && "text-xs")}>
                {t("mysteryView.timeout.reassuranceBody")}
              </AlertDescription>
            </Alert>
            <p className={cn(
              "text-sm text-amber-700",
              isMobile && "text-xs"
            )}>
              {t("mysteryView.timeout.closePage")}{" "}
              <a href="mailto:support@mysterymaker.party" className="underline font-medium">support@mysterymaker.party</a>.
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="border-amber-300 text-amber-800 hover:bg-amber-100"
            >
              <RefreshCw className={cn("mr-2", isMobile ? "h-3 w-3" : "h-4 w-4")} />
              {t("mysteryView.buttons.checkAgain")}
            </Button>
          </CardContent>
        </Card>
      );
    }

    // Pass real DB content signals to GenerationProgress so it derives a
    // realistic progress that ticks gradually as content lands — instead of
    // trusting generation_status.progress which can jump to 100 prematurely.
    return (
      <GenerationProgress
        hasMasterContext={!!packageData?.master_context}
        hasGameOverview={!!packageData?.gameOverview}
        hasMaterials={!!packageData?.materials}
        charactersDone={characters.length}
        charactersExpected={charactersExpected}
        hasEvidence={!!packageData?.evidenceCards}
        hasDetective={!!packageData?.detectiveScript}
        hasImages={!!packageData?.evidenceCardImages}
        generationStartedAt={generationStatus?.startedAt}
        finalizing={needsReviewWithinWindow}
        isMobile={isMobile}
      />
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
              {t("mysteryView.loadingMystery")}
            </p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Compute character generation progress for the live count.
  // extracted_characters is set early in the parent flow; mystery_characters rows
  // arrive as children complete. Falls back to player_count if extracted not yet set.
  let charactersExpected = 0;
  if (packageData?.extracted_characters) {
    try {
      const extracted = typeof packageData.extracted_characters === 'string'
        ? JSON.parse(packageData.extracted_characters)
        : packageData.extracted_characters;
      if (Array.isArray(extracted)) charactersExpected = extracted.length;
    } catch { /* fall back below */ }
  }
  if (charactersExpected === 0) charactersExpected = mystery?.player_count || 0;
  // extracted_characters has a known history of over-counting (roster-parsing
  // bugs — ADR-0068/0069/0110/0120). player_count is the stable, customer-set
  // ceiling a real roster should never exceed, so cap the gate's target at it —
  // otherwise an already-complete, already-paid package whose extracted list
  // over-counted would get stuck behind the progress screen forever, since
  // characters.length can never reach an inflated target.
  const characterGateTarget = mystery?.player_count
    ? Math.min(charactersExpected, mystery.player_count)
    : charactersExpected;
  // A generation_status of 'completed'/'needs_review' can land before every
  // requested character's row has actually been written (async child writers
  // outside this app's own gating — see ADR-0103 Addendum 29). Requiring the
  // roster to actually match the (capped) expected count, not just be
  // non-empty, is what decides whether the finished tab view or the progress
  // screen renders — but only while generation is recent (see
  // generationRecentlyStarted above), so an older package that has since been
  // legitimately reduced (Remove-a-Character) or is simply stale data is
  // never permanently blocked by this check.
  const allExpectedCharactersPresent =
    characterGateTarget === 0 ||
    characters.length >= characterGateTarget ||
    !generationRecentlyStarted;

  // Log debug info for tab visibility
  if ((mystery?.is_paid || generationStatus?.status === 'completed' ||
      (!generating && !generationStatus && packageData && packageData.gameOverview &&
       packageData.hostGuide)) && characters.length > 0) {
    console.log("🎭 [DEBUG] Showing tabs because:", {
      isPaid: mystery?.is_paid,
      generationComplete: generationStatus?.status === 'completed',
      hasPackageData: !!packageData,
      hasGameOverview: !!packageData?.gameOverview,
      hasHostGuide: !!packageData?.hostGuide,
      charactersCount: characters.length,
      charactersExpected,
      allExpectedCharactersPresent
    });
  }

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
          {/* Stale-needs-review banner: only renders if the package has been
              flagged needs_review for longer than the silent recovery window
              (~10 min). For fresher needs_review states, auto-recovery is
              probably still working — we hide the banner so the customer
              doesn't see a warning for issues that'll fix themselves. */}
          {(() => {
            if (generationStatus?.status !== 'needs_review') return null;
            if (needsReviewWithinWindow) return null;
            return (
              <Alert className={cn(
                "mb-4 border-amber-400/60 bg-amber-50/50 dark:bg-amber-950/20",
                isMobile && "mx-2"
              )}>
                <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <AlertTitle className="text-sm font-medium text-amber-900 dark:text-amber-200">
                  {t("mysteryView.finalizing.title")}
                </AlertTitle>
                <AlertDescription className="text-xs text-amber-800 dark:text-amber-300/90">
                  {t("mysteryView.finalizing.description")}
                  {" "}
                  <button
                    onClick={handleManualRefresh}
                    className="underline font-medium hover:text-amber-900 dark:hover:text-amber-100"
                  >
                    {t("mysteryView.buttons.checkAgain")}
                  </button>
                  {" · "}
                  <a href="mailto:support@mysterymaker.party" className="underline">support@mysterymaker.party</a>
                </AlertDescription>
              </Alert>
            );
          })()}

          {/* Show TabView when content is sufficiently present. `completed` is
              trusted-clean (ADR-0049/0053 gate guarantee) and reveals
              immediately. `needs_review` only reveals once it's past the
              silent self-heal window (ADR-0077 hard quality guarantee) — while
              `needsReviewWithinWindow` is true, the building screen renders
              instead (see the branch below), so a customer is never shown
              content that might still be a defect the self-heal loop is
              actively repairing. Requiring `allExpectedCharactersPresent`
              (not just characters.length > 0) closes the gap where
              generation_status flips to 'completed' before every requested
              character's row has actually landed — ADR-0103 Addendum 29. */}
          {((((generationStatus?.status === 'completed' ||
               (generationStatus?.status === 'needs_review' && !needsReviewWithinWindow))
              && allExpectedCharactersPresent
              && !!packageData?.evidenceCards && !!packageData?.detectiveScript) ||
             (!generating && !generationStatus && packageData?.gameOverview && allExpectedCharactersPresent))) ? (
            <MysteryPackageTabView
              packageContent={packageContent || ""}
              mysteryTitle={getMysteryTitle()}
              generationStatus={generationStatus || undefined}
              conversationId={id}
              onGenerateClick={handleGeneratePackage}
              isGenerating={generating}
              packageData={packageData || undefined}
              characters={characters}
              estimatedTime={getEstimatedTime(mystery?.player_count || 6)}
              packageId={packageId || undefined}
              isPaid={mystery?.is_paid}
              mysteryType={mystery?.mystery_type}
              mysteryStyle={mystery?.mystery_style}
              hasAccomplice={mystery?.has_accomplice}
              playerCount={mystery?.player_count}
              scriptType={mystery?.script_type as 'full' | 'pointForm' | 'both' | null | undefined}
              onPackageFieldUpdate={packageId ? handlePackageFieldUpdate : undefined}
              onCharacterFieldUpdate={handleCharacterFieldUpdate}
            />
          ) : (
            // Show generation progress or start button.
            // Also treat "completed but content not all in" as still-in-progress, since the
            // parent sometimes flips to completed before children/evidence finish (timing race).
            // `needsReviewWithinWindow` also renders the building screen (with the new
            // "Final quality checks" phase) instead of the content-blocked package, since
            // the reveal gate above holds it back until the window passes.
            (generationStatus?.status === 'in_progress' ||
             needsReviewWithinWindow ||
             (generationStatus?.status === 'completed' &&
              (!allExpectedCharactersPresent || !packageData?.evidenceCards || !packageData?.detectiveScript)))
              ? renderGenerationProgress() : (
              <Card className={cn(
                "mb-6",
                isMobile && "mx-2"
              )}>
                <CardHeader className={cn(isMobile && "p-4 pb-3")}>
                  <CardTitle className={cn(isMobile && "text-lg")}>
                    {generationStatus?.status === 'needs_more_info'
                      ? t("mysteryView.generateCard.needsMoreInfoTitle", { defaultValue: "Finish Designing Your Mystery" })
                      : t("mysteryView.generateCard.title")}
                  </CardTitle>
                  <CardDescription className={cn(isMobile && "text-sm")}>
                    {generationStatus?.status === 'needs_more_info'
                      ? t("mysteryView.generateCard.needsMoreInfoDescription", { defaultValue: "Your mystery concept isn't finished yet — head back to the chat to pick a theme and cast before generating." })
                      : t("mysteryView.generateCard.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className={cn(isMobile && "p-4 pt-0")}>
                  {generationStatus?.status === 'needs_more_info' ? (
                    <Button
                      onClick={() => navigate(`/mystery/chat/${id}`)}
                      className={cn(
                        "w-full sm:w-auto",
                        isMobile && "w-full text-sm h-11"
                      )}
                    >
                      {t("mysteryView.buttons.continueDesigning", { defaultValue: "Continue Designing" })}
                    </Button>
                  ) : (
                    <>
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
                            {t("mysteryView.generateCard.starting")}
                          </>
                        ) : (
                          t("mysteryView.generateCard.button")
                        )}
                      </Button>
                      <p className={cn(
                        "text-sm text-muted-foreground mt-3",
                        isMobile && "text-xs mt-2"
                      )}>
                        {t("mysteryView.generateCard.eta", { time: getEstimatedTime(mystery?.player_count || 6) })}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            )
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MysteryView;
