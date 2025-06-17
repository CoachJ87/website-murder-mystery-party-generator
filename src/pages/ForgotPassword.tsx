
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

const ForgotPassword = () => {
  const { t } = useTranslation();
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error(t("auth.errors.invalidEmail"));
      return;
    }
    
    try {
      await resetPassword(email);
      setSubmitted(true);
      toast.success(t('auth.success.passwordReset'));
    } catch (error) {
      toast.error(t('auth.errors.unknownError'));
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg border p-8">
            {submitted ? (
              <>
                <h1 className="text-2xl font-bold mb-4 text-center">{t('auth.forgotPassword.checkEmail.title')}</h1>
                <p className="text-center text-muted-foreground mb-6">
                  {t('auth.forgotPassword.checkEmail.message')}{" "}<strong>{email}</strong>
                </p>
                <div className="space-y-4">
                  <Button asChild className="w-full">
                    <Link to="/sign-in">{t('auth.forgotPassword.checkEmail.returnToSignIn')}</Link>
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    {t('auth.forgotPassword.checkEmail.noEmail')}{" "}
                    <button 
                      onClick={() => setSubmitted(false)} 
                      className="text-primary hover:underline"
                    >
                      {t('auth.forgotPassword.checkEmail.tryAgain')}
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-2 text-center">{t('auth.forgotPassword.title')}</h1>
                <p className="text-center text-muted-foreground mb-6">{t('auth.forgotPassword.subtitle')}</p>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">{t('auth.forgotPassword.email')}</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? t('auth.forgotPassword.sending') : t('auth.forgotPassword.submitButton')}
                  </Button>
                </form>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    {"Remembered your password?"}{" "}
                    <Link to="/sign-in" className="text-primary hover:underline">
                      {t('auth.forgotPassword.backToSignIn')}
                    </Link>
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default ForgotPassword;
