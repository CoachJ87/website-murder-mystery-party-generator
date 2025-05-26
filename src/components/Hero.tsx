
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Clock, Zap } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="text-center space-y-8">
      <div className="space-y-4">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
          Create Epic{" "}
          <span className="text-primary">Murder Mysteries</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Design custom murder mystery games for your friends, family, or events. 
          Our AI helps you create engaging stories with unique characters, clues, and plot twists.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button asChild size="lg" className="text-lg px-8 py-6">
          <Link to="/sign-up">
            <MessageCircle className="mr-2 h-5 w-5" />
            Get Started Free
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="text-lg px-8 py-6">
          <Link to="/showcase">
            View Examples
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
        <div className="space-y-3">
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
            <Users className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">4-32 Players</h3>
          <p className="text-muted-foreground">
            Perfect for intimate gatherings or large parties
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
            <Clock className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">Quick Setup</h3>
          <p className="text-muted-foreground">
            Generate complete mysteries in minutes, not hours
          </p>
        </div>
        
        <div className="space-y-3">
          <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto">
            <Zap className="h-6 w-6 text-primary" />
          </div>
          <h3 className="text-xl font-semibold">AI-Powered</h3>
          <p className="text-muted-foreground">
            Smart storytelling that creates unique, engaging mysteries
          </p>
        </div>
      </div>
    </div>
  );
};

export default Hero;
