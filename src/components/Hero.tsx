
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
          Idea to app in seconds.
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Lovable is your superhuman full stack engineer.
        </p>
        
        <div className="max-w-3xl mx-auto mb-12">
          <div className="rounded-xl bg-card/80 backdrop-blur-sm border shadow-lg overflow-hidden">
            <div className="p-4">
              <textarea 
                className="w-full bg-transparent text-foreground text-lg p-2 focus:outline-none resize-none" 
                placeholder="Ask Lovable to create a web app that.."
                rows={3}
              />
              <div className="flex justify-between items-center mt-2">
                <div className="flex gap-4">
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    Attach
                  </Button>
                  <Button variant="ghost" size="sm" className="text-muted-foreground">
                    Import
                  </Button>
                </div>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" className="rounded-full">
                    Public
                  </Button>
                  <Button size="icon" variant="outline" className="rounded-full w-8 h-8">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex flex-wrap justify-center gap-4">
          {["Task manager", "VitePress docs", "Kanban board", "Expense tracker"].map((item) => (
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
        
        <div className="mt-24 md:mt-32 relative hidden md:block">
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
