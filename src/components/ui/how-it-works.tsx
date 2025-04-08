
import React from "react";
import { cn } from "@/lib/utils";

interface Step {
  number: number;
  title: string;
  description: string;
}

interface HowItWorksProps {
  steps: Step[];
  className?: string;
}

export function HowItWorks({ steps, className }: HowItWorksProps) {
  return (
    <div className={cn("py-16 px-4", className)}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-center">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center relative">
                {/* Number Circle */}
                <div className="bg-black text-white rounded-full h-16 w-16 flex items-center justify-center text-xl font-bold mb-5 z-10">
                  {step.number}
                </div>
                
                {/* Title and Description */}
                <div className="max-w-[180px]">
                  <h3 className="font-medium mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
