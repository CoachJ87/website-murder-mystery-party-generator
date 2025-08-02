import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Loader2, Wand2, Eye, Mail } from "lucide-react";
import { MysteryCharacter } from "@/interfaces/mystery";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import MysteryGuestManager from "./MysteryGuestManager";
import "../styles/mystery-package.css";
import { useTranslation } from "react-i18next";

interface MysteryPackageData {
  title?: string;
  gameOverview?: string;
  hostGuide?: string;
  materials?: string;
  preparation?: string;
  timeline?: string;
  hostingTips?: string;
  evidenceCards?: string;
  relationshipMatrix?: string;
  detectiveScript?: string;
}

interface MysteryPackageTabViewProps {
  packageContent: string;
  mysteryTitle: string;
  generationStatus?: any;
  isGenerating: boolean;
  conversationId?: string;
  onGenerateClick?: () => void;
  packageData?: MysteryPackageData;
  characters?: MysteryCharacter[];
}

const MysteryPackageTabView = React.memo(({
  packageContent,
  mysteryTitle,
  generationStatus,
  isGenerating,
  conversationId,
  onGenerateClick,
  packageData,
  characters = []
}: MysteryPackageTabViewProps) => {
  const [activeTab, setActiveTab] = useState("host-guide");
  const [statusMessage, setStatusMessage] = useState("Starting generation...");
  const [showGuestManager, setShowGuestManager] = useState(false);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Update status message based on generationStatus
  useEffect(() => {
    if (generationStatus) {
      setStatusMessage(generationStatus.currentStep || "Processing...");
    }
  }, [generationStatus]);



  // Helper function to safely get relationships as an array
  const getRelationshipsArray = useCallback((relationships: any): Array<{character: string, description: string}> => {
    if (!relationships) return [];
    
    if (Array.isArray(relationships)) {
      return relationships.map(rel => {
        if (typeof rel === 'object' && rel !== null) {
          return {
            character: rel.character || rel.name || '',
            description: rel.description || rel.relation || ''
          };
        }
        return { character: '', description: String(rel) };
      }).filter(rel => rel.character || rel.description);
    }
    
    return [];
  }, []);

  // Helper function to safely get secrets as an array
  const getSecretsArray = useCallback((secrets: any): string[] => {
    if (!secrets) return [];
    
    if (Array.isArray(secrets)) {
      return secrets.map(secret => String(secret));
    }
    
    if (typeof secrets === 'string') {
      return [secrets];
    }
    
    return [];
  }, []);

  // Function to build complete character guide content
  const buildCharacterGuideContent = useCallback((character: MysteryCharacter): string => {
    let content = `# ${character.character_name} - Character Guide\n\n`;
    
    // All content is pre-formatted in database - just concatenate in logical order
    if (character.description) {
      content += `${character.description}\n\n`;
    }
    
    if (character.background) {
      content += `${character.background}\n\n`;
    }
    
    if (character.relationships) {
      content += `${character.relationships}\n\n`;
    }
    
    if (character.rumors) {
      content += `${character.rumors}\n\n`;
    }
    
    if (character.secret) {
      content += `${character.secret}\n\n`;
    }
    
    if (character.introduction) {
      content += `${character.introduction}\n\n`;
    }
    
    if (character.round2_questions) {
      content += `${character.round2_questions}\n\n`;
    }
    
    if (character.round2_innocent) {
      content += `${character.round2_innocent}\n\n`;
    }
    
    if (character.round2_guilty) {
      content += `${character.round2_guilty}\n\n`;
    }
    
    if (character.round3_questions) {
      content += `${character.round3_questions}\n\n`;
    }
    
    if (character.round3_innocent) {
      content += `${character.round3_innocent}\n\n`;
    }
    
    if (character.round3_guilty) {
      content += `${character.round3_guilty}\n\n`;
    }
    
    if (character.round4_questions) {
      content += `${character.round4_questions}\n\n`;
    }
    
    if (character.round4_innocent) {
      content += `${character.round4_innocent}\n\n`;
    }
    
    if (character.round4_guilty) {
      content += `${character.round4_guilty}\n\n`;
    }
    
    if (character.final_innocent) {
      content += `${character.final_innocent}\n\n`;
    }
    
    if (character.final_guilty) {
      content += `${character.final_guilty}\n\n`;
    }
    
    // Convert any escaped newlines to actual newlines for proper markdown rendering
    const normalizedContent = content.replace(/\\n/g, '\n');
    return normalizedContent;
  }, [getRelationshipsArray, getSecretsArray]);

  // Function to build complete host guide content
  const buildCompleteHostGuide = useCallback((): string => {
    if (!packageData) return "";
    
    const title = packageData.title || mysteryTitle || "Mystery";
    let content = `# ${title} - Host Guide\n\n`;
    
    // Use the content EXACTLY as generated by Make.com - no rebuilding headers
    if (packageData.gameOverview) {
      content += `${packageData.gameOverview}\n\n`;
    }
    
    if (packageData.materials) {
      content += `${packageData.materials}\n\n`;
    }
    
    if (packageData.preparation) {
      content += `${packageData.preparation}\n\n`;
    }
    
    if (packageData.timeline) {
      content += `${packageData.timeline}\n\n`;
    }
    
    if (packageData.hostGuide) {
      content += `${packageData.hostGuide}\n\n`;
    }
    
    if (packageData.hostingTips) {
      content += `${packageData.hostingTips}\n\n`;
    }
    
    return content;
  }, [packageData, mysteryTitle]);

  // Memoized content extraction functions
  const extractHostGuide = useCallback(() => {
    if (!packageContent) return "";
    
    const hostGuidePattern = /# .+ - Host Guide\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(hostGuidePattern);
    return match ? match[1].trim() : "";
  }, [packageContent]);

  const extractInspectorScript = useCallback(() => {
    if (!packageContent) return "";
    
    const inspectorPattern = /# (?:INSPECTOR|DETECTIVE) SCRIPT\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(inspectorPattern);
    return match ? match[1].trim() : "";
  }, [packageContent]);



  const extractCharacters = useCallback(() => {
    if (!packageContent) return [];
    
    const charactersList: MysteryCharacter[] = [];
    const characterPattern = /# ([^-\n]+) - CHARACTER GUIDE\n([\s\S]*?)(?=# \w+ - CHARACTER GUIDE|# |$)/g;
    
    let match;
    while ((match = characterPattern.exec(packageContent)) !== null) {
      const characterName = match[1].trim();
      const characterContent = match[2].trim();
      
      charactersList.push({
        id: crypto.randomUUID(),
        package_id: conversationId || "",
        character_name: characterName,
        description: characterContent.substring(0, characterContent.indexOf('\n\n')) || '',
        background: '',
        relationships: [],
        secrets: []
      });
    }
    
    return charactersList;
  }, [packageContent, conversationId]);

  const extractClues = useCallback(() => {
    if (!packageContent) return [];
    
    const clues: any[] = [];
    const cluePattern = /# EVIDENCE: (.*?)\n([\s\S]*?)(?=# EVIDENCE:|# |$)/gi;
    
    let match;
    while ((match = cluePattern.exec(packageContent)) !== null) {
      const title = match[1].trim();
      const clueContent = match[2].trim();
      
      clues.push({
        title,
        content: clueContent
      });
    }
    
    return clues;
  }, [packageContent]);

  // Memoized content getters
  const hostGuide = useMemo(() => {
    if (packageData) {
      return buildCompleteHostGuide();
    }
    
    if (packageData?.hostGuide) {
      return packageData.hostGuide;
    }
    
    return extractHostGuide();
  }, [packageData, buildCompleteHostGuide, extractHostGuide]);

  const detectiveScript = useMemo(() => {
    return packageData?.detectiveScript || extractInspectorScript();
  }, [packageData?.detectiveScript, extractInspectorScript]);



  const charactersList = useMemo(() => {
    if (characters && characters.length > 0) {
      return characters;
    }
    
    return extractCharacters();
  }, [characters, extractCharacters]);

  const evidenceCards = useMemo(() => {
    if (packageData?.evidenceCards) {
      return packageData.evidenceCards;
    }
    
    const clues = extractClues();
    if (clues.length > 0) {
      return clues.map(clue => `## ${clue.title}\n\n${clue.content}`).join('\n\n---\n\n');
    }
    
    return "";
  }, [packageData?.evidenceCards, extractClues]);

  // Check if mystery is complete enough to share
  const canShareMystery = useMemo(() => {
    return (packageData && (hostGuide || detectiveScript || evidenceCards)) || 
           (characters && characters.length > 0);
  }, [packageData, hostGuide, detectiveScript, evidenceCards, characters]);

  // Simplified loading component for individual tabs with mobile optimization
  const LoadingTabContent = useCallback(({ message }: { message: string }) => (
    <div className={cn(
      "loading-section",
      isMobile && "py-8"
    )}>
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className={cn(
          "animate-spin text-primary",
          isMobile ? "h-6 w-6" : "h-8 w-8"
        )} />
        <h3 className={cn(
          "font-semibold",
          isMobile ? "text-base" : "text-lg"
        )}>
          {t('mysteryPackage.loading.generating')}
        </h3>
        <p 
          className={cn(
            "text-muted-foreground text-center max-w-md",
            isMobile && "text-sm px-4"
          )}
          dangerouslySetInnerHTML={{ __html: message }}
        />
      </div>
    </div>
  ), [isMobile, t]);

  return (
    <div className="w-full">
      <div className={cn(
        "mb-6 flex items-center justify-between",
        isMobile && "mb-4 px-2 flex-col space-y-3"
      )}>
        <h1 className={cn(
          "font-bold",
          isMobile ? "text-xl text-center" : "text-3xl"
        )}>
          {mysteryTitle}
        </h1>

        {/* Share Mystery with Guests Button */}
        {canShareMystery && conversationId && (
          <Button
            onClick={() => setShowGuestManager(true)}
            className={cn(
              "gap-2 bg-primary hover:bg-primary/90 text-primary-foreground",
              isMobile && "w-full"
            )}
          >
            <Mail className="h-4 w-4" />
            {t('mysteryPackage.shareWithGuests')}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={cn(
          "w-full mb-4 bg-primary p-1 overflow-hidden border-0",
          isMobile ? "grid grid-cols-2 gap-1 h-auto" : "grid grid-cols-2 md:grid-cols-4"
        )}>
          <TabsTrigger 
            value="host-guide" 
            className={cn(
              "whitespace-nowrap bg-primary text-primary-foreground data-[state=active]:bg-primary-hover data-[state=active]:text-primary-foreground hover:bg-primary/90",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
          >
            {t(isMobile ? 'mysteryPackage.mobileTabs.host' : 'mysteryPackage.tabs.hostGuide')}
          </TabsTrigger>
          <TabsTrigger 
            value="characters" 
            className={cn(
              "whitespace-nowrap bg-primary text-primary-foreground data-[state=active]:bg-primary-hover data-[state=active]:text-primary-foreground hover:bg-primary/90",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
          >
            {t(isMobile ? 'mysteryPackage.mobileTabs.characters' : 'mysteryPackage.tabs.characters', { count: charactersList?.length || 0 })}
          </TabsTrigger>
          <TabsTrigger 
            value="clues" 
            className={cn(
              "whitespace-nowrap bg-primary text-primary-foreground data-[state=active]:bg-primary-hover data-[state=active]:text-primary-foreground hover:bg-primary/90",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
          >
            {t('mysteryPackage.tabs.clues')}
          </TabsTrigger>
          <TabsTrigger 
            value="inspector" 
            className={cn(
              "whitespace-nowrap bg-primary text-primary-foreground data-[state=active]:bg-primary-hover data-[state=active]:text-primary-foreground hover:bg-primary/90",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
          >
            {t(isMobile ? 'mysteryPackage.mobileTabs.inspector' : 'mysteryPackage.tabs.inspector')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="host-guide" className={cn("overflow-hidden", isMobile && "px-2")}>
          <div className={cn(
            "mystery-content",
            isMobile && "text-sm"
          )}>
            {hostGuide ? (
              <div className={cn("prose prose-slate max-w-none", isMobile && "prose-sm")}>
                <ReactMarkdown>{hostGuide}</ReactMarkdown>
              </div>
            ) : isGenerating ? (
              <LoadingTabContent message={t('mysteryPackage.loading.generatingMessage')} />            
            ) : (
              <div className={cn(
                "text-center py-12 space-y-4",
                isMobile && "py-8 space-y-3 px-4"
              )}>
                <Wand2 className={cn(
                  "mx-auto text-muted-foreground",
                  isMobile ? "h-10 w-10" : "h-12 w-12"
                )} />
                <h3 className={cn(
                  "font-semibold",
                  isMobile ? "text-lg" : "text-xl"
                )}>
                  {t('mysteryPackage.placeholder.title')}
                </h3>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  {t('mysteryPackage.placeholder.description')}
                </p>
                {onGenerateClick && (
                  <Button 
                    onClick={onGenerateClick} 
                    className={cn(
                      "mt-4",
                      isMobile && "w-full text-sm h-11"
                    )}
                  >
                    {t('mysteryPackage.placeholder.button')}
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="characters" className={cn("overflow-hidden", isMobile && "px-2")}>
          <div className={cn(
            "mystery-content",
            isMobile && "text-sm"
          )}>
            {Array.isArray(charactersList) && charactersList.length > 0 ? (
              <div className={cn(
                "space-y-4",
                isMobile && "space-y-3"
              )}>
                {charactersList.map((character, index) => {
                  const characterGuideContent = buildCharacterGuideContent(character);
                  
                  return (
                    <Accordion key={character.id || index} type="single" collapsible className="character-accordion">
                      <AccordionItem value={`character-${index}`}>
                        <AccordionTrigger className={cn(
                          "text-left",
                          isMobile && "py-3"
                        )}>
                          <h3 className={cn(
                            "font-semibold text-foreground",
                            isMobile ? "text-base" : "text-lg"
                          )}>
                            {character.character_name}
                          </h3>
                        </AccordionTrigger>
                        <AccordionContent className={cn(
                          "text-foreground",
                          isMobile && "text-sm"
                        )}>
                          <div className={cn("prose prose-slate max-w-none", isMobile && "prose-sm")}>
                            <ReactMarkdown>{characterGuideContent}</ReactMarkdown>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
              </div>
            ) : isGenerating ? (
              <LoadingTabContent message={t('mysteryPackage.loading.characters')} />
            ) : (
              <div className={cn(
                "text-center py-6",
                isMobile && "py-4 px-4"
              )}>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  {t('mysteryPackage.placeholder.characters')}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="clues" className={cn("overflow-hidden", isMobile && "px-2")}>
          <div className={cn(
            "mystery-content",
            isMobile && "text-sm"
          )}>
            {evidenceCards ? (
              <div className={cn("prose prose-slate max-w-none", isMobile && "prose-sm")}>
                <ReactMarkdown>{evidenceCards}</ReactMarkdown>
              </div>
            ) : isGenerating ? (
              <LoadingTabContent message={t('mysteryPackage.loading.clues')} />
            ) : (
              <div className={cn(
                "text-center py-6",
                isMobile && "py-4 px-4"
              )}>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  {t('mysteryPackage.placeholder.clues')}
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inspector" className={cn("overflow-hidden", isMobile && "px-2")}>
          <div className={cn(
            "mystery-content",
            isMobile && "text-sm"
          )}>
            {detectiveScript ? (
              <div className={cn("prose prose-slate max-w-none", isMobile && "prose-sm")}>
                <ReactMarkdown>{detectiveScript}</ReactMarkdown>
              </div>
            ) : isGenerating ? (
              <LoadingTabContent message={t('mysteryPackage.loading.inspector')} />
            ) : (
              <div className={cn(
                "text-center py-6",
                isMobile && "py-4 px-4"
              )}>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  {t('mysteryPackage.placeholder.inspector')}
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Mystery Guest Manager Dialog */}
      <MysteryGuestManager
        open={showGuestManager}
        onOpenChange={setShowGuestManager}
        characters={characters}
        mysteryId={conversationId || ""}
        mysteryTitle={mysteryTitle}
      />
    </div>
  );
});

MysteryPackageTabView.displayName = 'MysteryPackageTabView';

export default MysteryPackageTabView;
