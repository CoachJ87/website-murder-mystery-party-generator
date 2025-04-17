// src/pages/MysteryPreview.tsx
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CheckCircle, Loader2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const MysteryPreview = () => {
  const [loading, setLoading] = useState(true);
  const [mystery, setMystery] = useState<any>(null);
  const [purchasing, setPurchasing] = useState(false);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (id) {
      loadMystery();
    }
  }, [id]);

  const loadMystery = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("conversations")
        .select("*, messages(*)")
        .eq("id", id)
        .single();
      
      if (error) {
        console.error("Error loading mystery:", error);
        toast.error("Failed to load mystery details");
        return;
      }

      let theme = "", title = "", premise = "", playerCount = 0;
      if (data.messages) {
        const aiMessages = data.messages.filter((msg: any) => msg.role === "assistant");
        for (const msg of aiMessages) {
          const content = msg.content;
          if (content.includes("# ")) {
            const lines = content.split("\n");
            for (const line of lines) {
              if (line.startsWith("# ")) {
                title = line.replace("# ", "");
              } else if (line.includes("Theme:")) {
                theme = line.split("Theme:")[1].trim();
              } else if (line.includes("PREMISE")) {
                const nextLine = lines[lines.indexOf(line) + 1];
                premise = nextLine || "";
              } else if (line.includes("CHARACTER LIST")) {
                const match = line.match(/\((\d+)\s+PLAYERS\)/);
                if (match) {
                  playerCount = parseInt(match[1]);
                }
              }
            }
          }
        }
      }

      setMystery({
        ...data,
        theme,
        title: title || data.title,
        premise,
        playerCount
      });
    } catch (error) {
      console.error("Error loading mystery:", error);
      toast.error("Failed to load mystery details");
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }

    navigate(`/mystery/purchase/${id}`);
  };

  const handleSimulatePurchase = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }
    
    try {
      setPurchasing(true);
      
      const { error } = await supabase
        .from("profiles")
        .update({ 
          has_purchased: true,
          purchase_date: new Date().toISOString()
        })
        .eq("id", id);
        
      if (error) {
        throw new Error("Failed to update purchase status");
      }
      
      toast.success("Purchase simulated successfully!");
      
      navigate("/dashboard");
      
    } catch (error) {
      console.error("Error simulating purchase:", error);
      toast.error("Failed to simulate purchase");
      setPurchasing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </main>
        
        <Footer />
      </div>
    );
  }

  if (!mystery) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Mystery Not Found</h2>
            <p className="mb-6 text-muted-foreground">The mystery you're looking for doesn't exist or has been deleted.</p>
            <Button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
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
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">{mystery.title || "Mystery Preview"}</h1>
            <p className="text-muted-foreground">
              Preview of your {mystery.theme || "murder mystery"}
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Mystery Overview</CardTitle>
                  <CardDescription>The key elements of your murder mystery</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="font-medium">Theme</h3>
                    <p>{mystery?.theme || "Not specified"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Number of Players</h3>
                    <p>{mystery?.playerCount || "Not specified"} players</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Premise</h3>
                    <p className="line-clamp-3">{mystery?.premise || "Custom setting"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div>
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle>Purchase Complete Package</CardTitle>
                  <CardDescription>Get everything you need to host your mystery</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="font-bold text-2xl mb-4">$4.99</div>
                  <div className="space-y-2">
                    {[
                      "Full character profiles for all suspects",
                      "Detailed backstories and motives",
                      "Printable character sheets",
                      "Host instructions and timeline",
                      "Clues and evidence cards",
                      "Solution reveal script"
                    ].map((item, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                  <Button 
                    className="w-full" 
                    onClick={handlePurchase} 
                    disabled={purchasing}
                  >
                    {purchasing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      "Purchase Now"
                    )}
                  </Button>
                  
                  <Button 
                    className="w-full" 
                    variant="outline"
                    size="sm"
                    onClick={handleSimulatePurchase} 
                    disabled={purchasing}
                  >
                    Simulate Purchase (Dev Only)
                  </Button>
                </CardFooter>
              </Card>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm">
                  <strong>Note:</strong> This is just a preview of your mystery concept. Purchase the full package to get all character details, clues, and printable materials.
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => navigate(`/mystery/edit/${id}`)}>
              Continue Editing
            </Button>
            <Button onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MysteryPreview;
