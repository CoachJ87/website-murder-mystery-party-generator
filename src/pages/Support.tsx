
import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger 
} from "@/components/ui/accordion";
import { 
  HelpCircle, 
  Info, 
  Mail, 
  Calendar, 
  Award, 
  CreditCard, 
  Users,
  Search
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Support = () => {
  const [searchTerm, setSearchTerm] = useState("");
  
  const faqCategories = [
    {
      title: "About Murder Mystery Generator",
      icon: <Info className="h-5 w-5 mr-2" />,
      questions: [
        {
          question: "What is the Murder Mystery Creator and how does it work?",
          answer: "Murder Mystery Creator is an AI-powered app that designs custom murder mystery party games. You answer a few questions about your preferences (theme, player count), and our AI generates a complete package with character guides, story elements, and game materials—all tailored to your specific event needs."
        },
        {
          question: "How does the creation and purchase process work?",
          answer: "The process is simple: First, create your murder mystery story by answering a few questions about theme and player count. You'll get a preview of your story and characters for free. When you're satisfied with your creation, you can purchase the complete package for $4.99. This one-time purchase gives you instant access to downloadable PDFs including a comprehensive host guide and detailed character profiles for every player."
        },
        {
          question: "Can I save my work and come back to it later?",
          answer: "Yes! All your murder mystery projects are saved to your account and you can return to edit them at any time."
        }
      ]
    },
    {
      title: "Game Mechanics",
      icon: <Award className="h-5 w-5 mr-2" />,
      questions: [
        {
          question: "Are these murder mysteries replayable?",
          answer: "Yes! Our murder mysteries are designed with replayability in mind. The random murderer selection mechanism means that even with the same character set and scenario, you'll get a different experience each time you play. This allows you to host the same mystery multiple times with different groups or even with the same group for a fresh experience."
        },
        {
          question: "How many players do I need for a murder mystery game?",
          answer: "Our murder mysteries can accommodate any group size you choose. The system is flexible enough to support gatherings of all sizes, from intimate groups to large parties of up to 40 players. Remember to consider who will play the detective/inspector role during the party (this counts as one character)."
        },
        {
          question: "How does the murderer selection process work?",
          answer: "Our mysteries use a random selection process that happens during gameplay. After character introductions in Round 1, the host randomly selects one player to be the murderer (usually using letter slips assigned at the start). This means any character could be the murderer, keeping the game unpredictable and exciting every time you play."
        },
        {
          question: "What if I need to add or remove players at the last minute?",
          answer: "Our mystery sets are designed to be flexible. If someone doesn't show up, the game can still be played without that character. Adding players is possible only if there's already a character profile for them to play. The one exception involves the accomplice mechanism - since the murderer and accomplice often use each other as alibis, the host may need to make adjustments if either of these players is missing."
        }
      ]
    },
    {
      title: "Hosting & Planning",
      icon: <Calendar className="h-5 w-5 mr-2" />,
      questions: [
        {
          question: "Do I need to prepare anything else for my murder mystery party?",
          answer: "Our packages include everything needed for the game itself. You'll receive a host guide with setup instructions, individual character materials for each player, and all necessary clues and game elements. You may want to plan complementary aspects like themed food, decorations, or costume suggestions, but these are optional enhancements."
        },
        {
          question: "How long does a typical murder mystery game last?",
          answer: "The timing is entirely up to you and how fast you want to move through each round. A typical game with 8-14 players, allowing ample time for each round, will last about 1.5-2 hours. The host guide provides suggestions for pacing that you can adjust to fit your schedule."
        },
        {
          question: "Is there an age recommendation for your murder mysteries?",
          answer: "Our standard mysteries are designed for adults and teens (13+). However, the appropriate age is ultimately up to the host and depends on the theme and details you choose to include. You can prompt our AI to create more family-friendly content if desired for younger players."
        }
      ]
    },
    {
      title: "Account & Billing",
      icon: <CreditCard className="h-5 w-5 mr-2" />,
      questions: [
        {
          question: "What's included in the free version?",
          answer: "Free users can generate unlimited mystery previews, which include the basic story premise and character concepts. This allows you to explore different themes and ideas before committing to a purchase."
        },
        {
          question: "What do I get when I purchase a mystery?",
          answer: "For $4.99 per mystery, you receive a complete downloadable package including: a comprehensive host guide with step-by-step instructions, detailed character guides for each player, all necessary clues and evidence materials, and a PDF that's ready to print and play."
        },
        {
          question: "Can I get a refund if I'm not satisfied?",
          answer: "We stand behind our mystery generator! If you're not completely satisfied with your purchase, contact us within 7 days of purchase and we'll issue a full refund. No questions asked."
        }
      ]
    }
  ];
  
  const hostingTips = [
    "Send character assignments to players at least a week in advance",
    "Suggest costume ideas based on the theme",
    "Read through the entire host guide before your event",
    "Prepare name tags for each character",
    "Create a themed atmosphere with simple decorations",
    "Consider themed food and drinks to enhance immersion",
    "Start with a brief explanation of how the game works",
    "Keep track of time to ensure all rounds get sufficient attention",
    "Consider giving out small prizes for Best Detective, Best Performance, etc."
  ];

  // Filter FAQs based on search term
  const filteredFaqs = searchTerm 
    ? faqCategories.map(category => ({
        ...category,
        questions: category.questions.filter(q => 
          q.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
          q.answer.toLowerCase().includes(searchTerm.toLowerCase())
        )
      })).filter(category => category.questions.length > 0)
    : faqCategories;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold tracking-tight mb-4">Support Center</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to frequently asked questions and get help with your murder mystery experience
            </p>
            
            <div className="relative max-w-md mx-auto mt-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search for answers..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="space-y-12">
            <section id="faq">
              <div className="flex items-center mb-6">
                <HelpCircle className="h-6 w-6 mr-2" />
                <h2 className="text-2xl font-semibold">Frequently Asked Questions</h2>
              </div>
              
              {filteredFaqs.length > 0 ? (
                filteredFaqs.map((category, index) => (
                  category.questions.length > 0 && (
                    <div key={index} className="mb-8">
                      <div className="flex items-center mb-4">
                        {category.icon}
                        <h3 className="text-xl font-medium">{category.title}</h3>
                      </div>
                      
                      <Accordion type="single" collapsible className="w-full">
                        {category.questions.map((faq, faqIndex) => (
                          <AccordionItem key={faqIndex} value={`${index}-${faqIndex}`}>
                            <AccordionTrigger className="text-left">
                              {faq.question}
                            </AccordionTrigger>
                            <AccordionContent>
                              <p className="text-muted-foreground">{faq.answer}</p>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  )
                ))
              ) : (
                <p className="text-center py-4 text-muted-foreground">
                  No results found for "{searchTerm}". Try a different search term.
                </p>
              )}
            </section>
            
            <Separator />
            
            <section id="hosting-tips">
              <div className="flex items-center mb-6">
                <Users className="h-6 w-6 mr-2" />
                <h2 className="text-2xl font-semibold">Hosting Tips</h2>
              </div>
              
              <div className="bg-muted/30 p-6 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Quick Tips for a Successful Murder Mystery Party</h3>
                
                <ul className="space-y-2">
                  {hostingTips.map((tip, index) => (
                    <li key={index} className="flex items-start">
                      <span className="bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                        {index + 1}
                      </span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
            
            <Separator />
            
            <section id="contact" className="mb-12">
              <div className="flex items-center mb-6">
                <Mail className="h-6 w-6 mr-2" />
                <h2 className="text-2xl font-semibold">Contact Us</h2>
              </div>
              
              <div className="bg-card border rounded-lg p-6 text-center">
                <p className="mb-4 text-lg">Need more help? Email us at:</p>
                <a 
                  href="mailto:info@murder-mystery.party" 
                  className="text-xl font-semibold text-primary hover:underline"
                >
                  info@murder-mystery.party
                </a>
                <p className="mt-4 text-muted-foreground">
                  We typically respond within 24 hours, Monday through Friday.
                </p>
                
                <div className="mt-6">
                  <Button asChild>
                    <Link to="/contact">Contact Form</Link>
                  </Button>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Support;
