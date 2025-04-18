import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useUser } from '@/hooks/useUser';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Define the MysteryPackage type to fix the missing import
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

  const loadMystery = useCallback(async () => {
    if (!id) {
      navigate('/mystery');
      return;
    }

    setLoading(true);

    try {
      // Check if user has already purchased this mystery
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

      // Load mystery details - Changed to fetch from Vercel API
      const response = await fetch(`/api/get-mystery/${id}`);
      if (!response.ok) {
        const errorData = await response.json();
        toast.error(`Failed to load mystery preview: ${errorData?.error || 'Unknown error'}`);
        return;
      }
      const mysteryData = await response.json();
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

  const simulatePurchase = async () => {
    if (!user?.id) {
      toast.error("Please sign in to purchase this mystery");
      navigate("/sign-in");
      return;
    }

    setPurchasing(true);
    try {
      // Update the profiles table to mark the mystery as purchased
      const { error } = await supabase
        .from('profiles')
        .update({
          has_purchased: true,
          purchase_date: new Date().toISOString()
        })
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
        const errorData = await response.json();
        toast.error(`Failed to initiate purchase: ${errorData.error || 'Unknown error'}`);
        return;
      }

      const { url } = await response.json();
      window.location.href = url; // Redirect to Stripe Checkout
    } catch (error) {
      console.error('Error initiating purchase:', error);
      toast.error('Failed to initiate purchase. Please try again.');
    } finally {
      setPurchasing(false);
    }
  };

  if (isUserLoading || loading) {
    return (
      <div className="container mx-auto py-10">
        <Skeleton className="h-10 w-80 mb-4" />
        <Skeleton className="h-64 w-full rounded-md" />
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-md" />
          <Skeleton className="h-48 rounded-md" />
        </div>
      </div>
    );
  }

  if (!mystery) {
    return (
      <div className="container mx-auto py-10 text-center">
        <p className="text-lg text-muted-foreground">Mystery not found.</p>
      </div>
    );
  }

  // Extract the premise without cutting it off
  const premise = mystery?.premise || mystery?.content.split('\n\n')[0] || '';

  return (
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
          <ul className="list-disc ml-4 space-y-1">
            <li>Full character profiles for all suspects</li>
            <li>Host guide with step-by-step instructions</li>
            <li>Printable character sheets</li>
            <li>Evidence and clue cards</li>
            <li>Timeline of events</li>
            <li>Solution reveal script</li>
            <li>PDF downloads of all materials</li>
          </ul>

          <div className="mt-6 p-3 bg-muted/50 rounded">
            <h3 className="font-semibold">Important Notes</h3>
            <ul className="text-sm list-disc ml-4 mt-2 space-y-1">
              <li>This is a one-time purchase for this specific mystery package</li>
              <li>You'll have permanent access to download all materials</li>
              <li>Content is for personal use only, not for commercial redistribution</li>
              <li>Need help? Contact our support at support@mysterygenerator.com</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <Button onClick={handlePurchase} disabled={purchasing} className="flex-1">
          {purchasing ? 'Processing...' : 'Purchase Now for $4.99'}
        </Button>
        {process.env.NODE_ENV !== 'production' && (
          <Button onClick={simulatePurchase} variant="outline" disabled={purchasing} className="flex-1">
            Simulate Purchase (Dev Only)
          </Button>
        )}
      </div>
    </div>
  );
}
