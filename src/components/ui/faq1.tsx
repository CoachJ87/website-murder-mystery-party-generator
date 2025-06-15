
import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

interface FaqItem {
  question: string;
  answer: string;
}

interface Faq1Props {
  heading?: string;
  items?: FaqItem[];
}

const Faq1 = ({
  heading = "Frequently asked questions",
  items = [
    {
      question: "What is Mystery Maker and how does it work?",
      answer:
        "Mystery Maker is an AI-powered platform that creates custom murder mystery parties exactly how you want them. Tell us your unique vision - any theme, characters, or setting - and our AI generates everything you need: character profiles, clues, and host materials tailored specifically for your party.",
    },
    {
      question: "How does the creation and purchase process work?",
      answer:
        "Simple! First, describe your ideal murder mystery and we'll create a custom preview for free. When you're happy with your mystery, purchase the complete package for $11.99. You'll instantly get everything needed to host: detailed character profiles, host guide, and all game materials.",
    },
    {
      question: "Can I save my work and come back to it later?",
      answer:
        "Yes! All your custom mysteries are saved to your account so you can return and edit them anytime.",
    },
    {
      question: "Are these murder mysteries replayable?",
      answer:
        "Absolutely! Our mysteries include variable elements so each playthrough feels fresh, even with the same group. You can host your custom mystery as many times as you want.",
    },
    {
      question: "How many players do I need?",
      answer:
        "Our system creates mysteries for any group size you specify - from intimate gatherings of 4-6 players to larger parties of 15+ players. Just tell us your player count and we'll design accordingly.",
    },
    {
      question: "What's included in my custom mystery package?",
      answer:
        "Everything you need: a comprehensive host guide with step-by-step instructions, detailed character profiles for each player, clues, evidence, and all game materials. No additional preparation required.",
    },
    {
      question: "Can I modify my mystery after creating it?",
      answer:
        "Of course! Use our editor to refine and adjust your mystery until it's exactly right for your group. Change characters, themes, or complexity anytime.",
    },
    {
      question: "How long does a typical game last?",
      answer:
        "Most mysteries run 2-3 hours, but you control the pacing. Our host guide includes timing suggestions that you can adjust to fit your schedule.",
    },
    {
      question: "Do you offer themed mysteries for special occasions?",
      answer:
        "We create any theme you can imagine! From classic 1920s speakeasies to space stations to fairy tale kingdoms - tell us your vision and we'll make it happen.",
    },
  ],
}: Faq1Props) => {
  return (
    <section className="py-32">
      <div className="container mx-auto">
        <h1 className="mb-4 text-3xl font-semibold md:mb-11 md:text-5xl">
          {heading}
        </h1>
        
        <div>
          {items.map((item, index) => (
            <React.Fragment key={index}>
              <Accordion type="single" collapsible>
                <AccordionItem value={`item-${index}`} className="border-none">
                  <AccordionTrigger className="hover:text-foreground/60 hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              </Accordion>
              {index < items.length - 1 && <Separator className="my-1" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Faq1 };
