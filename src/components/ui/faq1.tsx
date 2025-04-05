
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
      question: "What is the Murder Mystery Creator and how does it work?",
      answer:
        "Murder Mystery Creator is an AI-powered app that designs custom murder mystery party games. You answer a few questions about your preferences (theme, player count), and our AI generates a complete package with character guides, story elements, and game materials—all tailored to your specific event needs.",
    },
    {
      question: "How does the creation and purchase process work?",
      answer:
        "The process is simple: First, create your murder mystery story by answering a few questions about theme and player count. You'll get a preview of your story and characters for free. When you're satisfied with your creation, you can purchase the complete package for $4.99. This one-time purchase gives you instant access to downloadable PDFs including a comprehensive host guide and detailed character profiles for every player.",
    },
    {
      question: "Can I save my work and come back to it later?",
      answer:
        "Yes! All your murder mystery projects are saved to your account and you can return to edit them at any time.",
    },
    {
      question: "Are these murder mysteries replayable?",
      answer:
        "Yes! Our murder mysteries are designed with replayability in mind. The random murderer selection mechanism means that even with the same character set and scenario, you'll get a different experience each time you play. This allows you to host the same mystery multiple times with different groups or even with the same group for a fresh experience.",
    },
    {
      question: "How many players do I need for a murder mystery game?",
      answer:
        "Our murder mysteries are designed to accommodate various group sizes. We have options for small gatherings (5-6 players), medium-sized events (7-10 players), and larger parties (11+ players). The system will customize the character count and story complexity based on your specified player count.",
    },
    {
      question: "Can I customize the difficulty level of my mystery?",
      answer:
        "Absolutely! When creating your mystery, you can choose from three difficulty levels: Easy (perfect for first-time players and casual gatherings), Medium (balanced complexity with moderate sleuthing required), and Hard (intricate plots with complex clues for experienced mystery solvers).",
    },
    {
      question: "Do I need to prepare anything else for my murder mystery party?",
      answer:
        "Our packages include everything needed for the game itself. You'll receive a host guide with setup instructions, individual character materials for each player, and all necessary clues and game elements. You may want to plan complementary aspects like themed food, decorations, or costume suggestions, but these are optional enhancements.",
    },
    {
      question: "What if I need to add or remove players at the last minute?",
      answer:
        "We understand plans can change! Our system allows you to adjust your player count even after creating your mystery. The AI will intelligently adapt the story and characters to accommodate these changes without compromising the quality or coherence of the mystery.",
    },
  ],
}: Faq1Props) => {
  return (
    <section className="py-32">
      <div className="container mx-auto">
        <h1 className="mb-4 text-3xl font-semibold md:mb-11 md:text-5xl">
          {heading}
        </h1>
        
        {items.map((item, index) => (
          <React.Fragment key={index}>
            <Accordion type="single" collapsible>
              <AccordionItem value={`item-${index}`}>
                <AccordionTrigger className="hover:text-foreground/60 hover:no-underline">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent>{item.answer}</AccordionContent>
              </AccordionItem>
            </Accordion>
            {index < items.length - 1 && <Separator className="my-2" />}
          </React.Fragment>
        ))}
      </div>
    </section>
  );
};

export { Faq1 };
