import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const MysteryPreview = () => {
  const [loading, setLoading] = useState(true);
  const [mystery, setMystery] = useState<any>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    loadMystery();
  }, [id]);

  const loadMystery = async () => {
    try {
      setLoading(true);
      
      // In a real app, fetch from Supabase
      // const { data, error } = await supabase
      //   .from('mysteries')
      //   .select('*')
      //   .eq('id', id)
      //   .single();
      
      // Simulate loading
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock data
      setMystery({
        id: id,
        title: "Murder at the Speakeasy",
        theme: "1920s Speakeasy",
        setting: "A hidden speakeasy in Chicago during the prohibition era",
        victim: "The wealthy club owner who has many powerful enemies",
        suspects: [
          "The jealous business partner",
          "The spurned lover and lounge singer",
          "The corrupt police officer on the take"
        ],
        status: "completed"
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
    
    try {
      // In a real app, this would redirect to Stripe checkout
      toast.success("Redirecting to payment...");
      navigate(`/mystery/purchase/${id}`);
    } catch (error) {
      console.error("Error initiating purchase:", error);
      toast.error("Failed to start purchase process");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
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
            <h1 className="text-3xl font-bold mb-2">{mystery.title}</h1>
            <p className="text-muted-foreground">
              Preview of your {mystery.theme} murder mystery
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
                    <p>{mystery.theme}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Setting</h3>
                    <p>{mystery.setting}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Victim</h3>
                    <p>{mystery.victim}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Suspects</h3>
                    <ul className="list-disc pl-5">
                      {mystery.suspects.map((suspect: string, index: number) => (
                        <li key={index}>{suspect}</li>
                      ))}
                    </ul>
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
                <CardFooter>
                  <Button className="w-full" onClick={handlePurchase}>
                    Purchase Now
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
