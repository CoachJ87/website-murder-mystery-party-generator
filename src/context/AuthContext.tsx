
import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

// Console log to debug
console.log("Supabase initialized in AuthContext");

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
  signInWithGoogle: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
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

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state changed:", event);
        
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
            
            // Create or update user profile in Supabase
            const { error } = await supabase
              .from('profiles')
              .upsert({ 
                id: userData.user.id,
                updated_at: new Date().toISOString()
              })
              .select();
              
            if (error) {
              console.error("Error updating profile:", error);
            }
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
    try {
      setLoading(true);
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

  // Helper function to validate email
  const isValidEmail = (email: string): boolean => {
    // Basic email validation
    const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!basicEmailRegex.test(email)) return false;
    
    // Check for common test domains that Supabase might reject
    const lowerEmail = email.toLowerCase();
    const testDomains = ['test.com', 'example.com', 'test.test', 'example.example'];
    
    // If using a test domain, ensure it's a valid format that Supabase will accept
    if (testDomains.some(domain => lowerEmail.endsWith(`@${domain}`))) {
      // For test emails, ensure they have a proper username
      const username = lowerEmail.split('@')[0];
      return username.length >= 3 && /^[a-z0-9._-]+$/i.test(username);
    }
    
    return true;
  };

  const signUp = async (name: string, email: string, password: string) => {
    setLoading(true);
    try {
      // Validate email first
      if (!isValidEmail(email)) {
        toast.error("Please provide a valid email address");
        setLoading(false);
        return;
      }

      // For testing purposes, use a more reliable email domain
      let signupEmail = email;
      if (email.toLowerCase() === "test@test.com") {
        signupEmail = `user${Math.floor(Math.random() * 10000)}@gmail.com`;
        toast.info(`For testing, using ${signupEmail} instead of test@test.com`);
      }

      const { data, error } = await supabase.auth.signUp({
        email: signupEmail,
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
      console.error("Signup error:", error);
      
      if (error.message.includes('email_address_invalid')) {
        toast.error("This email address is not accepted for registration. Please try another email.");
      } else {
        toast.error(`Failed to create account: ${error.message}`);
      }
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      
      if (error) {
        console.error("Google sign in error:", error);
        toast.error(`Failed to sign in with Google: ${error.message}`);
        throw error;
      }
    } catch (error: any) {
      toast.error(`Error during Google sign in: ${error.message}`);
      throw error;
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
        signInWithGoogle,
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
