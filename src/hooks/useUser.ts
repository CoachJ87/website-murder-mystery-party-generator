
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useUser = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    console.log("useUser: Setting up auth listener");
    
    // First set up the listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("useUser: Auth state changed", session?.user?.id);
      setIsAuthenticated(!!session?.user);
      setUser(session?.user || null);
      setIsLoading(false);
    });

    // Then check current session
    const checkAuth = async () => {
      try {
        console.log("useUser: Checking current session");
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('useUser: Error checking auth session:', error);
        }
        
        // States will be updated by the onAuthStateChange listener
      } catch (error) {
        console.error('useUser: Error in checkAuth:', error);
      }
    };

    checkAuth();

    // Clean up subscription on unmount
    return () => {
      console.log("useUser: Cleaning up auth subscription");
      subscription?.unsubscribe();
    };
  }, []);

  return {
    isAuthenticated,
    isLoading,
    user,
  };
};
