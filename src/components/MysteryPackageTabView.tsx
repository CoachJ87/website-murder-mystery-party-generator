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

  // Enhanced markdown table cleaning function
  const cleanMarkdownTable = useCallback((content: string) => {
    if (!content) return '';
    
    console.log("Cleaning table content:", content.substring(0, 200) + "...");
    
    // Split into lines and process
    const lines = content.split('\n');
    const cleanLines: string[] = [];
    let foundTable = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Skip empty lines before table starts
      if (!foundTable && !line) continue;
      
      // Detect table start (line with pipes)
      if (line.includes('|')) {
        foundTable = true;
        
        // Clean the table line
        let cleanLine = line
          // Remove extra whitespace around pipes
          .replace(/\s*\|\s*/g, ' | ')
          // Ensure proper spacing
          .replace(/^\s*\|/, '|')
          .replace(/\|\s*$/, '|')
          // Handle escaped characters
          .replace(/\\n/g, ' ')
          .replace(/\\"/g, '"');
        
        // Ensure the line starts and ends with pipes if it contains pipes
        if (!cleanLine.startsWith('|') && cleanLine.includes('|')) {
          cleanLine = '| ' + cleanLine;
        }
        if (!cleanLine.endsWith('|') && cleanLine.includes('|')) {
          cleanLine = cleanLine + ' |';
        }
        
        cleanLines.push(cleanLine);
        
        // Check if next line should be a separator (for header)
        if (cleanLines.length === 1 && i + 1 < lines.length) {
          const nextLine = lines[i + 1].trim();
          if (!nextLine.includes('-') && !nextLine.includes('|')) {
            // Add separator line for table header
            const cellCount = (cleanLine.match(/\|/g) || []).length - 1;
            const separator = '|' + ' --- |'.repeat(cellCount);
            cleanLines.push(separator);
          }
        }
      } else if (foundTable && line.includes('-')) {
        // This is likely a separator line
        let cleanLine = line.replace(/\s+/g, '').replace(/-+/g, '---');
        if (!cleanLine.startsWith('|')) cleanLine = '|' + cleanLine;
        if (!cleanLine.endsWith('|')) cleanLine = cleanLine + '|';
        cleanLines.push(cleanLine);
      } else if (foundTable && !line) {
        // Empty line after table - stop processing
        break;
      } else if (foundTable) {
        // Continue with table content
        cleanLines.push(line);
      }
    }
    
    const result = cleanLines.join('\n');
    console.log("Cleaned table result:", result);
    return result;
  }, []);

  // Enhanced character matrix extraction
  const extractCharacterMatrix = useCallback(() => {
    if (!packageContent) return "";
    
    const matrixPattern = /# CHARACTER RELATIONSHIP MATRIX\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(matrixPattern);
    
    if (!match) return "";
    
    const rawContent = match[1].trim();
    console.log("Raw matrix content:", rawContent.substring(0, 300) + "...");
    
    // Find the actual table content by looking for the first line with pipes
    const lines = rawContent.split('\n');
    const tableStartIndex = lines.findIndex(line => line.trim().includes('|'));
    
    if (tableStartIndex === -1) {
      console.log("No table found in matrix content");
      return rawContent; // Return as-is if no table found
    }
    
    // Extract just the table portion
    const tableLines = lines.slice(tableStartIndex);
    
    // Find where table ends (first empty line or non-table content)
    const tableEndIndex = tableLines.findIndex((line, index) => {
      if (index === 0) return false; // Don't end on first line
      const trimmed = line.trim();
      return !trimmed || (!trimmed.includes('|') && !trimmed.includes('-'));
    });
    
    const finalTableLines = tableEndIndex > 0 ? tableLines.slice(0, tableEndIndex) : tableLines;
    const extractedTable = finalTableLines.join('\n');
    
    console.log("Extracted table:", extractedTable);
    return extractedTable;
  }, [packageContent]);

  const relationshipMatrix = useMemo(() => {
    let rawMatrix = packageData?.relationshipMatrix || extractCharacterMatrix();
    
    if (!rawMatrix) return "";
    
    // If using packageData, extract just the table portion
    if (packageData?.relationshipMatrix) {
      const lines = rawMatrix.split('\n');
      const tableStartIndex = lines.findIndex(line => line.trim().startsWith('|'));
      if (tableStartIndex !== -1) {
        // Find table end
        const tableEndIndex = lines.findIndex((line, index) => {
          if (index <= tableStartIndex) return false;
          const trimmed = line.trim();
          return !trimmed || (!trimmed.includes('|') && !trimmed.includes('-'));
        });
        
        const tablePortion = tableEndIndex > 0 ? 
          lines.slice(tableStartIndex, tableEndIndex) : 
          lines.slice(tableStartIndex);
        rawMatrix = tablePortion.join('\n');
      }
    }
  
    const cleanedMatrix = cleanMarkdownTable(rawMatrix);
    console.log("Final relationship matrix:", cleanedMatrix);
    return cleanedMatrix;
  }, [packageData?.relationshipMatrix, extractCharacterMatrix, cleanMarkdownTable]);

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
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto mb-4">
                        <table className={cn(
                          "w-full border-collapse border border-border",
                          isMobile && "text-xs"
                        )}>
                          {children}
                        </table>
                      </div>
                    ),
                    thead: ({ children }) => (
                      <thead className="bg-muted/50">
                        {children}
                      </thead>
                    ),
                    tbody: ({ children }) => (
                      <tbody>
                        {children}
                      </tbody>
                    ),
                    tr: ({ children }) => (
                      <tr className="border-b border-border">
                        {children}
                      </tr>
                    ),
                    th: ({ children }) => (
                      <th className={cn(
                        "border border-border px-3 py-2 text-left font-medium",
                        isMobile && "px-2 py-1 text-xs"
                      )}>
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className={cn(
                        "border border-border px-3 py-2",
                        isMobile && "px-2 py-1 text-xs"
                      )}>
                        {children}
                      </td>
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
                  {relationshipMatrix}
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
