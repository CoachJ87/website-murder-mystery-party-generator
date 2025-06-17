
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("=== OAuth Callback Handler Started ===");
        console.log("Current URL:", window.location.href);
        console.log("URL Hash:", window.location.hash);
        console.log("URL Search:", window.location.search);
        console.log("URL Search Params:", new URLSearchParams(window.location.search));
        
        // Parse URL parameters to see what Google sent back
        const urlParams = new URLSearchParams(window.location.search);
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        
        console.log("URL Params entries:", Array.from(urlParams.entries()));
        console.log("Hash Params entries:", Array.from(hashParams.entries()));
        
        // Check for error parameters
        const error = urlParams.get('error') || hashParams.get('error');
        const errorDescription = urlParams.get('error_description') || hashParams.get('error_description');
        
        if (error) {
          console.error("OAuth error from URL:", { error, errorDescription });
          toast.error(`OAuth error: ${errorDescription || error}`);
          navigate("/sign-in");
          return;
        }
        
        // Check for authorization code or access token
        const code = urlParams.get('code');
        const accessToken = hashParams.get('access_token');
        const sessionData = hashParams.get('session');
        
        console.log("OAuth response data:", { 
          code: code ? "present" : "missing",
          accessToken: accessToken ? "present" : "missing",
          sessionData: sessionData ? "present" : "missing"
        });
        
        // Wait a moment for Supabase to process the callback
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Get the session from Supabase
        console.log("Attempting to get session from Supabase...");
        const { data, error: sessionError } = await supabase.auth.getSession();
        console.log("getSession result:", { 
          hasSession: !!data.session,
          sessionError,
          userId: data.session?.user?.id,
          email: data.session?.user?.email,
          provider: data.session?.user?.app_metadata?.provider
        });
        
        if (sessionError) {
          console.error("Session retrieval error:", sessionError);
          toast.error(`Authentication failed: ${sessionError.message}`);
          navigate("/sign-in");
          return;
        }

        if (data.session) {
          console.log("✅ OAuth callback successful!", {
            userId: data.session.user.id,
            email: data.session.user.email,
            provider: data.session.user.app_metadata?.provider
          });
          toast.success("Successfully signed in with Google!");
          navigate("/dashboard");
        } else {
          console.log("❌ No session found in callback");
          
          // Additional debugging: Check auth state directly
          console.log("Checking auth state directly...");
          const { data: user } = await supabase.auth.getUser();
          console.log("Direct user check:", { 
            hasUser: !!user.user,
            userId: user.user?.id 
          });
          
          toast.error("Authentication session not established. Please try signing in again.");
          navigate("/sign-in");
        }
      } catch (error: any) {
        console.error("❌ OAuth callback catch block:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        toast.error("Authentication failed due to an unexpected error. Please try again.");
        navigate("/sign-in");
      }
    };

    // Add a small delay to ensure the URL is fully loaded
    const timer = setTimeout(handleAuthCallback, 100);
    
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing Google authentication...</p>
        <p className="text-sm text-muted-foreground mt-2">Please wait while we verify your account...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
