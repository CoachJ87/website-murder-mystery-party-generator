import { useState, useEffect, useCallback } from "react";
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

const MysteryView = () => {
  const [mystery, setMystery] = useState<any | null>(null);
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<number | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const isPageVisible = () => document.visibilityState === 'visible';

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (isPageVisible()) {
        console.log("Tab is now visible, refreshing status");
        checkGenerationStatus();
        startStatusPolling();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id]);

  const checkGenerationStatus = useCallback(async () => {
    if (!id) return;
    
    try {
      const status = await getPackageGenerationStatus(id);
      setGenerationStatus(status);
      setLastUpdate(new Date());
      
      if (status.status === 'completed') {
        const { data: packageData } = await supabase
          .from("mystery_packages")
          .select("content")
          .eq("conversation_id", id)
          .single();
          
        if (packageData) {
          setPackageContent(packageData.content);
          clearStatusPolling();
          toast.success("Your mystery package is ready!");
          
          await supabase
            .from("conversations")
            .update({
              status: "purchased",
              is_paid: true,
              is_purchased: true,
              display_status: "purchased"
            })
            .eq("id", id);
          
          if (window.location.pathname.includes('/preview/')) {
            navigate(`/mystery/${id}`);
          }
        }
      } else if (status.status === 'failed') {
        clearStatusPolling();
        
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
          toast.error("There was an issue generating your package");
        }
      }
    } catch (error) {
      console.error("Error checking generation status:", error);
    }
  }, [id, navigate]);

  const clearStatusPolling = () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  };

  const startStatusPolling = useCallback(() => {
    clearStatusPolling();
    const intervalId = window.setInterval(checkGenerationStatus, 5000);
    setStatusCheckInterval(intervalId);
  }, [checkGenerationStatus]);

  useEffect(() => {
    const fetchMystery = async () => {
      if (!id) return;

      setLoading(true);
      try {
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

        setMystery(conversation);

        if (conversation.needs_package_generation) {
          const status = await getPackageGenerationStatus(id);
          setGenerationStatus(status);
          setLastUpdate(new Date());
          
          if (status.status === 'in_progress') {
            startStatusPolling();
          } else if (status.status === 'completed') {
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

        if (conversation.has_complete_package) {
          const { data: packageData, error: packageError } = await supabase
            .from("mystery_packages")
            .select("content")
            .eq("conversation_id", id)
            .single();

          if (!packageError && packageData) {
            setPackageContent(packageData.content);
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
    
    const handleUserInteraction = () => {
      setHasUserInteracted(true);
    };
    window.addEventListener('click', handleUserInteraction);
    window.addEventListener('keydown', handleUserInteraction);
    
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
      window.removeEventListener('click', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
    };
  }, [id, navigate, startStatusPolling]);

  useEffect(() => {
    if (lastUpdate) {
      setHasUserInteracted(false);
    }
  }, [lastUpdate]);

  const handleResumeGeneration = async () => {
    if (!id) {
      toast.error("Mystery ID is missing");
      return;
    }

    setGenerating(true);
    try {
      toast.info("Resuming your mystery generation. This may take 5-10 minutes...");
      
      resumePackageGeneration(id)
        .then(content => {
          setPackageContent(content);
          setGenerating(false);
          toast.success("Your complete mystery package is ready!");
        })
        .catch(error => {
          console.error("Error in package generation:", error);
          setGenerating(false);
          toast.error("There was an issue generating your package. Please try again.");
        });
      
      const initialStatus = await getPackageGenerationStatus(id);
      setGenerationStatus(initialStatus);
      startStatusPolling();
      
    } catch (error: any) {
      console.error("Error resuming package generation:", error);
      setGenerating(false);
      toast.error(error.message || "Failed to resume generation");
    }
  };

  const handleGeneratePackage = async () => {
    if (!id) {
      toast.error("Mystery ID is missing");
      return;
    }

    setGenerating(true);
    try {
      toast.info(
        <div className="space-y-2">
          <div className="font-semibold">Generating your mystery package</div>
          <p className="text-sm">This will take about 5-10 minutes. Please keep this browser tab open.</p>
        </div>
      );
      
      generateCompletePackage(id)
        .then(content => {
          setPackageContent(content);
          setGenerating(false);
          toast.success("Your complete mystery package is ready!");
        })
        .catch(error => {
          console.error("Error in package generation:", error);
          setGenerating(false);
          toast.error("There was an issue generating your package. Please try again.");
        });
      
      const initialStatus = await getPackageGenerationStatus(id);
      setGenerationStatus(initialStatus);
      startStatusPolling();
      
    } catch (error: any) {
      console.error("Error starting package generation:", error);
      setGenerating(false);
      toast.error(error.message || "Failed to start package generation");
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

  const extractSummary = (mystery: any) => {
    if (!mystery?.mystery_data) return "A murder mystery awaits...";
    
    const data = mystery.mystery_data;
    let summary = `A ${data.theme || 'classic'} murder mystery for ${data.playerCount || 'multiple'} players`;
    if (data.hasAccomplice) summary += ' featuring an accomplice mechanism';
    if (data.scriptType) summary += ` with ${data.scriptType === 'full' ? 'detailed scripts' : 'point-form summaries'}`;
    if (data.additionalDetails) summary += `. ${data.additionalDetails}`;
    
    return summary;
  };

  const renderGenerationProgress = () => {
    if (!generationStatus) return null;
    
    const isIdle = !isPageVisible() && !hasUserInteracted && lastUpdate && 
                  (new Date().getTime() - lastUpdate.getTime() > 30000);
    
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Generating Your Mystery Package</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={checkGenerationStatus} 
              className="h-8 w-8 p-0"
              title="Refresh status"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardTitle>
          <CardDescription>
            This process takes 5-10 minutes to complete. Please keep this browser tab open.
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
          
          {isIdle && (
            <Alert className="bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
              <AlertTitle>Update paused</AlertTitle>
              <AlertDescription>
                Status updates paused because the page is inactive. Click anywhere or switch back to this tab to resume updates.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="flex flex-col md:flex-row gap-4 text-sm">
            <div className="flex-1 border rounded-md p-3">
              <div className="font-medium mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                <span>Estimated Time</span>
              </div>
              <p className="text-muted-foreground">
                Full generation takes 5-10 minutes to complete. Remaining: 
                {generationStatus.progress < 30 ? " 7-10 minutes" : 
                 generationStatus.progress < 60 ? " 4-7 minutes" : 
                 generationStatus.progress < 90 ? " 1-3 minutes" : 
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
            <strong>Important:</strong> Keep this browser tab open. Closing it or putting your computer to sleep will pause generation, but you'll be able to resume later.
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          {!window.location.pathname.includes('/preview/') && packageContent ? (
            <MysteryPackageTabView 
              packageContent={packageContent} 
              mysteryTitle={mystery?.title || "Mystery Package"} 
              generationStatus={generationStatus || undefined}
            />
          ) : (
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
                      Generating...
                    </>
                  ) : (
                    "Generate Mystery Package"
                  )}
                </Button>
                <p className="text-sm text-muted-foreground mt-3">
                  Generation takes 5-10 minutes. Please keep this browser tab open during generation.
                </p>
              </CardContent>
            </Card>
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
