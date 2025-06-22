
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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTranslation } from 'react-i18next';

const Support = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("faqs");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isMobile = useIsMobile();
  
  const formSchema = z.object({
    name: z.string().min(2, { message: t('common.validation.required') }),
    email: z.string().email({ message: t('common.validation.invalidEmail') }),
    subject: z.string().min(5, { message: t('common.validation.tooShort') }),
    message: z.string().min(10, { message: t('common.validation.tooShort') }),
  });

  type FormValues = z.infer<typeof formSchema>;
  
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
      
      toast.success(t('supportPage.contact.form.success'));
      form.reset();
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error(t('supportPage.contact.form.error'));
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const faqCategories = [
    {
      title: t('supportPage.faqs.categories.aboutMysteryMaker'),
      items: [
        {
          question: t('supportPage.faqs.questions.whatIsMysteryMaker.question'),
          answer: t('supportPage.faqs.questions.whatIsMysteryMaker.answer')
        },
        {
          question: t('supportPage.faqs.questions.creationProcess.question'),
          answer: t('supportPage.faqs.questions.creationProcess.answer')
        },
        {
          question: t('supportPage.faqs.questions.saveWork.question'),
          answer: t('supportPage.faqs.questions.saveWork.answer')
        }
      ]
    },
    {
      title: t('supportPage.faqs.categories.gameMechanics'),
      items: [
        {
          question: t('supportPage.faqs.questions.replayable.question'),
          answer: t('supportPage.faqs.questions.replayable.answer')
        },
        {
          question: t('supportPage.faqs.questions.playerCount.question'),
          answer: t('supportPage.faqs.questions.playerCount.answer')
        },
        {
          question: t('supportPage.faqs.questions.modifyMystery.question'),
          answer: t('supportPage.faqs.questions.modifyMystery.answer')
        },
        {
          question: t('supportPage.faqs.questions.lastMinuteChanges.question'),
          answer: t('supportPage.faqs.questions.lastMinuteChanges.answer')
        }
      ]
    },
    {
      title: t('supportPage.faqs.categories.hostingPlanning'),
      items: [
        {
          question: t('supportPage.faqs.questions.whatIncluded.question'),
          answer: t('supportPage.faqs.questions.whatIncluded.answer')
        },
        {
          question: t('supportPage.faqs.questions.gameDuration.question'),
          answer: t('supportPage.faqs.questions.gameDuration.answer')
        },
        {
          question: t('supportPage.faqs.questions.themedMysteries.question'),
          answer: t('supportPage.faqs.questions.themedMysteries.answer')
        },
        {
          question: t('supportPage.faqs.questions.ageRecommendation.question'),
          answer: t('supportPage.faqs.questions.ageRecommendation.answer')
        }
      ]
    },
    {
      title: t('supportPage.faqs.categories.accountBilling'),
      items: [
        {
          question: t('supportPage.faqs.questions.freePreview.question'),
          answer: t('supportPage.faqs.questions.freePreview.answer')
        },
        {
          question: t('supportPage.faqs.questions.purchaseIncludes.question'),
          answer: t('supportPage.faqs.questions.purchaseIncludes.answer')
        },
        {
          question: t('supportPage.faqs.questions.refund.question'),
          answer: t('supportPage.faqs.questions.refund.answer')
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
            <h1 className="text-3xl font-bold mb-4">{t('supportPage.title')}</h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t('supportPage.subtitle')}
            </p>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-8">
            <TabsList className={cn(
              "bg-success p-1 overflow-hidden grid grid-cols-2",
              isMobile && "h-auto"
            )}>
              <TabsTrigger 
                value="faqs" 
                className={cn(
                  "text-white data-[state=active]:bg-success/80 data-[state=active]:text-white hover:bg-success/90",
                  isMobile && "text-xs px-2 py-2 h-auto"
                )}
              >
                <HelpCircle className="h-4 w-4" />
                <span>{t('supportPage.tabs.faqs')}</span>
              </TabsTrigger>
              <TabsTrigger 
                value="contact" 
                className={cn(
                  "text-white data-[state=active]:bg-success/80 data-[state=active]:text-white hover:bg-success/90",
                  isMobile && "text-xs px-2 py-2 h-auto"
                )}
              >
                <PenSquare className="h-4 w-4" />
                <span>{t('supportPage.tabs.contact')}</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="faqs" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t('supportPage.faqs.title')}</CardTitle>
                  <CardDescription>{t('supportPage.faqs.description')}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="w-full">
                    {faqCategories.map((category, categoryIndex) => (
                      <div key={categoryIndex} className="mb-6">
                        <h3 className="text-lg font-semibold mb-2 text-[bg-primary]">{category.title}</h3>
                        {category.items.map((faq, faqIndex) => (
                          <AccordionItem key={faqIndex} value={`${categoryIndex}-${faqIndex}`}>
                            <AccordionTrigger className="hover:text-[bg-primary]">{faq.question}</AccordionTrigger>
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
                  <CardTitle>{t('supportPage.contact.title')}</CardTitle>
                  <CardDescription>{t('supportPage.contact.description')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p>
                    {t('supportPage.contact.intro')}
                  </p>
                  
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t('supportPage.contact.form.name')}</FormLabel>
                              <FormControl>
                                <Input placeholder={t('supportPage.contact.form.namePlaceholder')} {...field} />
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
                              <FormLabel>{t('supportPage.contact.form.email')}</FormLabel>
                              <FormControl>
                                <Input placeholder={t('supportPage.contact.form.emailPlaceholder')} type="email" {...field} />
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
                            <FormLabel>{t('supportPage.contact.form.subject')}</FormLabel>
                            <FormControl>
                              <Input placeholder={t('supportPage.contact.form.subjectPlaceholder')} {...field} />
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
                            <FormLabel>{t('supportPage.contact.form.message')}</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder={t('supportPage.contact.form.messagePlaceholder')} 
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
                          className="bg-primary hover:bg-primary/90 text-white"
                        >
                          {isSubmitting ? t('supportPage.contact.form.sending') : t('supportPage.contact.form.sendButton')}
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Support;
