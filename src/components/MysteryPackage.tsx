// src/components/MysteryPackage.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { generateCompletePackage } from "@/services/mysteryPackageService";
import { supabase } from "@/lib/supabase";

interface MysteryPackageProps {
  mysteryId: string;
  title: string;
}

const MysteryPackage = ({ mysteryId, title }: MysteryPackageProps) => {
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Check if a completed package already exists
  useEffect(() => {
    const checkForExistingPackage = async () => {
      try {
        setLoading(true);
        
        const { data, error } = await supabase
          .from("conversations")
          .select("*, messages(*)")
          .eq("mystery_id", mysteryId)
          .eq("prompt_version", "paid")
          .eq("is_completed", true)
          .maybeSingle();
          
        if (error && error.code !== 'PGRST116') {
          console.error("Error checking for package:", error);
          return;
        }
        
        if (data && data.messages && data.messages.length > 0) {
          // Find the AI message with the package content
          const packageMessage = data.messages.find(msg => msg.is_ai === true);
          if (packageMessage) {
            setPackageContent(packageMessage.content);
          }
        }
      } catch (error) {
        console.error("Error:", error);
      } finally {
        setLoading(false);
      }
    };
    
    checkForExistingPackage();
  }, [mysteryId]);

  const handleGeneratePackage = async () => {
    try {
      setGenerating(true);
      const content = await generateCompletePackage(mysteryId);
      setPackageContent(content);
      toast.success("Murder mystery package generated successfully!");
    } catch (error) {
      console.error("Error generating package:", error);
      toast.error("Failed to generate mystery package. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    // This is where you would implement PDF generation
    toast.info("PDF generation will be implemented soon!");
  };

  const handleDownloadText = () => {
    if (!packageContent) return;
    
    // Create a blob and download link
    const blob = new Blob([packageContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title.replace(/\s+/g, '_')}_murder_mystery.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
        {packageContent ? (
          <div className="space-y-4">
            <div className="max-h-96 overflow-y-auto p-4 border rounded-md bg-muted/30">
              <pre className="whitespace-pre-wrap">{packageContent.slice(0, 500)}...</pre>
            </div>
            
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={handleDownloadText}>
                <FileText className="h-4 w-4 mr-2" />
                Download as Text
              </Button>
              <Button onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download as PDF
              </Button>
            </div>
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
            
            <Button 
              onClick={handleGeneratePackage} 
              disabled={generating}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating Package...
                </>
              ) : (
                "Generate Full Mystery Package"
              )}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MysteryPackage;
