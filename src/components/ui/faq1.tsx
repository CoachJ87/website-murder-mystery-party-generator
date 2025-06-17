
import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from 'react-i18next';

interface FaqItem {
  question: string;
  answer: string;
}

interface Faq1Props {
  heading?: string;
  items?: FaqItem[];
}

const Faq1 = ({
  heading,
  items,
}: Faq1Props) => {
  const { t } = useTranslation();

  // Use translation keys for FAQ items
  const translatedItems = [
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
    },
    {
      question: t('supportPage.faqs.questions.replayable.question'),
      answer: t('supportPage.faqs.questions.replayable.answer')
    },
    {
      question: t('supportPage.faqs.questions.playerCount.question'),
      answer: t('supportPage.faqs.questions.playerCount.answer')
    },
    {
      question: t('supportPage.faqs.questions.whatIncluded.question'),
      answer: t('supportPage.faqs.questions.whatIncluded.answer')
    },
    {
      question: t('supportPage.faqs.questions.modifyMystery.question'),
      answer: t('supportPage.faqs.questions.modifyMystery.answer')
    },
    {
      question: t('supportPage.faqs.questions.gameDuration.question'),
      answer: t('supportPage.faqs.questions.gameDuration.answer')
    },
    {
      question: t('supportPage.faqs.questions.themedMysteries.question'),
      answer: t('supportPage.faqs.questions.themedMysteries.answer')
    }
  ];

  const finalItems = items || translatedItems;
  const finalHeading = heading || t('supportPage.faqs.title');

  return (
    <section className="py-32">
      <div className="container mx-auto">
        <h1 className="mb-4 text-3xl font-semibold md:mb-11 md:text-5xl">
          {finalHeading}
        </h1>
        
        <div>
          {finalItems.map((item, index) => (
            <React.Fragment key={index}>
              <Accordion type="single" collapsible>
                <AccordionItem value={`item-${index}`} className="border-none">
                  <AccordionTrigger className="hover:text-foreground/60 hover:no-underline">
                    {item.question}
                  </AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              </Accordion>
              {index < finalItems.length - 1 && <Separator className="my-1" />}
            </React.Fragment>
          ))}
        </div>
      </div>
    </section>
  );
};

export { Faq1 };
