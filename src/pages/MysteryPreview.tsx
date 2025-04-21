import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { CheckCircle, CreditCard } from 'lucide-react';

interface MysteryPackage {
  id: string;
  name: string;
  content: string;
  theme?: string;
  num_players?: number;
  premise?: string;
}

export default function MysteryPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isLoading: isUserLoading, isAuthenticated, user } = useUser();
  const [mystery, setMystery] = useState<MysteryPackage | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);
  const [polling, setPolling] = useState(false);

  const extractPremiseFromMessages = (messages: any[]) => {
    const aiMessages = messages.filter(msg => msg.is_ai === true || msg.role === 'assistant');
    
    for (const msg of aiMessages) {
      const content = msg.content || '';
      const premiseMatch = content.match(/## PREMISE\n([\s\S]*?)(?=\n##|\n$)/i);
      if (premiseMatch && premiseMatch[1]) {
        return premiseMatch[1].trim();
      }
    }

    if (aiMessages.length > 0) {
      const firstMsg = aiMessages[0].content || '';
      const firstParagraph = firstMsg.split('\n\n')[0] || '';
      return firstParagraph.length > 200 ? firstParagraph.substring(0, 200) + '...' : firstParagraph;
    }
    
    return 'An intriguing murder mystery awaits...';
  };

  const loadMystery = useCallback(async () => {
    if (!id) {
      navigate('/dashboard');
      return;
    }

    setLoading(true);

    try {
      if (user?.id) {
        const { data, error } = await supabase
          .from('conversations')
          .select('is_paid')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error loading purchase status:', error);
        } else if (data?.is_paid) {
          toast.info("You've already purchased this mystery!");
          navigate(`/mystery/${id}`);
          return;
        }
      }

      const { data, error } = await supabase
        .from('conversations')
        .select('*, mystery_data, messages(*)')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error loading mystery:', error);
        toast.error('Failed to load mystery preview');
        return;
      }

      const mysteryData = {
        id: data.id,
        name: data.title || 'Mystery Preview',
        theme: data.mystery_data?.theme || 'Classic Mystery',
        num_players: data.mystery_data?.playerCount || 6,
        content: '',
        premise: extractPremiseFromMessages(data.messages || [])
      };

      setMystery(mysteryData);
    } catch (error) {
      console.error('Error in loadMystery:', error);
      toast.error('An error occurred while loading the mystery.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, user?.id]);

  useEffect(() => {
    loadMystery();
  }, [loadMystery]);

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (polling && id) {
      interval = setInterval(async () => {
        try {
          const { data, error } = await supabase
            .from('conversations')
            .select('is_paid')
            .eq('id', id)
            .single();

          if (!error && data?.is_paid) {
            toast.success("Payment confirmed! Loading your package...");
            setPolling(false);
            navigate(`/mystery/${id}`);
          }
        } catch (e) {
          console.error("Polling failed:", e);
        }
      }, 2000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [polling, id, navigate]);

  const handlePurchase = async () => {
    if (!user?.id) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }
    setPurchasing(true);
    try {
      setPolling(true);

      const res = await fetch("/api/create-checkout-session.js", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          mysteryId: id,
          userId: user.id
        })
      });

      const json = await res.json();
      if (!json.url) {
        throw new Error(json.error || "Failed to create Stripe checkout session");
      }

      window.open(json.url, "_blank");
      toast.info("Please complete your purchase in the newly opened Stripe window.");
    } catch (err: any) {
      setPolling(false);
      toast.error(
        err?.message || "Failed to connect to Stripe. Please try again or use Simulate Purchase."
      );
      console.error("Stripe start error:", err);
    } finally {
      setPurchasing(false);
    }
  };

  const simulatePurchase = async () => {
    if (!user?.id) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }

    setPurchasing(true);
    try {
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          has_purchased: true,
          purchase_date: new Date().toISOString()
        })
        .eq('id', user.id);

      if (profileError) {
        throw profileError;
      }
      
      const { error: convError } = await supabase
        .from('conversations')
        .update({
          is_paid: true,
          status: "published",
          purchase_date: new Date().toISOString()
        })
        .eq('id', id);
        
      if (convError) {
        console.error("Warning: Could not update conversation:", convError);
      }

      toast.success("Purchase simulated successfully!");
      navigate(`/mystery/${id}`);
    } catch (error) {
      console.error('Error simulating purchase:', error);
      toast.error('Failed to simulate purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (isUserLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto py-10 flex-1">
          <Skeleton className="h-10 w-80 mb-4" />
          <Skeleton className="h-64 w-full rounded-md" />
          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-48 rounded-md" />
            <Skeleton className="h-48 rounded-md" />
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!mystery) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto py-10 flex-1 text-center">
          <p className="text-lg text-muted-foreground">Mystery not found.</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="container mx-auto py-10 flex-1">
        <h1 className="text-3xl font-bold mb-6">{mystery?.name}</h1>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Mystery Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-bold text-lg mb-2">Theme</h3>
                <p>{mystery?.theme || 'Classic Murder Mystery'}</p>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2">Number of Players</h3>
                <p>{mystery?.num_players || 6} players</p>
              </div>
              
              <div>
                <h3 className="font-bold text-lg mb-2">Premise</h3>
                <p className="whitespace-pre-line">{mystery?.premise}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Purchase This Mystery</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4 mb-4">
                <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center shrink-0">
                  <CreditCard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <div className="font-bold text-2xl mb-1">$4.99</div>
                  <p className="text-muted-foreground">One-time purchase, instant access</p>
                </div>
              </div>
              
              <div className="space-y-3">
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
              
              <Button onClick={handlePurchase} disabled={purchasing} className="w-full mt-4">
                {purchasing ? 'Processing...' : 'Purchase Now'}
              </Button>
              
              <Button onClick={simulatePurchase} variant="outline" disabled={purchasing} className="w-full mt-2">
                Simulate Purchase (Dev Mode)
              </Button>
            </CardContent>
          </Card>
        </div>
        
        <div className="mt-8 text-center">
          <Button variant="outline" onClick={() => navigate("/dashboard")}>
            Back to Dashboard
          </Button>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
