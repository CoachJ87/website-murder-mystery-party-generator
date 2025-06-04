import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { User, Session } from "@supabase/supabase-js";

// Define the User type with additional fields
type AuthUser = User & {
  name?: string;
  avatar?: string;
};

// Define the context type
type AuthContextType = {
  user: AuthUser | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  isPublic: boolean;
  setIsPublic: (value: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
};

// Create context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  isAuthenticated: false,
  isPublic: false,
  setIsPublic: () => {},
  signIn: async () => {},
  signUp: async () => {},
  signInWithGoogle: async () => {},
  resetPassword: async () => {},
  signOut: async () => {},
});

// Create provider component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPublic, setIsPublic] = useState(false);
  const navigate = useNavigate();

  // Improved auth state handling with proper initialization order
  useEffect(() => {
    console.log("Setting up auth state listener");
    
    // 1. Set up the auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.id);
        
        // Only use synchronous state updates here
        setSession(currentSession);
        
        if (currentSession?.user) {
          const userData = {
            ...currentSession.user,
            name: currentSession.user.user_metadata?.name || 
                  currentSession.user.email?.split("@")[0] || 
                  "User",
            avatar: currentSession.user.user_metadata?.avatar_url || null,
          };
          setUser(userData);
        } else {
          setUser(null);
        }
        
        setLoading(false);
      }
    );
    
    // 2. THEN check for existing session
    const checkSession = async () => {
      try {
        console.log("Checking for existing session");
        const { data: { session: existingSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Error checking session:", error);
          return;
        }
        
        if (existingSession?.user) {
          console.log("Found existing session:", existingSession.user.id);
        } else {
          console.log("No existing session found");
        }
        
        // Don't set state here, the onAuthStateChange listener will handle it
      } catch (error) {
        console.error("Session check error:", error);
      }
    };
    
    checkSession();
    
    // Clean up subscription on unmount
    return () => {
      console.log("Cleaning up auth subscription");
      subscription.unsubscribe();
    };
  }, []);

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    try {
      console.log("Attempting to sign in with:", email);
      setLoading(true);
      
      // Sign in directly without workarounds
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("Sign-in error:", error);
        
        if (error.message.includes('Invalid login credentials')) {
          toast.error("The email or password you entered is incorrect. Please try again.");
        } else if (error.message.includes('Email not confirmed')) {
          toast.error("Please confirm your email before logging in. Check your inbox.");
          navigate("/check-email");
        } else {
          toast.error(`Failed to sign in: ${error.message}`);
        }
        
        throw error;
      }
      
      // If successful, navigate to dashboard
      if (data?.user) {
        console.log("Sign in successful:", data.user.id);
        toast.success("Signed in successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      // Error is already handled above
      console.error("Sign-in catch block:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (name: string, email: string, password: string) => {
    try {
      console.log("Attempting to sign up:", email);
      setLoading(true);
      
      // Validate email format
      if (!email.includes('@') || !email.includes('.')) {
        toast.error("Please enter a valid email address.");
        return;
      }
      
      // Sign up with user metadata for name
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          // For automatic sign-in without email verification (optional)
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        console.error("Sign-up error:", error);
        
        if (error.message.includes("already registered")) {
          toast.error("This email is already registered. Try signing in instead.");
        } else {
          toast.error(`Failed to create account: ${error.message}`);
        }
        
        throw error;
      }
      
      // If email confirmation is required
      if (data.user && !data.session) {
        console.log("Sign up successful, email confirmation required");
        toast.success("Account created! Please check your email to confirm your account.");
        navigate("/check-email");
        return;
      }
      
      // If auto sign-in is enabled
      if (data.user && data.session) {
        console.log("Sign up and auto sign-in successful:", data.user.id);
        toast.success("Account created successfully! You're now logged in.");
        navigate("/dashboard");
      }
    } catch (error: any) {
      // Error is already handled above
      console.error("Sign-up catch block:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sign in with Google - Updated for better OAuth handling
  const signInWithGoogle = async () => {
    try {
      console.log("Attempting to sign in with Google");
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      
      if (error) {
        console.error("Google sign-in error:", error);
        toast.error(`Failed to sign in with Google: ${error.message}`);
        throw error;
      }
      
      // Note: The redirect will happen automatically, so we don't need to navigate here
      console.log("Google OAuth redirect initiated");
    } catch (error: any) {
      console.error("Google sign-in catch block:", error);
      toast.error("Failed to initiate Google sign-in. Please try again.");
    }
  };

  // Reset password
  const resetPassword = async (email: string) => {
    try {
      setLoading(true);
      console.log("Attempting to reset password for:", email);
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      
      if (error) {
        console.error("Password reset error:", error);
        toast.error(`Failed to reset password: ${error.message}`);
        throw error;
      }
      
      toast.success("Password reset instructions sent to your email.");
    } catch (error: any) {
      // Error is already handled above
      console.error("Password reset catch block:", error);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      console.log("Signing out");
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Sign-out error:", error);
        toast.error(`Failed to sign out: ${error.message}`);
        throw error;
      }
      
      navigate("/");
      toast.success("Signed out successfully.");
    } catch (error: any) {
      // Error is already handled above
      console.error("Sign-out catch block:", error);
    } finally {
      setLoading(false);
    }
  };

  // Provide context value
  const value = {
    user,
    session,
    loading,
    isAuthenticated: !!user,
    isPublic,
    setIsPublic,
    signIn,
    signUp,
    signInWithGoogle,
    resetPassword,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook to use the auth context
export const useAuth = () => useContext(AuthContext);
