
import { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, BookOpen, PenSquare } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Support = () => {
  const [activeTab, setActiveTab] = useState("faqs");
  
  const faqCategories = [
    {
      title: "About Murder Mystery Generator",
      items: [
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
      items: [
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
      items: [
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
      items: [
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Support Center</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions, hosting tips, and more to make your murder mystery party a success.
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="faqs" className="flex items-center gap-2">
                <HelpCircle className="h-4 w-4" />
                <span>FAQs</span>
              </TabsTrigger>
              <TabsTrigger value="hosting-tips" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                <span>Hosting Tips</span>
              </TabsTrigger>
              <TabsTrigger value="contact" className="flex items-center gap-2">
                <PenSquare className="h-4 w-4" />
                <span>Contact Us</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="faqs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>Find answers to common questions about our murder mystery generator</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {faqCategories.map((category, categoryIndex) => (
                      <div key={categoryIndex} className="mb-6">
                        <h3 className="text-lg font-semibold mb-2">{category.title}</h3>
                        {category.items.map((faq, faqIndex) => (
                          <AccordionItem key={faqIndex} value={`${categoryIndex}-${faqIndex}`}>
                            <AccordionTrigger>{faq.question}</AccordionTrigger>
                            <AccordionContent>
                              <p>{faq.answer}</p>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </div>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="hosting-tips" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Tips for a Successful Murder Mystery Party</CardTitle>
                  <CardDescription>Follow these tips to ensure your mystery party runs smoothly</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-4">
                    {hostingTips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="bg-primary/10 text-primary font-medium h-6 w-6 rounded-full flex items-center justify-center shrink-0">
                          {index + 1}
                        </div>
                        <p>{tip}</p>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-muted-foreground">
                    Remember, the most important thing is to have fun! Don't stress too much about getting every detail perfect.
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="contact" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Us</CardTitle>
                  <CardDescription>Need more help? We're here for you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    Our support team is available to help with any questions or issues you might have with your murder mystery experience.
                  </p>
                  <div className="bg-muted p-4 rounded-lg">
                    <p><strong>Email:</strong> info@murder-mystery.party</p>
                    <p className="text-sm text-muted-foreground mt-1">We typically respond within 24 hours, Monday through Friday.</p>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button asChild>
                    <Link to="/contact">Go to Contact Page</Link>
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
          
          <div className="text-center">
            <p className="mb-6 text-muted-foreground">
              Didn't find what you were looking for? Visit our full documentation or contact our support team.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button variant="outline" asChild>
                <Link to="/">Return to Homepage</Link>
              </Button>
              <Button asChild>
                <Link to="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Support;
