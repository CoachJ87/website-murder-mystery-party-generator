
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
    {
      question: "Can I run the same mystery multiple times with different groups?",
      answer:
        "Absolutely! Once you've purchased a mystery, it's yours to use as many times as you want. Many hosts find they can run the same mystery with different groups of friends, adding their own spin to it each time.",
    },
    {
      question: "Do you offer themed mysteries for special occasions?",
      answer:
        "Yes, we have specially designed themes for holidays, birthdays, corporate events, and more. You can also work with our AI to customize any theme to fit your specific occasion.",
    },
    {
      question: "How long does a typical murder mystery game last?",
      answer:
        "Most of our mysteries are designed to run for 2-3 hours, but the timing is flexible. The host guide provides suggestions for pacing, and you can adjust the game length by extending casual conversation periods or shortening them to fit your schedule.",
    },
    {
      question: "Is there an age recommendation for your murder mysteries?",
      answer:
        "We offer mysteries appropriate for various age groups. Our standard mysteries are designed for adults and teens (13+), but we also have family-friendly options suitable for players as young as 10. Each mystery listing clearly indicates the recommended minimum age.",
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
