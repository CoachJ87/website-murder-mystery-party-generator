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
      
      // Fetch mystery from Supabase
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();
        
      if (error) {
        console.error("Error loading mystery:", error);
        toast.error("Failed to load mystery details");
        return;
      }
      
      // If already purchased, redirect to view page
      if (data.has_purchased) {
        navigate(`/mystery/${id}`);
        return;
      }
      
      setMystery(data);
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
      setPurchasing(true);
      
      // Here you would typically redirect to Stripe
      // For example:
      // 1. Create a Stripe checkout session
      const response = await fetch('https://your-stripe-function-url.com/create-checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mysteryId: id,
          userId: user.id,
          productName: mystery.title || "Murder Mystery Package",
          price: 499, // $4.99 in cents
        }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { url } = await response.json();
      
      // 2. Redirect to Stripe checkout
      window.location.href = url;
      
      // Note: After successful payment, Stripe will redirect back to your site
      // You'll need a webhook to handle successful payments
      
    } catch (error) {
      console.error("Error initiating purchase:", error);
      toast.error("Failed to start purchase process");
      setPurchasing(false);
    }
  };

  // For testing only - in development
  const handleSimulatePurchase = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }
    
    try {
      setPurchasing(true);
      
      // Update the mystery as purchased
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
      
      // Navigate to dashboard where generation will happen
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
                    <p>{mystery.theme || "Not specified"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Setting</h3>
                    <p>{mystery.setting || "Custom setting"}</p>
                  </div>
                  <div>
                    <h3 className="font-medium">Victim</h3>
                    <p>{mystery.victim || "Custom victim"}</p>
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
                  
                  {/* For development testing only - remove in production */}
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
