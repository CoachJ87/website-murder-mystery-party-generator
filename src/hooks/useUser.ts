import { useSupabaseClient, useUser as useSupabaseAuthUser } from '@supabase/auth-helpers-react';
import { useState, useEffect } from 'react';

export const useUser = () => {
  const supabaseClient = useSupabaseClient();
  const supabaseUser = useSupabaseAuthUser();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      setIsLoading(true);
      const { data: { session } } = await supabaseClient.auth.getSession();
      setIsAuthenticated(!!session?.user);
      setIsLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
    });

    return () => subscription.unsubscribe();
  }, [supabaseClient]);

  return {
    isAuthenticated,
    isLoading,
    user: supabaseUser, // You might also want to return the user object
  };
};
