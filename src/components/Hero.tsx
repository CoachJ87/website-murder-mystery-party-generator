
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="py-12 md:py-20 px-4 bg-background">
      <div className="container mx-auto text-center">
        <div className="flex justify-center mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-pink-500 via-purple-500 to-blue-500 rounded-full opacity-90 blur-sm"></div>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-bold mb-4 tracking-tight">
          Host a Killer Party Tonight.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Generate custom murder mysteries with characters, clues, and everything you need.
        </p>
        
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          {["1920s Speakeasy", "Hollywood Murder", "Castle Mystery", "Cruise Ship Crime"].map((item) => (
            <Button 
              key={item} 
              variant="outline" 
              className="rounded-full px-6 border-border/50 bg-card/30 backdrop-blur-sm"
            >
              {item}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Hero;
