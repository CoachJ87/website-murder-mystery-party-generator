import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { generateCompletePackage } from "@/services/mysteryPackageService";
import { useAuth } from "@/context/AuthContext";
import { RefreshCw } from "lucide-react";
import MysteryPackageTabView from "@/components/MysteryPackageTabView";

// This component needs to be created (see code below)
// import MysteryPackageTabView from "@/components/MysteryPackageTabView";

const MysteryView = () => {
  const [mystery, setMystery] = useState<any | null>(null);
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

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
  }, [id, navigate]);

  const handleGeneratePackage = async () => {
    if (!id) {
      toast.error("Mystery ID is missing");
      return;
    }

    setGenerating(true);
    try {
      toast.info("Generating your complete murder mystery package. This may take a few minutes...");
      
      const content = await generateCompletePackage(id);
      setPackageContent(content);
      
      // Save the generated package
      await supabase
        .from("conversations")
        .update({ 
          has_complete_package: true,
          package_generated_at: new Date().toISOString()
        })
        .eq("id", id);
        
      // Also save in mystery_packages table
      await supabase
        .from("mystery_packages")
        .upsert({ 
          conversation_id: id,
          content: content,
          created_at: new Date().toISOString()
        });
        
      toast.success("Your complete mystery package is ready!");
    } catch (error: any) {
      console.error("Error generating package:", error);
      toast.error(error.message || "Failed to generate complete package");
    } finally {
      setGenerating(false);
    }
  };

if (loading || generating) {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center">
            {generating ? (
              <>
                <div className="h-16 w-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <h2 className="text-2xl font-bold mt-6">Generating Your Complete Murder Mystery</h2>
                <p className="text-muted-foreground mt-2">
                  This process takes 3-5 minutes. We're creating detailed character guides, 
                  clues, game materials, and host instructions.
                </p>
              </>
            ) : (
              <>
                <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="mt-4">Loading your mystery...</p>
              </>
            )}
          </div>
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
                    disabled={generating}
                    className="w-full mt-4"
                  >
                    {generating ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating Full Package (This may take a few minutes)...
                      </>
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
