
import { Button } from "@/components/ui/button";
import { ArrowRight, Sparkles, Users, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Hero = () => {
  const { isAuthenticated } = useAuth();

  return (
    <section className="py-12 md:py-20 lg:py-28 px-4 md:px-8">
      <div className="container mx-auto text-center max-w-6xl">
        {/* Main Headline - Sophisticated Typography */}
        <h1 className="text-4xl md:text-5xl lg:text-7xl font-playfair font-bold text-primary mb-6 md:mb-8 leading-tight">
          Host a Killer Party Tonight
        </h1>
        
        {/* Subheadline */}
        <p className="text-lg md:text-xl lg:text-2xl font-inter text-muted-foreground mb-8 md:mb-12 max-w-4xl mx-auto leading-relaxed">
          Create custom murder mystery party games in minutes with AI. Generate characters, 
          clues, and host guides for unforgettable mystery nights with friends.
        </p>
        
        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12 md:mb-16">
          <Button asChild size="lg" className="w-full sm:w-auto text-base font-inter font-medium px-8 py-4">
            <Link to={isAuthenticated ? "/mystery-creation" : "/sign-up"}>
              Create Your Mystery
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          
          <Button asChild variant="outline" size="lg" className="w-full sm:w-auto text-base font-inter font-medium px-8 py-4">
            <Link to="/showcase">
              See Examples
            </Link>
          </Button>
        </div>
        
        {/* Feature Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-12 md:mb-16">
          <div className="text-center p-6 rounded-lg bg-card border border-border/50 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/10 rounded-lg mb-4">
              <Sparkles className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-playfair font-medium text-primary mb-2">AI-Powered Creation</h3>
            <p className="text-sm font-inter text-muted-foreground">
              Our AI generates unique mysteries tailored to your preferences in minutes
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-card border border-border/50 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-secondary/10 rounded-lg mb-4">
              <Users className="h-6 w-6 text-secondary" />
            </div>
            <h3 className="text-lg font-playfair font-medium text-primary mb-2">Perfect for Any Group</h3>
            <p className="text-sm font-inter text-muted-foreground">
              Customize for 4-12 players with difficulty levels for everyone
            </p>
          </div>
          
          <div className="text-center p-6 rounded-lg bg-card border border-border/50 hover:shadow-md transition-shadow">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-accent/10 rounded-lg mb-4">
              <Clock className="h-6 w-6 text-accent" />
            </div>
            <h3 className="text-lg font-playfair font-medium text-primary mb-2">Ready in Minutes</h3>
            <p className="text-sm font-inter text-muted-foreground">
              Complete mystery packages with host guides and character profiles
            </p>
          </div>
        </div>
        
        {/* Social Proof */}
        <div className="text-center">
          <p className="text-sm font-inter text-muted-foreground mb-4">
            Trusted by mystery enthusiasts worldwide
          </p>
          <div className="flex flex-wrap justify-center items-center gap-4 opacity-60">
            <span className="text-xs font-inter font-medium px-3 py-1 bg-muted rounded-full">500+ Mysteries Created</span>
            <span className="text-xs font-inter font-medium px-3 py-1 bg-muted rounded-full">10,000+ Players Entertained</span>
            <span className="text-xs font-inter font-medium px-3 py-1 bg-muted rounded-full">4.9★ Average Rating</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
