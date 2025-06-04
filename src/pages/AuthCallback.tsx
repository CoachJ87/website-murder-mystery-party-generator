
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        console.log("Handling OAuth callback");
        
        // Get the session from the URL hash
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("OAuth callback error:", error);
          toast.error(`Authentication failed: ${error.message}`);
          navigate("/sign-in");
          return;
        }

        if (data.session) {
          console.log("OAuth callback successful:", data.session.user.email);
          toast.success("Successfully signed in with Google!");
          navigate("/dashboard");
        } else {
          console.log("No session found in callback");
          navigate("/sign-in");
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
