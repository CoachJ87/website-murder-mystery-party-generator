// src/components/MysteryPackage.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { generateCompletePackage, getPackageGenerationStatus, GenerationStatus } from "@/services/mysteryPackageService";
import { supabase } from "@/lib/supabase";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import MysteryPackageTabView from "@/components/MysteryPackageTabView";

interface MysteryPackageProps {
  mysteryId: string;
  title: string;
}

const MysteryPackage = ({ mysteryId, title }: MysteryPackageProps) => {
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const [statusCheckInterval, setStatusCheckInterval] = useState<number | null>(null);

  useEffect(() => {
    const checkForExistingPackage = async () => {
      try {
        setLoading(true);
        
        // Get existing status
        const status = await getPackageGenerationStatus(mysteryId);
        setGenerationStatus(status);
        
        // If it's in progress, start polling
        if (status.status === 'in_progress') {
          startStatusPolling();
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
    
    checkForExistingPackage();
    
    return () => {
      if (statusCheckInterval) {
        clearInterval(statusCheckInterval);
      }
    };
  }, [mysteryId]);

  const startStatusPolling = () => {
    // Clear any existing interval
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
    }
    
    // Check status every 5 seconds
    const intervalId = window.setInterval(async () => {
      try {
        const status = await getPackageGenerationStatus(mysteryId);
        setGenerationStatus(status);
        
        if (status.status === 'completed') {
          // Package generation complete, fetch content
          const { data: packageData } = await supabase
            .from("mystery_packages")
            .select("content")
            .eq("conversation_id", mysteryId)
            .single();
            
          if (packageData) {
            setPackageContent(packageData.content);
            clearInterval(intervalId);
            setStatusCheckInterval(null);
            setGenerating(false);
            toast.success("Your mystery package is ready!");
          }
        } else if (status.status === 'failed') {
          clearInterval(intervalId);
          setStatusCheckInterval(null);
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
        console.error("Error checking generation status:", error);
      }
    }, 5000);
    
    // Store the numeric ID of the interval in state
    setStatusCheckInterval(intervalId);
  };

  const handleGeneratePackage = async () => {
    try {
      setGenerating(true);
      toast.info("Generating your complete murder mystery package. This may take a few minutes...");
      
      // Start generation
      generateCompletePackage(mysteryId)
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
      
      // Start polling for status updates
      const initialStatus = await getPackageGenerationStatus(mysteryId);
      setGenerationStatus(initialStatus);
      startStatusPolling();
      
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
          <span>{generationStatus.currentStep}</span>
          <span>{generationStatus.progress}%</span>
        </div>
        <Progress value={generationStatus.progress} />
        
        <div className="flex gap-2 mt-2 flex-wrap">
          {Object.entries(generationStatus.sections || {}).map(([key, isComplete]) => (
            <Badge 
              key={key}
              variant={isComplete ? "secondary" : "outline"}
              className={isComplete ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : ""}
            >
              {key === "hostGuide" ? "Host Guide" : 
               key === "characters" ? "Characters" :
               key === "clues" ? "Clues" : "Solution"}
              {isComplete ? " ✓" : ""}
            </Badge>
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
            />
            
            {generationStatus?.status === 'failed' && (
              <div className="flex justify-end mt-4">
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
                  "Generate Full Mystery Package"
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MysteryPackage;
