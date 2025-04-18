import { useState, useEffect, useCallback } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import { useSupabaseClient } from '@supabase/auth-helpers-react';
  import { toast } from 'sonner';
  import { useUser } from '@/hooks/useUser';
  import { MysteryPackage } from '@/components/mystery/MysteryPackage';
  import { Button } from '@/components/ui/button';
  import { Skeleton } from '@/components/ui/skeleton';

  export default function MysteryPreview() {
    const { id } = useParams();
    const navigate = useNavigate();
    const supabaseClient = useSupabaseClient();
    const { isLoading: isUserLoading, isAuthenticated, user } = useUser(); // Get the user object
    const [mystery, setMystery] = useState<MysteryPackage | null>(null);
    const [loading, setLoading] = useState(true);
    const [purchasing, setPurchasing] = useState(false);

    const loadMystery = useCallback(async () => {
      if (!id) {
        navigate('/mystery');
        return;
      }
      setLoading(true);
      const { data, error } = await supabaseClient
        .from('profiles')
        .select('has_purchased')
        .eq('id', id) // Assuming the profile ID matches the mystery ID for now
        .single();

      if (error) {
        console.error('Error loading purchase status:', error);
        toast.error('Failed to load purchase information.');
        setLoading(false);
        return;
      }

      if (data?.has_purchased) {
        navigate(`/mystery/${id}`);
        setLoading(false);
        return;
      }

      const { data: mysteryData, error: mysteryError } = await supabaseClient
        .from('prompts')
        .select('*')
        .eq('id', id)
        .single();

      if (mysteryError) {
        console.error('Error loading mystery:', mysteryError);
        toast.error('Failed to load mystery preview.');
        setLoading(false);
        return;
      }

      setMystery(mysteryData);
      setLoading(false);
    }, [id, navigate, supabaseClient]);

    useEffect(() => {
      loadMystery();
    }, [loadMystery]);

    const handlePurchase = async () => {
      if (!isAuthenticated || !user?.id) { // Ensure user is authenticated and has an ID
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
          body: JSON.stringify({ mysteryId: id, userId: user.id }), // Send the userId
        });

        if (!response.ok) {
          const errorData = await response.json();
          toast.error(`Failed to initiate purchase: ${errorData.error || 'Unknown error'}`);
          setPurchasing(false);
          return;
        }

        const { url } = await response.json();
        window.location.href = url; // Redirect to Stripe Checkout
      } catch (error) {
        console.error('Error initiating purchase:', error);
        toast.error('Failed to initiate purchase. Please try again.');
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

    return (
      <div className="container mx-auto py-10">
        <h1 className="text-3xl font-bold mb-4">{mystery?.name} - Preview</h1>
        <div className="mb-6 p-4 border rounded-md">
          <p className="text-sm text-muted-foreground mb-2">This is a preview of the murder mystery. Purchase the full version to get all the game materials!</p>
          <div className="whitespace-pre-line">{mystery?.content.split('\n\n## ')[0]}</div>
        </div>
        <Button onClick={handlePurchase} disabled={purchasing}>
          {purchasing ? 'Purchasing...' : 'Purchase Now for $4.99'}
        </Button>
      </div>
    );
  }
