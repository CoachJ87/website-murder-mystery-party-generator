// src/components/MysteryPackage.tsx
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { generateCompletePackage, getPackageGenerationStatus, GenerationStatus } from "@/services/mysteryPackageService";
import { supabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import MysteryPackageTabView from "@/components/MysteryPackageTabView";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface MysteryPackageProps {
  mysteryId: string;
  title: string;
}

const MysteryPackage = ({ mysteryId, title }: MysteryPackageProps) => {
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [testMode, setTestMode] = useState<boolean>(false);
  
  // Add ref to track toast notifications
  const packageReadyNotified = useRef<boolean>(false);

  useEffect(() => {
    const checkForExistingPackage = async () => {
      try {
        setLoading(true);
        
        // Reset notification state on component mount
        packageReadyNotified.current = false;
        
        // Get existing status
        const status = await getPackageGenerationStatus(mysteryId);
        setGenerationStatus(status);
        
        // If it's in progress, set generating state
        if (status.status === 'in_progress') {
          setGenerating(true);
        }
        
        // Get existing content
        const { data, error } = await supabase
          .from("mystery_packages")
          .select("content")
          .eq("conversation_id", mysteryId)
          .maybeSingle();
          
        if (error && error.code !== 'PGRST116') {
          console.error("Error checking for package:", error);
          return;
        }
        
        if (data && data.content) {
          setPackageContent(data.content);
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    // Initial data check
    checkForExistingPackage();
    
    // Set up real-time subscription
    console.log("Setting up real-time subscription for mystery_packages");
    const subscription = supabase
      .channel('mystery_packages_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'mystery_packages',
          filter: `conversation_id=eq.${mysteryId}`
        },
        async (payload) => {
          console.log("Real-time update received:", payload);
          
          try {
            // Get updated status
            const status = await getPackageGenerationStatus(mysteryId);
            setGenerationStatus(status);
            
            if (status.status === 'completed') {
              // Package generation complete, fetch content
              const { data: packageData } = await supabase
                .from("mystery_packages")
                .select("content")
                .eq("conversation_id", mysteryId)
                .single();
                
              if (packageData && packageData.content) {
                setPackageContent(packageData.content);
                setGenerating(false);
                
                // Only show notification once
                if (!packageReadyNotified.current) {
                  toast.success("Your mystery package is ready!");
                  packageReadyNotified.current = true;
                }
              }
            } else if (status.status === 'failed') {
              setGenerating(false);
              toast.error("There was an issue generating your package");
              
              // Even if failed, try to get partial content
              const { data: packageData } = await supabase
                .from("mystery_packages")
                .select("content")
                .eq("conversation_id", mysteryId)
                .single();
                
              if (packageData && packageData.content) {
                setPackageContent(packageData.content);
              }
            }
          } catch (error) {
            console.error("Error handling real-time update:", error);
          }
        }
      )
      .subscribe((status) => {
        console.log("Subscription status:", status);
      });
    
    // Cleanup subscription
    return () => {
      console.log("Cleaning up real-time subscription");
      subscription.unsubscribe();
    };
  }, [mysteryId]);

  const handleGeneratePackage = async () => {
    try {
      setGenerating(true);
      
      // Reset notification flag when starting a new generation
      packageReadyNotified.current = false;
      
      const toastMessage = testMode 
        ? "Generating test version of your murder mystery package..."
        : "Generating your complete murder mystery package. This may take a few minutes...";
        
      toast.info(toastMessage);
      
      // Start generation
      generateCompletePackage(mysteryId, testMode)
        .then(content => {
          setPackageContent(content);
          setGenerating(false);
          
          const successMessage = testMode
            ? "Your test mystery package is ready!"
            : "Your complete mystery package is ready!";
            
          toast.success(successMessage);
          packageReadyNotified.current = true;
        })
        .catch(error => {
          console.error("Error in package generation:", error);
          setGenerating(false);
          toast.error("There was an issue generating your package. Please try again.");
        });
      
      // Get initial status after starting generation
      const initialStatus = await getPackageGenerationStatus(mysteryId);
      setGenerationStatus(initialStatus);
      
    } catch (error: any) {
      console.error("Error starting package generation:", error);
      setGenerating(false);
      toast.error(error.message || "Failed to start package generation");
    }
  };

  const handleDownloadText = () => {
    if (!packageContent) return;
    
    const blob = new Blob([packageContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_murder_mystery.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Download started");
  };

  const handleDownloadPDF = () => {
    toast.info("PDF generation will be implemented soon!");
  };

  const renderGenerationProgress = () => {
    if (!generationStatus) return null;
    
    return (
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span>{generationStatus.currentStep || "Generating..."}</span>
          <span>{generationStatus.progress}%</span>
        </div>
        <Progress value={generationStatus.progress} />
        
        <div className="flex gap-2 mt-2 flex-wrap">
          {generationStatus.sections && Object.entries(generationStatus.sections).map(([key, isComplete]) => (
            key !== 'solution' && (
              <Badge 
                key={key}
                variant={isComplete ? "secondary" : "outline"}
                className={isComplete ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : ""}
              >
                {key === "hostGuide" ? "Host Guide" : 
                 key === "characters" ? "Characters" :
                 key === "clues" ? "Clues" : 
                 key === "inspectorScript" ? "Inspector Script" :
                 key === "characterMatrix" ? "Character Matrix" : 
                 key}
                {isComplete ? " ✓" : ""}
              </Badge>
            )
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 flex justify-center items-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading package details...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{title} - Murder Mystery Package</CardTitle>
      </CardHeader>
      
      <CardContent>
        {generationStatus?.status === 'in_progress' && renderGenerationProgress()}
        
        {packageContent ? (
          <div className="space-y-4">
            <MysteryPackageTabView 
              packageContent={packageContent} 
              mysteryTitle={title}
              generationStatus={generationStatus || undefined}
              conversationId={mysteryId}
              isGenerating={generating}
            />
            
            {generationStatus?.status === 'failed' && (
              <div className="flex justify-end mt-4">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <Switch 
                      id="test-mode" 
                      checked={testMode} 
                      onCheckedChange={setTestMode}
                    />
                    <Label htmlFor="test-mode">Test Mode (Faster, Less Content)</Label>
                  </div>
                  <Button 
                    onClick={handleGeneratePackage} 
                    disabled={generating}
                    variant="outline"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Regenerating...
                      </>
                    ) : (
                      "Regenerate Package"
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <p>You've purchased this murder mystery! Generate your complete package to get:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Detailed character guides for each player</li>
              <li>Comprehensive host instructions</li>
              <li>Evidence cards and game materials</li>
              <li>Complete gameplay script</li>
            </ul>
            
            {generationStatus?.status === 'in_progress' ? (
              <div className="mt-4">
                <p className="text-center mb-2">Generation in progress...</p>
                {renderGenerationProgress()}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch 
                    id="test-mode" 
                    checked={testMode} 
                    onCheckedChange={setTestMode}
                  />
                  <Label htmlFor="test-mode">Test Mode (Faster, Less Content)</Label>
                </div>
                <p className="text-xs text-muted-foreground">
                  {testMode ? 
                    "Test mode generates a smaller package with condensed content to verify the generation flow works correctly. Ideal for testing." :
                    "Standard mode generates a complete package with full detailed content for actual use."}
                </p>
                <Button 
                  onClick={handleGeneratePackage} 
                  disabled={generating}
                  className="w-full"
                >
                  {generating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Starting Generation...
                    </>
                  ) : (
                    testMode ? "Generate Test Package" : "Generate Full Mystery Package"
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MysteryPackage;
