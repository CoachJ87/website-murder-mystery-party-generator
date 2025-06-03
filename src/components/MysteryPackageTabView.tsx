import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Loader2, Wand2, CheckCircle2, Eye } from "lucide-react";
import { MysteryCharacter } from "@/interfaces/mystery";
import "../styles/mystery-package.css";

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
  
  // Controlled logging
  const DEBUG_MODE = process.env.NODE_ENV === 'development';
  const lastLogTime = useRef<number>(0);
  
  const debugLog = useCallback((message: string, data?: any) => {
    if (!DEBUG_MODE) return;
    
    const now = Date.now();
    // Only log every 10 seconds max to reduce spam
    if (now - lastLogTime.current > 10000) {
      console.log(`[MysteryPackage] ${message}`, data);
      lastLogTime.current = now;
    }
  }, []);

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

  // Helper function to safely get questioning options as an array
  const getQuestioningOptionsArray = useCallback((options: any): Array<{target: string, question: string}> => {
    if (!options) return [];
    
    if (Array.isArray(options)) {
      return options.map(opt => {
        if (typeof opt === 'object' && opt !== null) {
          return {
            target: opt.target || '',
            question: opt.question || ''
          };
        }
        return { target: '', question: String(opt) };
      }).filter(opt => opt.target || opt.question);
    }
    
    return [];
  }, []);

  // Function to build complete character guide content
  const buildCharacterGuideContent = useCallback((character: MysteryCharacter): string => {
    const relationships = getRelationshipsArray(character.relationships);
    const secrets = getSecretsArray(character.secrets);
    
    let content = `# ${character.character_name} - CHARACTER GUIDE\n\n`;
    
    // Character Description
    if (character.description) {
      content += `## CHARACTER DESCRIPTION\n\n${character.description}\n\n`;
    }
    
    // Your Background
    if (character.background) {
      content += `## YOUR BACKGROUND\n\n${character.background}\n\n`;
    }
    
    // Your Relationships
    if (relationships.length > 0) {
      content += `## YOUR RELATIONSHIPS\n\n`;
      relationships.forEach(rel => {
        if (rel.character && rel.description) {
          content += `- **${rel.character}**: ${rel.description}\n`;
        }
      });
      content += '\n';
    }
    
    // Your Secret
    const secret = character.secret || (secrets.length > 0 ? secrets[0] : '');
    if (secret) {
      content += `## YOUR SECRET\n\n${secret}\n\n`;
    }
    
    // Round 1: Introductions & Rumors
    if (character.introduction || character.rumors || character.round1_statement) {
      content += `## ROUND 1: INTRODUCTIONS & RUMORS\n\n`;
      
      if (character.introduction) {
        content += `### SAY HELLO\n\n${character.introduction}\n\n`;
      }
      
      if (character.round1_statement) {
        content += `${character.round1_statement}\n\n`;
      }
      
      if (character.rumors) {
        content += `### RUMORS TO SPREAD\n\n${character.rumors}\n\n`;
      }
    }
    
    // Round 2: Motives
    if (character.round2_statement || character.round2_questions || character.round2_innocent || character.round2_guilty || character.round2_accomplice) {
      content += `## ROUND 2: MOTIVES\n\n`;
      
      if (character.round2_statement) {
        content += `${character.round2_statement}\n\n`;
      }
      
      if (character.round2_questions) {
        content += `### CHOOSE SOMEONE TO QUESTION\n\n${character.round2_questions}\n\n`;
      }
      
      if (character.round2_innocent || character.round2_guilty || character.round2_accomplice) {
        content += `### YOUR RESPONSES WHEN QUESTIONED\n\n`;
        
        if (character.round2_innocent) {
          content += `**IF YOU ARE INNOCENT:**\n\n${character.round2_innocent}\n\n`;
        }
        
        if (character.round2_guilty) {
          content += `**IF YOU ARE GUILTY:**\n\n${character.round2_guilty}\n\n`;
        }
        
        if (character.round2_accomplice) {
          content += `**IF YOU ARE THE ACCOMPLICE:**\n\n${character.round2_accomplice}\n\n`;
        }
      }
    }
    
    // Round 3: Method
    if (character.round3_statement || character.round3_questions || character.round3_innocent || character.round3_guilty || character.round3_accomplice) {
      content += `## ROUND 3: METHOD\n\n`;
      
      if (character.round3_statement) {
        content += `${character.round3_statement}\n\n`;
      }
      
      if (character.round3_questions) {
        content += `### CHOOSE SOMEONE TO QUESTION\n\n${character.round3_questions}\n\n`;
      }
      
      if (character.round3_innocent || character.round3_guilty || character.round3_accomplice) {
        content += `### YOUR RESPONSES WHEN QUESTIONED\n\n`;
        
        if (character.round3_innocent) {
          content += `**IF YOU ARE INNOCENT:**\n\n${character.round3_innocent}\n\n`;
        }
        
        if (character.round3_guilty) {
          content += `**IF YOU ARE GUILTY:**\n\n${character.round3_guilty}\n\n`;
        }
        
        if (character.round3_accomplice) {
          content += `**IF YOU ARE THE ACCOMPLICE:**\n\n${character.round3_accomplice}\n\n`;
        }
      }
    }
    
    // Round 4: Opportunity
    if (character.round4_questions || character.round4_innocent || character.round4_guilty || character.round4_accomplice) {
      content += `## ROUND 4: OPPORTUNITY\n\n`;
      
      if (character.round4_questions) {
        content += `### CHOOSE SOMEONE TO QUESTION\n\n${character.round4_questions}\n\n`;
      }
      
      if (character.round4_innocent || character.round4_guilty || character.round4_accomplice) {
        content += `### YOUR RESPONSES WHEN QUESTIONED\n\n`;
        
        if (character.round4_innocent) {
          content += `**IF YOU ARE INNOCENT:**\n\n${character.round4_innocent}\n\n`;
        }
        
        if (character.round4_guilty) {
          content += `**IF YOU ARE GUILTY:**\n\n${character.round4_guilty}\n\n`;
        }
        
        if (character.round4_accomplice) {
          content += `**IF YOU ARE THE ACCOMPLICE:**\n\n${character.round4_accomplice}\n\n`;
        }
      }
    }
    
    // Final Statement
    if (character.final_innocent || character.final_guilty || character.final_accomplice) {
      content += `## FINAL STATEMENT\n\n`;
      
      if (character.final_innocent) {
        content += `**IF YOU ARE INNOCENT:**\n\n${character.final_innocent}\n\n`;
      }
      
      if (character.final_guilty) {
        content += `**IF YOU ARE GUILTY:**\n\n${character.final_guilty}\n\n`;
      }
      
      if (character.final_accomplice) {
        content += `**IF YOU ARE THE ACCOMPLICE:**\n\n${character.final_accomplice}\n\n`;
      }
    }
    
    return content;
  }, [getRelationshipsArray, getSecretsArray]);

  // Memoized content extraction functions to prevent unnecessary recalculations
  const extractHostGuide = useCallback(() => {
    if (!packageContent) return "";
    
    const hostGuidePattern = /# .+ - HOST GUIDE\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(hostGuidePattern);
    return match ? match[1].trim() : "";
  }, [packageContent]);

  const extractInspectorScript = useCallback(() => {
    if (!packageContent) return "";
    
    const inspectorPattern = /# (?:INSPECTOR|DETECTIVE) SCRIPT\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(inspectorPattern);
    return match ? match[1].trim() : "";
  }, [packageContent]);

  const extractCharacterMatrix = useCallback(() => {
    if (!packageContent) return "";
    
    const matrixPattern = /# CHARACTER RELATIONSHIP MATRIX\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(matrixPattern);
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

  // Memoized content getters - only recalculate when dependencies change
  const hostGuide = useMemo(() => {
    return packageData?.hostGuide || extractHostGuide();
  }, [packageData?.hostGuide, extractHostGuide]);

  const detectiveScript = useMemo(() => {
    return packageData?.detectiveScript || extractInspectorScript();
  }, [packageData?.detectiveScript, extractInspectorScript]);

  const relationshipMatrix = useMemo(() => {
    return packageData?.relationshipMatrix || extractCharacterMatrix();
  }, [packageData?.relationshipMatrix, extractCharacterMatrix]);

  const charactersList = useMemo(() => {
    // Priority 1: Use characters prop from database
    if (characters && characters.length > 0) {
      return characters;
    }
    
    // Priority 2: Fallback to text parsing only if no database characters
    return extractCharacters();
  }, [characters, extractCharacters]);

  const evidenceCards = useMemo(() => {
    if (packageData?.evidenceCards) {
      return packageData.evidenceCards;
    }
    
    // Fallback to extracting clues and formatting them
    const clues = extractClues();
    if (clues.length > 0) {
      return clues.map(clue => `## ${clue.title}\n\n${clue.content}`).join('\n\n---\n\n');
    }
    
    return "";
  }, [packageData?.evidenceCards, extractClues]);

  // Log only when content availability actually changes
  const contentAvailability = useMemo(() => {
    const availability = {
      hostGuide: !!hostGuide,
      detectiveScript: !!detectiveScript,
      relationshipMatrix: !!relationshipMatrix,
      characters: charactersList.length > 0,
      evidenceCards: !!evidenceCards
    };
    
    debugLog("Content availability changed", availability);
    return availability;
  }, [hostGuide, detectiveScript, relationshipMatrix, charactersList.length, evidenceCards, debugLog]);

  // Helper function to check if a section is generated based on generationStatus
  const isSectionComplete = useCallback((sectionName: string) => {
    return generationStatus?.sections?.[sectionName] || false;
  }, [generationStatus?.sections]);

  // Simplified loading component for individual tabs
  const LoadingTabContent = useCallback(({ message }: { message: string }) => (
    <div className="loading-section">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h3 className="text-lg font-semibold">Generating...</h3>
        <p className="text-muted-foreground text-center max-w-md">
          {message}
        </p>
        {statusMessage && (
          <p className="text-sm text-center text-muted-foreground">
            Status: {statusMessage}
          </p>
        )}
      </div>
    </div>
  ), [statusMessage]);

  return (
    <div className="w-full relative">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center">{mysteryTitle}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-5 mb-4">
          <TabsTrigger value="host-guide" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Host Guide</span>
              {(hostGuide || isSectionComplete('hostGuide')) && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="characters" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Characters ({charactersList?.length || 0})</span>
              {(charactersList.length > 0 || isSectionComplete('characters')) && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="clues" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Evidence</span>
              {(evidenceCards || isSectionComplete('clues')) && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="inspector" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Detective Guide</span>
              {detectiveScript && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="matrix" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Relationships</span>
              {relationshipMatrix && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="host-guide">
          <div className="mystery-content">
            {hostGuide ? (
              <ReactMarkdown 
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table>{children}</table>
                    </div>
                  ),
                }}
              >
                {hostGuide}
              </ReactMarkdown>
            ) : isGenerating ? (
              <LoadingTabContent message="Creating your complete host guide with all the instructions and materials needed to run your mystery game." />
            ) : (
              <div className="text-center py-12 space-y-4">
                <Wand2 className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-xl font-semibold">Ready to Generate Your Mystery</h3>
                <p className="text-muted-foreground">
                  Click the button below to start generating your complete mystery package with all materials included.
                </p>
                {onGenerateClick && (
                  <Button onClick={onGenerateClick} className="mt-4">
                    Generate Package
                  </Button>
                )}
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="characters">
          <div className="mystery-content">
            {Array.isArray(charactersList) && charactersList.length > 0 ? (
              <div className="space-y-4">
                {charactersList.map((character, index) => {
                  const characterGuideContent = buildCharacterGuideContent(character);
                  
                  return (
                    <Accordion key={character.id || index} type="single" collapsible className="character-accordion">
                      <AccordionItem value={`character-${index}`}>
                        <AccordionTrigger className="text-left">
                          <h3 className="text-lg font-semibold text-foreground">{character.character_name}</h3>
                        </AccordionTrigger>
                        <AccordionContent className="text-foreground">
                          <ReactMarkdown 
                            components={{
                              table: ({ children }) => (
                                <div className="overflow-x-auto">
                                  <table>{children}</table>
                                </div>
                              ),
                            }}
                          >
                            {characterGuideContent}
                          </ReactMarkdown>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  );
                })}
              </div>
            ) : isGenerating ? (
              <LoadingTabContent message="Developing unique character profiles with backgrounds, motivations, and secrets for your mystery game." />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Character guides will be available after generation starts.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="clues">
          <div className="mystery-content">
            {evidenceCards ? (
              <ReactMarkdown 
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table>{children}</table>
                    </div>
                  ),
                }}
              >
                {evidenceCards}
              </ReactMarkdown>
            ) : isGenerating ? (
              <LoadingTabContent message="Crafting evidence cards, clues, and investigative materials that will help solve your mystery." />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Evidence cards will be available after generation starts.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inspector">
          <div className="mystery-content">
            {detectiveScript ? (
              <ReactMarkdown 
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table>{children}</table>
                    </div>
                  ),
                }}
              >
                {detectiveScript}
              </ReactMarkdown>
            ) : isGenerating ? (
              <LoadingTabContent message="Writing the detective's script and investigation timeline to guide the mystery solving process." />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Detective guide will be available after generation starts.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="matrix">
          <div className="mystery-content">
            {relationshipMatrix ? (
              <ReactMarkdown 
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table>{children}</table>
                    </div>
                  ),
                }}
              >
                {relationshipMatrix}
              </ReactMarkdown>
            ) : isGenerating ? (
              <LoadingTabContent message="Building the character relationship matrix showing connections, conflicts, and hidden relationships." />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Relationship matrix will be available after generation starts.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
});

MysteryPackageTabView.displayName = 'MysteryPackageTabView';

export default MysteryPackageTabView;
