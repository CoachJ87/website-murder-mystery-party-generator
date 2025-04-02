
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client with fallback values for development
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

// Console log to debug
console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Anon Key:", supabaseAnonKey);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

type User = {
  id: string;
  name: string;
  email: string;
  avatar?: string;
};

type AuthContextType = {
  user: User | null;
  isAuthenticated: boolean;
  isPublic: boolean;
  setIsPublic: (isPublic: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
  loading: boolean;
  resetPassword: (email: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check for existing session with Supabase
    const checkSession = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error.message);
          return;
        }
        
        if (data?.session) {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const userProfile = {
              id: userData.user.id,
              email: userData.user.email || '',
              name: userData.user.user_metadata?.name || userData.user.email?.split('@')[0] || 'User',
              avatar: userData.user.user_metadata?.avatar_url,
            };
            setUser(userProfile);
          }
        }
      } catch (error) {
        console.error("Session check error:", error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const { data: userData } = await supabase.auth.getUser();
          if (userData.user) {
            const userProfile = {
              id: userData.user.id,
              email: userData.user.email || '',
              name: userData.user.user_metadata?.name || userData.user.email?.split('@')[0] || 'User',
              avatar: userData.user.user_metadata?.avatar_url,
            };
            setUser(userProfile);
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) throw error;
      
      if (data.user) {
        toast.success("Signed in successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast.error(`Failed to sign in: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
        },
      });
      
      if (error) throw error;
      
      if (data.user) {
        toast.success("Account created! Please check your email for verification.");
        navigate("/check-email");
      }
    } catch (error: any) {
      toast.error(`Failed to create account: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      toast.info("Signed out");
      navigate("/");
    } catch (error: any) {
      toast.error(`Error signing out: ${error.message}`);
    }
  };

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) throw error;
      
      toast.success("Password reset link sent to your email");
      navigate("/check-email");
    } catch (error: any) {
      toast.error(`Failed to send reset email: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isPublic,
        setIsPublic,
        signIn,
        signUp,
        signOut,
        loading,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
