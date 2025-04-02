
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Mail } from "lucide-react";

const CheckEmail = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-lg shadow-lg border p-8 text-center">
            <div className="flex justify-center mb-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-6 w-6 text-primary" />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold mb-4">Check Your Email</h1>
            <p className="text-muted-foreground mb-6">
              We've sent you a verification link. Please check your email to continue.
            </p>
            
            <div className="space-y-4">
              <Button asChild className="w-full">
                <Link to="/sign-in">Return to Sign In</Link>
              </Button>
              
              <p className="text-sm text-muted-foreground">
                Didn't receive an email?{" "}
                <Link to="/sign-in" className="text-primary hover:underline">
                  Try again
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

export default CheckEmail;
