
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
        
        // Get the session from the URL hash/params
        const { data, error } = await supabase.auth.getSession();
        console.log("getSession result:", { data, error });
        
        if (error) {
          console.error("OAuth callback error:", error);
          toast.error(`Authentication failed: ${error.message}`);
          navigate("/sign-in");
          return;
        }

        if (data.session) {
          console.log("OAuth callback successful:", {
            userId: data.session.user.id,
            email: data.session.user.email,
            provider: data.session.user.app_metadata?.provider
          });
          toast.success("Successfully signed in with Google!");
          navigate("/dashboard");
        } else {
          console.log("No session found in callback, checking URL for auth data...");
          
          // Try to handle the session from URL hash/fragment
          const { data: sessionData, error: sessionError } = await supabase.auth.getSessionFromUrl();
          console.log("getSessionFromUrl result:", { sessionData, sessionError });
          
          if (sessionData.session) {
            console.log("Session found from URL:", sessionData.session.user.email);
            toast.success("Successfully signed in with Google!");
            navigate("/dashboard");
          } else {
            console.log("No session found from URL either");
            toast.error("No authentication session found. Please try again.");
            navigate("/sign-in");
          }
        }
      } catch (error: any) {
        console.error("OAuth callback catch block:", error);
        toast.error("Authentication failed. Please try again.");
        navigate("/sign-in");
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-muted-foreground">Completing authentication...</p>
      </div>
    </div>
  );
};

export default AuthCallback;
