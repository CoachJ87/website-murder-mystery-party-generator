import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { CheckCircle, CreditCard, ArrowRight } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import type { Mystery } from "@/interfaces/mystery";
import { Badge } from "@/components/ui/badge";

const MysteryPurchase = () => {
  const { id } = useParams();
  const [processing, setProcessing] = useState(false);
  const [mystery, setMystery] = useState<Mystery | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    const fetchMystery = async () => {
      const { data, error } = await supabase
        .from('mysteries')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching mystery:", error);
        toast.error("Failed to load mystery details");
        return;
      }

      if (!data) {
        toast.error("Mystery not found");
        navigate('/dashboard');
        return;
      }

      setMystery(data);
    };

    fetchMystery();
  }, [id, navigate]);

  const handlePurchase = async () => {
    if (!isAuthenticated) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }
    
    try {
      setProcessing(true);
      
      // Create a checkout session with Stripe
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mysteryId: id,
          userId: user?.id,
        }),
      });

      const { url, error } = await response.json();
      
      if (error) {
        throw new Error(error);
      }

      // Redirect to Stripe checkout
      window.location.href = url;
      
    } catch (error) {
      console.error("Error processing payment:", error);
      toast.error("Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  if (!mystery) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-7xl">
            <div className="flex items-center justify-center h-64">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
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
        <div className="container mx-auto max-w-7xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Complete Your Purchase</h1>
            <p className="text-muted-foreground">
              Get full access to your murder mystery package
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Mystery Preview Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{mystery.title || mystery.ai_title}</CardTitle>
                  {mystery.theme && (
                    <Badge variant="secondary">{mystery.theme}</Badge>
                  )}
                </div>
                <CardDescription>
                  {mystery.guests ? `Perfect for ${mystery.guests} players` : 'Custom murder mystery'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-2">Mystery Premise</h3>
                    <p className="text-muted-foreground">
                      {mystery.premise || 'A captivating murder mystery that will keep your guests guessing until the very end.'}
                    </p>
                  </div>
                  {mystery.theme && (
                    <div>
                      <h3 className="font-semibold mb-2">Theme</h3>
                      <p className="text-muted-foreground">{mystery.theme}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Purchase Info Section */}
            <div className="space-y-6">
              <Card>
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
                  <Button 
                    className="w-full" 
                    size="lg" 
                    onClick={handlePurchase}
                    disabled={processing}
                  >
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
            </div>
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
