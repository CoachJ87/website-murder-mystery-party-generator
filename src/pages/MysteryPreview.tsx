
import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, CheckCircle, CreditCard } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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
  const [error, setError] = useState<string | null>(null);

  const loadMysteryFromSupabase = useCallback(async () => {
    if (!id) return null;

    try {
      const { data: conversation, error: conversationError } = await supabase
        .from('conversations')
        .select('*, messages(*)')
        .eq('id', id)
        .single();

      if (conversationError) throw conversationError;
      if (!conversation) throw new Error('No conversation found');

      const aiMessages = conversation.messages?.filter(msg => msg.role === 'assistant') || [];
      const latestMessage = aiMessages.length > 0 
        ? aiMessages[aiMessages.length - 1] 
        : null;

      return {
        id: conversation.id,
        name: conversation.title || 'Custom Murder Mystery',
        content: latestMessage?.content || 'Mystery content not available yet.',
        theme: conversation.mystery_data?.theme || 'Classic',
        num_players: conversation.mystery_data?.playerCount || 6,
        premise: extractPremise(latestMessage?.content)
      };
    } catch (error) {
      console.error('Error fetching mystery from Supabase:', error);
      return null;
    }
  }, [id]);

  const extractPremise = (content?: string) => {
    if (!content) return '';
    
    const premiseMatch = content.match(/##?\s*PREMISE\s*\n([\s\S]*?)(?=##|\n\n|$)/i);
    if (premiseMatch && premiseMatch[1]) {
      return premiseMatch[1].trim();
    }
    
    const paragraphs = content.split('\n\n');
    return paragraphs[0] || '';
  };

  const loadMystery = useCallback(async () => {
    if (!id) {
      navigate('/mystery');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (user?.id) {
        const { data, error } = await supabase
          .from('profiles')
          .select('has_purchased')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error loading purchase status:', error);
        } else if (data?.has_purchased) {
          navigate(`/mystery/${id}`);
          return;
        }
      }

      const mysteryData = await loadMysteryFromSupabase();
      
      if (mysteryData) {
        setMystery(mysteryData);
        return;
      }

      try {
        const response = await fetch(`/api/get-mystery/${id}`);
        
        if (!response.ok) {
          throw new Error(`Failed to load mystery: ${response.status} ${response.statusText}`);
        }
        
        const apiMysteryData = await response.json();
        setMystery(apiMysteryData);
      } catch (apiError: any) {
        console.error('Error fetching from API:', apiError);
        setError('Could not load mystery preview. Please try again later.');
        toast.error('Failed to load mystery preview.');
      }

    } catch (error: any) {
      console.error('Error in loadMystery:', error);
      setError('An error occurred while loading the mystery.');
      toast.error('An error occurred while loading the mystery.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate, user?.id, loadMysteryFromSupabase]);

  useEffect(() => {
    loadMystery();
  }, [loadMystery]);

  const simulatePurchase = async () => {
    if (!user?.id) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }

    setPurchasing(true);
    try {
      // Check if the profiles table has a purchase_date column
      const { error: columnCheckError } = await supabase
        .rpc('column_exists', { 
          p_table: 'profiles', 
          p_column: 'purchase_date' 
        });

      // Only update the has_purchased field since purchase_date doesn't exist in the type
      const { error } = await supabase
        .from('profiles')
        .update({ has_purchased: true })
        .eq('id', user.id);

      if (error) {
        throw error;
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

  const handlePurchase = async () => {
    if (!isAuthenticated || !user?.id) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }

    setPurchasing(true);
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mysteryId: id, userId: user.id }),
      });

      if (!response.ok) {
        throw new Error("Failed to initiate purchase");
      }

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url; // Redirect to Stripe Checkout
      } else {
        throw new Error("Invalid response from payment service");
      }
    } catch (error) {
      console.error('Error initiating purchase:', error);
      toast.error('Failed to initiate purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (isUserLoading || loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto py-10 flex-grow">
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

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto py-10 text-center flex-grow">
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
          <Button onClick={() => navigate('/mystery')} className="mt-4">
            Return to Mysteries
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  if (!mystery) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="container mx-auto py-10 text-center flex-grow">
          <p className="text-lg text-muted-foreground">Mystery not found.</p>
          <Button onClick={() => navigate('/mystery')} className="mt-4">
            Return to Mysteries
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  const premise = mystery?.premise || mystery?.content.split('\n\n')[0] || '';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow">
        <div className="container mx-auto py-10">
          <h1 className="text-3xl font-bold mb-4">{mystery?.name}</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="p-4 border rounded-md">
              <h2 className="text-xl font-semibold mb-4">Preview</h2>
              <p className="font-bold">Theme:</p>
              <p className="mb-2">{mystery?.theme || 'Classic Murder Mystery'}</p>

              <p className="font-bold">Number of Players:</p>
              <p className="mb-2">{mystery?.num_players || 6}</p>

              <p className="font-bold">Premise:</p>
              <p className="whitespace-pre-line">{premise}</p>
            </div>

            <div className="p-4 border rounded-md">
              <h2 className="text-xl font-semibold mb-4">What's Included</h2>
              <ul className="space-y-2">
                {[
                  "Full character profiles for all suspects",
                  "Host guide with step-by-step instructions",
                  "Printable character sheets",
                  "Evidence and clue cards",
                  "Timeline of events",
                  "Solution reveal script",
                  "PDF downloads of all materials"
                ].map((item, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mb-6 p-3 bg-muted/50 rounded">
            <h3 className="font-semibold">Important Notes</h3>
            <ul className="text-sm list-disc ml-4 mt-2 space-y-1">
              <li>This is a one-time purchase for this specific mystery package</li>
              <li>You'll have permanent access to download all materials</li>
              <li>Content is for personal use only, not for commercial redistribution</li>
              <li>Need help? Contact our support at support@mysterygenerator.com</li>
            </ul>
          </div>

          <div className="flex gap-4">
            <Button onClick={handlePurchase} disabled={purchasing} className="flex-1">
              {purchasing ? 'Processing...' : (
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Purchase Now for $4.99
                </span>
              )}
            </Button>
            {process.env.NODE_ENV !== 'production' && (
              <Button onClick={simulatePurchase} variant="outline" disabled={purchasing} className="flex-1">
                Simulate Purchase (Dev Only)
              </Button>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
