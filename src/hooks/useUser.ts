
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

export const useUser = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let mounted = true;
    
    // Set timeout to prevent infinite loading
    const timeout = setTimeout(() => {
      if (mounted) {
        setIsLoading(false);
      }
    }, 2000);
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      
      setIsAuthenticated(!!session?.user);
      setUser(session?.user || null);
      setIsLoading(false);
      clearTimeout(timeout);
    });

    // Check current session with error handling
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (mounted) {
          setIsAuthenticated(!!session?.user);
          setUser(session?.user || null);
          setIsLoading(false);
          clearTimeout(timeout);
        }
      } catch (error) {
        console.error('useUser: Error in checkAuth:', error);
        if (mounted) {
          setIsLoading(false);
          clearTimeout(timeout);
        }
      }
    };

    checkAuth();

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription?.unsubscribe();
    };
  }, []);

  return {
    isAuthenticated,
    isLoading,
    user,
  };
};
