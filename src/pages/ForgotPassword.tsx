
import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";

const ForgotPassword = () => {
  const { resetPassword, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }
    
    try {
      await resetPassword(email);
      setSubmitted(true);
    } catch (error) {
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
                <h1 className="text-2xl font-bold mb-4 text-center">Check Your Email</h1>
                <p className="text-center text-muted-foreground mb-6">
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <div className="space-y-4">
                  <Button asChild className="w-full">
                    <Link to="/sign-in">Return to Sign In</Link>
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Didn't receive an email?{" "}
                    <button 
                      onClick={() => setSubmitted(false)} 
                      className="text-primary hover:underline"
                    >
                      Try again
                    </button>
                  </p>
                </div>
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold mb-6 text-center">Reset Your Password</h1>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
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
                    {loading ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
                
                <div className="mt-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Remembered your password?{" "}
                    <Link to="/sign-in" className="text-primary hover:underline">
                      Back to sign in
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
