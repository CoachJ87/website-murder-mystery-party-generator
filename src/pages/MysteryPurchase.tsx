
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { CheckCircle, CreditCard, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const MysteryPurchase = () => {
  const { id } = useParams();
  const [processing, setProcessing] = useState(false);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }
    
    try {
      setProcessing(true);
      
      // Simulate payment processing
      toast.loading("Processing payment...");
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update the conversation to mark it as purchased
      if (user && id) {
        const { error: conversationError } = await supabase
          .from("conversations")
          .update({ 
            is_purchased: true,
            purchase_date: new Date().toISOString()
          })
          .eq("id", id);
          
        if (conversationError) {
          console.error("Error updating conversation:", conversationError);
        }
        
        // If user has profile table, you could update it too
        const { error: profileError } = await supabase
          .from("profiles")
          .upsert({ 
            id: user.id,
            has_purchased: true,
            updated_at: new Date().toISOString()
          });
          
        if (profileError) {
          console.error("Error updating profile:", profileError);
        }
      }
      
      toast.success("Purchase successful! You now have access to the full mystery package.");
      navigate(`/mystery/${id}`);
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-3xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Complete Your Purchase</h1>
            <p className="text-muted-foreground">
              Get full access to your murder mystery package
            </p>
          </div>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Murder Mystery Package</CardTitle>
              <CardDescription>One-time purchase, instant access</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4 mb-6">
                <div className="h-16 w-16 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-2xl mb-1">$4.99</div>
                  <p className="text-muted-foreground">
                    Complete murder mystery package with all character materials, clues, and hosting instructions.
                  </p>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <h3 className="font-medium">What's included:</h3>
                {[
                  "Full character profiles for all suspects",
                  "Host guide with step-by-step instructions",
                  "Printable character sheets",
                  "Evidence and clue cards",
                  "Timeline of events",
                  "Solution reveal script",
                  "PDF downloads of all materials"
                ].map((item, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" size="lg" onClick={handlePurchase} disabled={processing}>
                {processing ? (
                  <>
                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  <>
                    Complete Purchase
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
          
          <div className="bg-muted rounded-lg p-6">
            <h3 className="font-medium mb-2">Important Notes</h3>
            <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
              <li>This is a one-time purchase for this specific mystery package</li>
              <li>You'll have permanent access to download all materials</li>
              <li>Content is for personal use only, not for commercial redistribution</li>
              <li>Need help? Contact our support at support@mysterygenerator.com</li>
            </ul>
          </div>
          
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => navigate(`/mystery/preview/${id}`)}>
              Back to Preview
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MysteryPurchase;
