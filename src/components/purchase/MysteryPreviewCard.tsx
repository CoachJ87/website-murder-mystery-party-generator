
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Users } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

interface MysteryPreviewCardProps {
  mystery: {
    title: string;
    theme?: string;
    guests?: number;
  };
  parsedDetails?: {
    premise?: string;
    characters?: Array<{ name: string }>;
  };
}

const MysteryPreviewCard = ({ mystery, parsedDetails }: MysteryPreviewCardProps) => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  
  // Extract first paragraph from premise as teaser
  const teaser = parsedDetails?.premise?.split('\n\n')[0] || '';

  return (
    <Card className={cn(
      "h-full flex flex-col",
      isMobile && "shadow-sm"
    )}>
      <CardHeader className={cn(isMobile && "p-4 pb-3")}>
        <CardTitle className={cn(isMobile ? "text-lg" : "text-xl")}>
          {mystery.title.replace(/\*\*/g, '')}
        </CardTitle>
        <CardDescription className={cn(isMobile && "text-sm")}>
          {t('purchase.preview.title')}
        </CardDescription>
      </CardHeader>
      
      <CardContent className={cn(
        "flex-grow space-y-6",
        isMobile && "p-4 pt-0 space-y-4"
      )}>
        {/* Core Details - Single Column */}
        <div className="space-y-1">
          <div className={cn(
            "flex items-center text-sm",
            isMobile && "text-xs"
          )}>
            <Users className={cn(
              "mr-2 text-muted-foreground",
              isMobile ? "h-3 w-3" : "h-4 w-4"
            )} />
            <span>{t('purchase.preview.playersLabel')}</span>
          </div>
          <p className={cn(
            "font-medium",
            isMobile && "text-sm"
          )}>
            {mystery.guests ? t('purchase.preview.playersCount', { count: mystery.guests }) : t('purchase.preview.unknownPlayers')}
          </p>
        </div>
        
        {/* Story Teaser */}
        {teaser && (
          <div className="prose prose-sm max-w-none">
            <h3 className={cn(
              "font-medium",
              isMobile ? "text-sm" : "text-base"
            )}>
              {t('purchase.preview.storyTitle')}
            </h3>
            <p className={cn(
              "text-muted-foreground",
              isMobile ? "text-xs leading-relaxed" : "text-sm"
            )}>
              {teaser}
            </p>
            <p className={cn(
              "italic text-muted-foreground mt-2",
              isMobile ? "text-xs" : "text-xs"
            )}>
              {t('purchase.preview.unlockMessage')}
            </p>
          </div>
        )}
        
        {/* Package Contents Preview */}
        <div className={cn(
          "bg-muted rounded-lg text-muted-foreground",
          isMobile ? "p-3 text-xs" : "p-4 text-sm"
        )}>
          <p className={cn(
            "font-medium mb-2",
            isMobile && "text-xs"
          )}>
            {t('purchase.preview.whatsIncluded')}
          </p>
          <ul className={cn(
            "list-disc space-y-1",
            isMobile ? "pl-3" : "pl-4"
          )}>
            {(() => {
              const items = t('purchase.preview.packageIncludes', { returnObjects: true });
              console.log('Translation items:', items, 'Type:', typeof items, 'Is Array:', Array.isArray(items));
              
              if (Array.isArray(items)) {
                return items.map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ));
              }
              
              // More defensive fallback
              console.warn('Translation failed, using fallback');
              return [
                "Detailed host guide with complete setup instructions",
                "Character guides for each player", 
                "Evidence cards and printable materials",
                "Full gameplay script and timeline"
              ].map((item, index) => (
                <li key={index}>{item}</li>
              ));
            })()}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};

export default MysteryPreviewCard;
