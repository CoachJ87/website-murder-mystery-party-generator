
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <div className="py-20 md:py-32 px-4">
      <div className="container mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
          Develop Web Apps <span className="gradient-text">With AI</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
          Build beautiful, responsive web applications in minutes with our AI-powered development assistant. No more struggling with complex code.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="px-8 py-6 text-lg">
            <Link to="/sign-up">
              Get Started
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="px-8 py-6 text-lg">
            <Link to="/docs">Learn More</Link>
          </Button>
        </div>
        
        <div className="mt-12 md:mt-16 relative">
          <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background to-transparent z-10"></div>
          <div className="max-w-5xl mx-auto bg-card rounded-2xl shadow-xl overflow-hidden border">
            <div className="p-8 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold">AI Development Chat</h3>
                <div className="h-3 w-3 rounded-full bg-green-500"></div>
              </div>
              <div className="h-[300px] md:h-[400px] bg-secondary/50 rounded-lg"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Hero;
