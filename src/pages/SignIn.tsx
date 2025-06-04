import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";

const SignIn = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }
    
    try {
      setIsLoading(true);
      console.log("Attempting direct signin with:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error("Direct signin error:", error.message);
        if (error.message.includes('Invalid login credentials')) {
          toast.error("The email or password you entered is incorrect. Please try again.");
        } else if (error.message.includes('Email not confirmed')) {
          toast.error("Please confirm your email before logging in. Check your inbox.");
          navigate("/check-email");
        } else {
          toast.error(`Failed to sign in: ${error.message}`);
        }
        return;
      }
      
      if (data?.user) {
        console.log("Signin successful:", data);
        toast.success("Signed in successfully!");
        navigate("/dashboard");
      }
    } catch (error: any) {
      console.error("Signin catch block error:", error);
      toast.error(`An unexpected error occurred: ${error.message || "Unknown error"}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      console.log("=== Google Sign-In Debug Info ===");
      console.log("Current origin:", window.location.origin);
      console.log("Current URL:", window.location.href);
      
      setSocialLoading('google');
      
      const redirectUrl = `${window.location.origin}/auth/callback`;
      console.log("Redirect URL:", redirectUrl);
      
      const oauthConfig = {
        provider: "google" as const,
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        }
      };
      
      console.log("OAuth config:", JSON.stringify(oauthConfig, null, 2));
      console.log("Calling supabase.auth.signInWithOAuth...");
      
      const { data, error } = await supabase.auth.signInWithOAuth(oauthConfig);
      
      console.log("signInWithOAuth response:", { 
        data, 
        error,
        hasUrl: !!data?.url,
        provider: data?.provider 
      });
      
      if (error) {
        console.error("❌ Google sign-in error:", error);
        console.error("Error details:", {
          message: error.message,
          status: error.status,
          details: error
        });
        toast.error(`Failed to sign in with Google: ${error.message}`);
        setSocialLoading(null);
        return;
      }
      
      if (data?.url) {
        console.log("✅ OAuth redirect URL generated:", data.url);
        console.log("🔄 Browser should redirect to Google now...");
        // The redirect will happen automatically, so don't reset loading state
        
        // Add a timeout as a fallback in case redirect doesn't work
        setTimeout(() => {
          console.log("⚠️ Redirect timeout - this might indicate an issue");
          setSocialLoading(null);
        }, 5000);
      } else {
        console.warn("⚠️ No redirect URL returned from signInWithOAuth");
        console.log("Response data:", data);
        toast.error("Failed to initiate Google sign-in. No redirect URL received.");
        setSocialLoading(null);
      }
      
    } catch (error: any) {
      console.error("❌ Google sign-in catch block:", error);
      console.error("Catch block error details:", {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error(`An unexpected error occurred: ${error.message || "Unknown error"}`);
      setSocialLoading(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg border p-8">
            <h1 className="text-2xl font-bold mb-6 text-center">Sign In</h1>
            
            <div className="space-y-4 mb-6">
              <Button 
                variant="outline" 
                className="w-full flex items-center justify-center gap-2"
                onClick={handleGoogleSignIn}
                disabled={!!socialLoading}
              >
                {socialLoading === 'google' ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                )}
                <span>Continue with Google</span>
              </Button>
            </div>
            
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password">Password</Label>
                  <Link to="/forgot-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {isLoading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link to="/sign-up" className="text-primary hover:underline">
                  Sign up
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default SignIn;
