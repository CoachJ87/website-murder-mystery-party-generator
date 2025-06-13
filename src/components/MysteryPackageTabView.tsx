
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

  // Update status message based on generationStatus
  useEffect(() => {
    if (generationStatus) {
      setStatusMessage(generationStatus.currentStep || "Processing...");
    }
  }, [generationStatus]);

  // Clean table processing function
  const processRelationshipMatrix = useCallback((rawMatrix: string): string => {
    if (!rawMatrix) {
      return "";
    }
  
    // Convert escaped newlines to actual newlines
    const withLineBreaks = rawMatrix.replace(/\\n/g, '\n');
    
    // Extract just the table part (lines starting with |)
    const lines = withLineBreaks.split('\n');
    const tableLines = lines.filter(line => line.trim().startsWith('|'));
    
    // Join with proper line breaks and add spacing
    return '\n\n' + tableLines.join('\n') + '\n\n';
  }, []);

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
    const relationships = getRelationshipsArray(character.relationships);
    const secrets = getSecretsArray(character.secrets);
    
    let content = `# ${character.character_name} - Character Guide\n\n`;
    
    // Character Description
    if (character.description) {
      content += `${character.description}\n\n`;
    }
    
    // Your Background
    if (character.background) {
      content += `${character.background}\n\n`;
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
      content += `${secret}\n\n`;
    }
    
    return content;
  }, [getRelationshipsArray, getSecretsArray]);

  // Function to build complete host guide content
  const buildCompleteHostGuide = useCallback((): string => {
    if (!packageData) return "";
    
    const title = packageData.title || mysteryTitle || "Mystery";
    let content = `# ${title} - HOST GUIDE\n\n`;
    
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

  // Improved character matrix extraction
  const extractCharacterMatrix = useCallback(() => {
    if (!packageContent) return "";
    
    const matrixPattern = /# CHARACTER RELATIONSHIP MATRIX\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(matrixPattern);
    
    if (!match) return "";
    
    const rawContent = match[1].trim();
    
    // Find the actual table content by looking for the first line with pipes
    const lines = rawContent.split('\n');
    const tableStartIndex = lines.findIndex(line => line.trim().includes('|'));
    
    if (tableStartIndex === -1) {
      return ""; // No table found
    }
    
    // Extract from table start to end of content or next section
    const tableLines = lines.slice(tableStartIndex);
    
    // Find where table ends (empty line or non-table content)
    const tableEndIndex = tableLines.findIndex((line, index) => {
      if (index === 0) return false; // Don't end on first line
      const trimmed = line.trim();
      // End if we hit an empty line followed by non-table content, or a new section
      return !trimmed || (trimmed.startsWith('#') && !trimmed.includes('|'));
    });
    
    const finalTableLines = tableEndIndex > 0 ? tableLines.slice(0, tableEndIndex) : tableLines;
    return finalTableLines.join('\n').trim();
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

  // Clean relationship matrix processing
  const relationshipMatrix = useMemo(() => {
    let rawMatrix = packageData?.relationshipMatrix || extractCharacterMatrix();
    
    if (!rawMatrix) {
      return "";
    }

    // Process the matrix using our clean function
    return processRelationshipMatrix(rawMatrix);
  }, [packageData?.relationshipMatrix, extractCharacterMatrix, processRelationshipMatrix]);

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
  const LoadingTabContent = useCallback(({ message }: { message: React.ReactNode }) => (
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
          Generating...
        </h3>
        <p className={cn(
          "text-muted-foreground text-center max-w-md",
          isMobile && "text-sm px-4"
        )}>
          {message}
        </p>
      </div>
    </div>
  ), [statusMessage, isMobile]);

  // Enhanced table components for ReactMarkdown
  const tableComponents = useMemo(() => ({
    table: ({ children }: any) => (
      <div className="overflow-x-auto mb-4">
        <table className={cn(
          "w-full border-collapse border border-border bg-background",
          isMobile && "text-xs"
        )}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => (
      <thead className="bg-muted/50">
        {children}
      </thead>
    ),
    tbody: ({ children }: any) => (
      <tbody>
        {children}
      </tbody>
    ),
    tr: ({ children }: any) => (
      <tr className="border-b border-border hover:bg-muted/25">
        {children}
      </tr>
    ),
    th: ({ children }: any) => (
      <th className={cn(
        "border border-border px-3 py-2 text-left font-medium text-foreground bg-muted/30",
        isMobile && "px-2 py-1 text-xs"
      )}>
        {children}
      </th>
    ),
    td: ({ children }: any) => (
      <td className={cn(
        "border border-border px-3 py-2 text-foreground",
        isMobile && "px-2 py-1 text-xs"
      )}>
        {children}
      </td>
    ),
  }), [isMobile]);

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
              "gap-2 bg-[#8B0000] hover:bg-[#7A0000] text-white",
              isMobile && "w-full"
            )}
          >
            <Mail className="h-4 w-4" />
            Share With Guests
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="">
        <TabsList className={cn(
          "w-full mb-4 bg-[#8B0000] p-1 overflow-hidden",
          isMobile ? "grid grid-cols-2 gap-1 h-auto" : "grid grid-cols-2 md:grid-cols-5"
        )}>
          <TabsTrigger 
            value="host-guide" 
            className={cn(
              "whitespace-nowrap text-white data-[state=active]:bg-[#5A0000] data-[state=active]:text-white hover:bg-[#7A0000]",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
          >
            {isMobile ? "Host" : "Host Guide"}
          </TabsTrigger>
          <TabsTrigger 
            value="characters" 
            className={cn(
              "whitespace-nowrap text-white data-[state=active]:bg-[#5A0000] data-[state=active]:text-white hover:bg-[#7A0000]",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
          >
            {isMobile ? `Characters (${charactersList?.length || 0})` : `Characters (${charactersList?.length || 0})`}
          </TabsTrigger>
          <TabsTrigger 
            value="clues" 
            className={cn(
              "whitespace-nowrap text-white data-[state=active]:bg-[#5A0000] data-[state=active]:text-white hover:bg-[#7A0000]",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
          >
            Evidence
          </TabsTrigger>
          <TabsTrigger 
            value="inspector" 
            className={cn(
              "whitespace-nowrap text-white data-[state=active]:bg-[#5A0000] data-[state=active]:text-white hover:bg-[#7A0000]",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
          >
            {isMobile ? "Detective" : "Detective Guide"}
          </TabsTrigger>
          <TabsTrigger 
            value="matrix" 
            className={cn(
              "whitespace-nowrap text-white data-[state=active]:bg-[#5A0000] data-[state=active]:text-white hover:bg-[#7A0000]",
              isMobile && "text-xs px-2 py-2 h-auto"
            )}
          >
            {isMobile ? "Relations" : "Relationships"}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="host-guide" className={cn("overflow-hidden", isMobile && "px-2")}>
          <div className={cn(
            "mystery-content",
            isMobile && "text-sm"
          )}>
            {hostGuide ? (
              <ReactMarkdown 
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className={cn(isMobile && "text-xs")}>{children}</table>
                    </div>
                  ),
                  h1: ({ children }) => (
                    <h1 className={cn(
                      "text-2xl font-bold mb-4",
                      isMobile && "text-lg mb-3"
                    )}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className={cn(
                      "text-xl font-semibold mb-3",
                      isMobile && "text-base mb-2"
                    )}>
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className={cn(
                      "text-lg font-medium mb-2",
                      isMobile && "text-sm mb-2"
                    )}>
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className={cn(
                      "mb-4",
                      isMobile && "mb-3 text-sm leading-relaxed"
                    )}>
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className={cn(
                      "list-disc pl-6 mb-4",
                      isMobile && "pl-4 mb-3 text-sm"
                    )}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className={cn(
                      "list-decimal pl-6 mb-4",
                      isMobile && "pl-4 mb-3 text-sm"
                    )}>
                      {children}
                    </ol>
                  ),
                }}
              >
                {hostGuide}
              </ReactMarkdown>
            ) : isGenerating ? (
              <LoadingTabContent message={
                <>
                  Currently generating your complete mystery. This process will take around 3-5 minutes.
                  <br />
                  This page will automatically refresh once the mystery is complete.
                </>
              } />            
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
                  Ready to Generate Your Mystery
                </h3>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  Click the button below to start generating your complete mystery package with all materials included.
                </p>
                {onGenerateClick && (
                  <Button 
                    onClick={onGenerateClick} 
                    className={cn(
                      "mt-4",
                      isMobile && "w-full text-sm h-11"
                    )}
                  >
                    Generate Package
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
                          <ReactMarkdown 
                            components={{
                              table: ({ children }) => (
                                <div className="overflow-x-auto">
                                  <table className={cn(isMobile && "text-xs")}>{children}</table>
                                </div>
                              ),
                              h1: ({ children }) => (
                                <h1 className={cn(
                                  "text-xl font-bold mb-3",
                                  isMobile && "text-base mb-2"
                                )}>
                                  {children}
                                </h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className={cn(
                                  "text-lg font-semibold mb-3",
                                  isMobile && "text-sm mb-2"
                                )}>
                                  {children}
                                </h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className={cn(
                                  "text-base font-medium mb-2",
                                  isMobile && "text-sm mb-2"
                                )}>
                                  {children}
                                </h3>
                              ),
                              p: ({ children }) => (
                                <p className={cn(
                                  "mb-3",
                                  isMobile && "mb-2 text-sm leading-relaxed"
                                )}>
                                  {children}
                                </p>
                              ),
                              ul: ({ children }) => (
                                <ul className={cn(
                                  "list-disc pl-5 mb-3",
                                  isMobile && "pl-4 mb-2 text-sm"
                                )}>
                                  {children}
                                </ul>
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
              <div className={cn(
                "text-center py-6",
                isMobile && "py-4 px-4"
              )}>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  Character guides will be available after generation starts.
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
              <ReactMarkdown 
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className={cn(isMobile && "text-xs")}>{children}</table>
                    </div>
                  ),
                  h1: ({ children }) => (
                    <h1 className={cn(
                      "text-2xl font-bold mb-4",
                      isMobile && "text-lg mb-3"
                    )}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className={cn(
                      "text-xl font-semibold mb-3",
                      isMobile && "text-base mb-2"
                    )}>
                      {children}
                    </h2>
                  ),
                  p: ({ children }) => (
                    <p className={cn(
                      "mb-4",
                      isMobile && "mb-3 text-sm leading-relaxed"
                    )}>
                      {children}
                    </p>
                  ),
                }}
              >
                {evidenceCards}
              </ReactMarkdown>
            ) : isGenerating ? (
              <LoadingTabContent message="Crafting evidence cards, clues, and investigative materials that will help solve your mystery." />
            ) : (
              <div className={cn(
                "text-center py-6",
                isMobile && "py-4 px-4"
              )}>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  Evidence cards will be available after generation starts.
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
              <ReactMarkdown 
                components={{
                  table: ({ children }) => (
                    <div className="overflow-x-auto">
                      <table className={cn(isMobile && "text-xs")}>{children}</table>
                    </div>
                  ),
                  h1: ({ children }) => (
                    <h1 className={cn(
                      "text-2xl font-bold mb-4",
                      isMobile && "text-lg mb-3"
                    )}>
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className={cn(
                      "text-xl font-semibold mb-3",
                      isMobile && "text-base mb-2"
                    )}>
                      {children}
                    </h2>
                  ),
                  p: ({ children }) => (
                    <p className={cn(
                      "mb-4",
                      isMobile && "mb-3 text-sm leading-relaxed"
                    )}>
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul className={cn(
                      "list-disc pl-6 mb-4",
                      isMobile && "pl-4 mb-3 text-sm"
                    )}>
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className={cn(
                      "list-decimal pl-6 mb-4",
                      isMobile && "pl-4 mb-3 text-sm"
                    )}>
                      {children}
                    </ol>
                  ),
                }}
              >
                {detectiveScript}
              </ReactMarkdown>
            ) : isGenerating ? (
              <LoadingTabContent message="Writing the detective's script and investigation timeline to guide the mystery solving process." />
            ) : (
              <div className={cn(
                "text-center py-6",
                isMobile && "py-4 px-4"
              )}>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  Detective guide will be available after generation starts.
                </p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="matrix" className={cn("overflow-hidden", isMobile && "px-2")}>
          <div className={cn(
            "mystery-content",
            isMobile && "text-sm"
          )}>
            {relationshipMatrix ? (
              <div>
                <h2 className={cn(
                  "text-xl font-semibold mb-4",
                  isMobile && "text-lg mb-3"
                )}>
                  Character Relationship Matrix
                </h2>
                <ReactMarkdown 
                  components={tableComponents}
                >
                  {`\n${relationshipMatrix}\n`}
                </ReactMarkdown>
              </div>
            ) : isGenerating ? (
              <LoadingTabContent message="Building the character relationship matrix showing connections, conflicts, and hidden relationships." />
            ) : (
              <div className={cn(
                "text-center py-6",
                isMobile && "py-4 px-4"
              )}>
                <p className={cn(
                  "text-muted-foreground",
                  isMobile && "text-sm"
                )}>
                  Relationship matrix will be available after generation starts.
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
        characters={charactersList}
        mysteryId={conversationId || ""}
      />
    </div>
  );
});

MysteryPackageTabView.displayName = 'MysteryPackageTabView';

export default MysteryPackageTabView;
