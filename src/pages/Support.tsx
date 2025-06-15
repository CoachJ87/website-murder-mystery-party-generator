
import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, PenSquare } from "lucide-react";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const formSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }),
  email: z.string().email({ message: "Please enter a valid email address." }),
  subject: z.string().min(5, { message: "Subject must be at least 5 characters." }),
  message: z.string().min(10, { message: "Message must be at least 10 characters." }),
});

type FormValues = z.infer<typeof formSchema>;

const Support = () => {
  const [activeTab, setActiveTab] = useState("faqs");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
    },
  });

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    
    try {
      // In a real implementation, this would send an email or create a database entry
      console.log("Form submitted:", data);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success("Thank you for contacting us! We'll get back to you within 24 hours.");
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("Failed to send message. Please try again later.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const faqCategories = [
    {
      title: "About Mystery Maker",
      items: [
        {
          question: "What is Mystery Maker and how does it work?",
          answer: "Mystery Maker is an AI-powered platform that creates custom murder mystery parties exactly how you want them. Tell us your unique vision - any theme, characters, or setting - and our AI generates everything you need: character profiles, clues, and host materials tailored specifically for your party."
        },
        {
          question: "How does the creation and purchase process work?",
          answer: "Simple! First, describe your ideal murder mystery and we'll create a custom preview for free. When you're happy with your mystery, purchase the complete package for $11.99. You'll instantly get everything needed to host: detailed character profiles, host guide, and all game materials."
        },
        {
          question: "Can I save my work and come back to it later?",
          answer: "Yes! All your custom mysteries are saved to your account so you can return and edit them anytime."
        }
      ]
    },
    {
      title: "Game Mechanics",
      items: [
        {
          question: "Are these murder mysteries replayable?",
          answer: "Absolutely! Our mysteries include variable elements so each playthrough feels fresh, even with the same group. You can host your custom mystery as many times as you want."
        },
        {
          question: "How many players do I need?",
          answer: "Our system creates mysteries for any group size you specify - from intimate gatherings of 4-6 players to larger parties of 15+ players. Just tell us your player count and we'll design accordingly."
        },
        {
          question: "Can I modify my mystery after creating it?",
          answer: "Of course! Use our editor to refine and adjust your mystery until it's exactly right for your group. Change characters, themes, or complexity anytime."
        },
        {
          question: "What if I need to add or remove players at the last minute?",
          answer: "No problem! Our flexible system allows you to adjust your player count even after creating your mystery. The AI will adapt the story and characters to accommodate these changes."
        }
      ]
    },
    {
      title: "Hosting & Planning",
      items: [
        {
          question: "What's included in my custom mystery package?",
          answer: "Everything you need: a comprehensive host guide with step-by-step instructions, detailed character profiles for each player, clues, evidence, and all game materials. No additional preparation required."
        },
        {
          question: "How long does a typical game last?",
          answer: "Most mysteries run 2-3 hours, but you control the pacing. Our host guide includes timing suggestions that you can adjust to fit your schedule."
        },
        {
          question: "Do you offer themed mysteries for special occasions?",
          answer: "We create any theme you can imagine! From classic 1920s speakeasies to space stations to fairy tale kingdoms - tell us your vision and we'll make it happen."
        },
        {
          question: "Is there an age recommendation for your mysteries?",
          answer: "Our standard mysteries work great for adults and teens (13+). You can also request family-friendly themes when creating your mystery for younger players."
        }
      ]
    },
    {
      title: "Account & Billing",
      items: [
        {
          question: "What's included in the free preview?",
          answer: "You can create unlimited mystery previews for free, including the basic story premise and character concepts. This lets you explore different ideas before purchasing."
        },
        {
          question: "What do I get when I purchase a mystery?",
          answer: "For $11.99, you receive everything needed to host: comprehensive host guide, detailed character profiles for each player, clues, evidence, and all game materials ready to use."
        },
        {
          question: "Can I get a refund if I'm not satisfied?",
          answer: "Absolutely! If you're not completely satisfied with your purchase, contact us within 7 days and we'll issue a full refund, no questions asked."
        }
      ]
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-4">Support Center</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions, contact our support team, and get everything you need to create amazing mystery parties.
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className="grid w-full grid-cols-2 bg-[#F6E8C6]">
              <TabsTrigger 
                value="faqs" 
                className="flex items-center gap-2 data-[state=active]:bg-[#8B1538] data-[state=active]:text-white"
              >
                <HelpCircle className="h-4 w-4" />
                <span>FAQs</span>
              </TabsTrigger>
              <TabsTrigger 
                value="contact" 
                className="flex items-center gap-2 data-[state=active]:bg-[#8B1538] data-[state=active]:text-white"
              >
                <PenSquare className="h-4 w-4" />
                <span>Contact Us</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="faqs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Frequently Asked Questions</CardTitle>
                  <CardDescription>Find answers to common questions about Mystery Maker</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {faqCategories.map((category, categoryIndex) => (
                      <div key={categoryIndex} className="mb-6">
                        <h3 className="text-lg font-semibold mb-2 text-[#8B1538]">{category.title}</h3>
                        {category.items.map((faq, faqIndex) => (
                          <AccordionItem key={faqIndex} value={`${categoryIndex}-${faqIndex}`}>
                            <AccordionTrigger className="hover:text-[#8B1538]">{faq.question}</AccordionTrigger>
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
            
            <TabsContent value="contact" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Contact Us</CardTitle>
                  <CardDescription>Need more help? We're here for you</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    Our support team is ready to help with any questions about creating your perfect mystery party with Mystery Maker.
                  </p>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Your name" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email Address *</FormLabel>
                              <FormControl>
                                <Input placeholder="your.email@example.com" type="email" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="subject"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Subject *</FormLabel>
                            <FormControl>
                              <Input placeholder="What is your message about?" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Message *</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder="How can we help you?" 
                                className="min-h-[120px]" 
                                {...field} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          size="lg" 
                          disabled={isSubmitting}
                          className="bg-[#8B1538] hover:bg-[#6B0F28] text-white"
                        >
                          {isSubmitting ? "Sending..." : "Send Message"}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
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
              <Button asChild className="bg-[#8B1538] hover:bg-[#6B0F28] text-white">
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
