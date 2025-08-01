import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Mail, User, Lock, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useTranslation } from "react-i18next";

const SignUp = () => {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  // TODO: Re-enable when Google OAuth is fixed
  // const [socialLoading, setSocialLoading] = useState<string | null>(null);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name || !email || !password) {
      toast.error(t("auth.errors.requiredField"));
      return;
    }
    
    if (password.length < 6) {
      toast.error(t("auth.errors.weakPassword"));
      return;
    }
    
    try {
      setIsLoading(true);
      console.log("Attempting signup with:", { email, name });
      
      // Use signUp without trying to auto-sign-in afterward
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { name },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      
      if (error) {
        console.error("Sign-up error:", error);
        
        if (error.message.includes('already registered')) {
          toast.error(t("auth.errors.emailAlreadyExists"));
        } else {
          toast.error(t("auth.errors.unknownError"));
        }
        return;
      }
      
      if (!data.user) {
        toast.error(t("auth.errors.unknownError"));
        return;
      }

      console.log("Sign up successful:", data);
      
      // For Supabase, by default email confirmation is required
      // Redirect to check email page regardless of session
      // This prevents the "Email not confirmed" error on auto-login attempts
      toast.success(t("auth.success.accountCreated"));
      
      // Add a small delay before navigation to ensure the toast is shown
      setTimeout(() => {
        navigate("/check-email");
      }, 100);
      
    } catch (error: any) {
      console.error("Sign-up catch block:", error);
      toast.error(t("auth.errors.unknownError"));
    } finally {
      setIsLoading(false);
    }
  };

  // TODO: Re-enable Google auth when OAuth issues are resolved
  // const handleGoogleSignIn = async () => {
  //   try {
  //     setSocialLoading('google');
  //     const { error } = await supabase.auth.signInWithOAuth({
  //       provider: "google",
  //       options: {
  //         redirectTo: `${window.location.origin}/auth/callback`,
  //       }
  //     });
  //     
  //     if (error) {
  //       console.error("Google sign in error:", error);
  //       toast.error(`Failed to sign in with Google: ${error.message}`);
  //       setSocialLoading(null);
  //     }
  //     // Page will redirect if successful
  //   } catch (error: any) {
  //     console.error("Google sign in catch block:", error);
  //     toast.error(`An unexpected error occurred: ${error.message || "Unknown error"}`);
  //     setSocialLoading(null);
  //   }
  // };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg border p-8">
            <h1 className="text-2xl font-bold mb-6 text-center">{t('auth.signUp.title')}</h1>
            
            {/* TODO: Re-enable Google auth when OAuth issues are resolved */}
            {/* <div className="space-y-4 mb-6">
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
            </div> */}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('auth.signUp.name')}</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('auth.signUp.name')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.signUp.email')}</Label>
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
                <Label htmlFor="password">{t('auth.signUp.password')}</Label>
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
                <p className="text-xs text-muted-foreground">
                  {t('auth.errors.weakPassword')}
                </p>
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                {isLoading ? t('auth.signUp.creatingAccount') : t('auth.signUp.submitButton')}
              </Button>
            </form>
            
            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {t('auth.signUp.hasAccount')}{" "}
                <Link to="/sign-in" className="text-primary hover:underline">
                  {t('auth.signUp.signInLink')}
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

export default SignUp;
