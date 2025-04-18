
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useUser = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        setIsLoading(true);
        const { data: { session } } = await supabase.auth.getSession();
        setIsAuthenticated(!!session?.user);
        setUser(session?.user || null);
      } catch (error) {
        console.error('Error checking auth session:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session?.user);
      setUser(session?.user || null);
    });

    // Clean up subscription on unmount
    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  return {
    isAuthenticated,
    isLoading,
    user,
  };
};
