// src/components/MysteryPackageTabView.tsx
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Users, FileText, Table, FileCode, Download } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { GenerationStatus } from "@/services/mysteryPackageService";
import { supabase } from "@/lib/supabase";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export interface MysteryPackageTabViewProps {
  packageContent?: string;
  mysteryTitle: string;
  generationStatus?: GenerationStatus;
  isGenerating?: boolean;
  conversationId?: string;
}

interface MysteryCharacter {
  id?: string;
  package_id?: string;
  character_name: string;
  description?: string;
  background?: string;
  relationships?: Array<{character: string; description: string}>;
  secrets?: string[];
  round_scripts?: {
    introduction?: string;
    final?: {
      innocent?: string;
      guilty?: string;
      accomplice?: string;
    };
  };
}

interface EvidenceCard {
  title: string;
  content: string;
  description?: string;
  implication?: string;
}

interface TabData {
  hostGuide: string;
  characters: MysteryCharacter[];
  clues: EvidenceCard[];
  inspectorScript: string;
  characterMatrix: string;
}

const MysteryPackageTabView: React.FC<MysteryPackageTabViewProps> = ({
  packageContent,
  mysteryTitle,
  generationStatus,
  isGenerating,
  conversationId
}) => {
  const [activeTab, setActiveTab] = useState("host-guide");
  const [loading, setLoading] = useState(true);
  const [tabData, setTabData] = useState<TabData>({
    hostGuide: '',
    characters: [],
    clues: [],
    inspectorScript: '',
    characterMatrix: ''
  });
  
  useEffect(() => {
    if (conversationId) {
      fetchFullContent(conversationId);
    } else if (packageContent) {
      extractContentFromMarkdown(packageContent);
    }
  }, [conversationId, packageContent]);

  const fetchFullContent = async (conversationId: string) => {
    try {
      setLoading(true);
      console.log("Fetching content for conversation ID:", conversationId);
      
      // Fetch package data with all needed fields
      const { data: packageData, error: packageError } = await supabase
        .from("mystery_packages")
        .select("id, content, host_guide, evidence_cards, detective_script, relationship_matrix")
        .eq("conversation_id", conversationId)
        .single();
        
      if (packageError) {
        console.error("Error fetching mystery package:", packageError);
        setLoading(false);
        return;
      }
      
      console.log("Package data fetched:", {
        id: packageData?.id,
        hostGuideLength: packageData?.host_guide?.length || 0,
        evidenceCardsCount: Array.isArray(packageData?.evidence_cards) ? packageData?.evidence_cards.length : 0,
        hasDetectiveScript: !!packageData?.detective_script,
        hasRelationshipMatrix: !!packageData?.relationship_matrix
      });
      
      // Fetch characters if we have a package ID
      let charactersData: MysteryCharacter[] = [];
      if (packageData?.id) {
        const { data: chars, error: charsError } = await supabase
          .from("mystery_characters")
          .select("*")
          .eq("package_id", packageData.id);
          
        if (charsError) {
          console.error("Error fetching characters:", charsError);
        } else if (chars && chars.length > 0) {
          charactersData = chars;
          console.log(`Found ${chars.length} characters`);
        }
      }

      // Now we have all the data we need, let's process and display it correctly
      const hostGuideContent = packageData?.host_guide || '';
      
      // Format evidence cards properly
      let evidenceCards: EvidenceCard[] = [];
      if (packageData?.evidence_cards && Array.isArray(packageData.evidence_cards)) {
        evidenceCards = packageData.evidence_cards.map((card: any, index: number) => ({
          title: card.title || `Evidence ${index + 1}`,
          content: card.content || '',
          description: card.description || '',
          implication: card.implication || ''
        }));
      }
      
      // Format inspector script
      const inspectorScript = packageData?.detective_script || '';
      
      // Format relationship matrix - convert to HTML table if it's just text
      let characterMatrix = packageData?.relationship_matrix || '';
      if (typeof characterMatrix === 'string' && characterMatrix.includes('|')) {
        characterMatrix = formatMatrixAsTable(characterMatrix);
      } else if (typeof characterMatrix === 'object') {
        characterMatrix = formatMatrixObjectAsTable(characterMatrix);
      }
      
      // If we still don't have character data, try extracting it from content
      if (charactersData.length === 0 && packageData?.content) {
        const extractedCharacters = extractCharactersFromContent(packageData.content);
        if (extractedCharacters.length > 0) {
          charactersData = extractedCharacters;
        }
      }
      
      // Store all the data
      setTabData({
        hostGuide: hostGuideContent,
        characters: charactersData,
        clues: evidenceCards,
        inspectorScript: inspectorScript,
        characterMatrix: characterMatrix
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching mystery content:", error);
      setLoading(false);
    }
  };

  const formatMatrixAsTable = (matrixText: string): string => {
    if (!matrixText.includes('|')) return matrixText;
    
    const lines = matrixText.split('\n').filter(line => line.trim());
    let tableHtml = '<table class="min-w-full border-collapse border border-gray-300">\n';
    
    // Process header row
    if (lines.length > 0) {
      const headerCells = lines[0].split('|').map(cell => cell.trim());
      tableHtml += '  <thead>\n    <tr>\n';
      headerCells.forEach(cell => {
        tableHtml += `      <th class="border border-gray-300 px-4 py-2 bg-gray-100">${cell}</th>\n`;
      });
      tableHtml += '    </tr>\n  </thead>\n';
    }
    
    // Process body rows
    if (lines.length > 1) {
      tableHtml += '  <tbody>\n';
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].includes('---')) continue; // Skip separator rows
        
        const cells = lines[i].split('|').map(cell => cell.trim());
        tableHtml += '    <tr>\n';
        cells.forEach((cell, index) => {
          if (index === 0) {
            tableHtml += `      <td class="border border-gray-300 px-4 py-2 font-semibold bg-gray-50">${cell}</td>\n`;
          } else {
            tableHtml += `      <td class="border border-gray-300 px-4 py-2">${cell}</td>\n`;
          }
        });
        tableHtml += '    </tr>\n';
      }
      tableHtml += '  </tbody>\n';
    }
    
    tableHtml += '</table>';
    return tableHtml;
  };

  const formatMatrixObjectAsTable = (matrixObj: any): string => {
    if (!matrixObj || typeof matrixObj !== 'object') return '';
    
    const characters = Object.keys(matrixObj);
    if (characters.length === 0) return '';
    
    let tableHtml = '<table class="min-w-full border-collapse border border-gray-300">\n';
    
    // Header row
    tableHtml += '  <thead>\n    <tr>\n';
    tableHtml += '      <th class="border border-gray-300 px-4 py-2 bg-gray-100">Character</th>\n';
    tableHtml += '      <th class="border border-gray-300 px-4 py-2 bg-gray-100">Primary Connection</th>\n';
    tableHtml += '      <th class="border border-gray-300 px-4 py-2 bg-gray-100">Secondary Connections</th>\n';
    tableHtml += '      <th class="border border-gray-300 px-4 py-2 bg-gray-100">Secret Connections</th>\n';
    tableHtml += '    </tr>\n  </thead>\n';
    
    // Body rows
    tableHtml += '  <tbody>\n';
    characters.forEach(character => {
      const charData = matrixObj[character];
      tableHtml += '    <tr>\n';
      tableHtml += `      <td class="border border-gray-300 px-4 py-2 font-semibold bg-gray-50">${character}</td>\n`;
      tableHtml += `      <td class="border border-gray-300 px-4 py-2">${charData.primary_connection || ''}</td>\n`;
      
      let secondaryConn = '';
      if (Array.isArray(charData.secondary_connections)) {
        secondaryConn = charData.secondary_connections.join(', ');
      } else if (typeof charData.secondary_connections === 'string') {
        secondaryConn = charData.secondary_connections;
      }
      tableHtml += `      <td class="border border-gray-300 px-4 py-2">${secondaryConn}</td>\n`;
      
      let secretConn = '';
      if (Array.isArray(charData.secret_connections)) {
        secretConn = charData.secret_connections.join(', ');
      } else if (typeof charData.secret_connections === 'string') {
        secretConn = charData.secret_connections;
      }
      tableHtml += `      <td class="border border-gray-300 px-4 py-2">${secretConn}</td>\n`;
      
      tableHtml += '    </tr>\n';
    });
    tableHtml += '  </tbody>\n';
    
    tableHtml += '</table>';
    return tableHtml;
  };

  const extractCharactersFromContent = (content: string): MysteryCharacter[] => {
    const characters: MysteryCharacter[] = [];
    
    // Try to match character sections
    const characterPattern = /# ([^-\n]+) - CHARACTER GUIDE\n([\s\S]*?)(?=# \w+ - CHARACTER GUIDE|# |$)/g;
    let match;
    
    while ((match = characterPattern.exec(content)) !== null) {
      const characterName = match[1].trim();
      const characterContent = match[2].trim();
      
      // Extract character details
      const description = extractSection(characterContent, "CHARACTER DESCRIPTION");
      const background = extractSection(characterContent, "(?:YOUR )?BACKGROUND");
      const relationshipsText = extractSection(characterContent, "(?:YOUR )?RELATIONSHIPS");
      const secretsText = extractSection(characterContent, "(?:YOUR )?SECRETS?");
      
      // Process relationships
      const relationships: {character: string; description: string}[] = [];
      const relationshipPattern = /\*\*([^*]+)\*\*:\s*([^\n]+)/g;
      let relMatch;
      while ((relMatch = relationshipPattern.exec(relationshipsText)) !== null) {
        relationships.push({
          character: relMatch[1].trim(),
          description: relMatch[2].trim()
        });
      }
      
      // Process secrets
      const secrets: string[] = [];
      if (secretsText) {
        const secretsLines = secretsText.split('\n').filter(line => line.trim());
        secrets.push(...secretsLines);
      }
      
      // Extract round scripts
      const introduction = extractQuoted(characterContent, "SAY HELLO");
      const innocentScript = extractQuoted(characterContent, "IF YOU ARE INNOCENT");
      const guiltyScript = extractQuoted(characterContent, "IF YOU ARE GUILTY");
      const accompliceScript = extractQuoted(characterContent, "IF YOU ARE THE ACCOMPLICE");
      
      const characterObj: MysteryCharacter = {
        character_name: characterName,
        description,
        background,
        relationships,
        secrets: secrets.length > 0 ? secrets : undefined,
        round_scripts: {
          introduction,
          final: {
            innocent: innocentScript,
            guilty: guiltyScript,
            accomplice: accompliceScript
          }
        }
      };
      
      characters.push(characterObj);
    }
    
    return characters;
  };

  const extractSection = (content: string, sectionName: string): string => {
    const pattern = new RegExp(`##\\s*(?:${sectionName})\\s*\\n([\\s\\S]*?)(?=##|$)`, 'i');
    const match = content.match(pattern);
    return match ? match[1].trim() : '';
  };

  const extractQuoted = (content: string, context: string): string | undefined => {
    const pattern = new RegExp(`${context}[\\s\\S]*?"([^"]+)"`, 'i');
    const match = content.match(pattern);
    return match ? match[1] : undefined;
  };

  const extractContentFromMarkdown = (content: string) => {
    // This is a fallback for when we only have the packageContent string
    // and not direct database access
    try {
      const hostGuideMatch = content.match(/# (?:HOST GUIDE|.*HOST GUIDE).*?\n([\s\S]*?)(?=# |$)/i);
      const inspectorScriptMatch = content.match(/# (?:INSPECTOR SCRIPT|DETECTIVE SCRIPT).*?\n([\s\S]*?)(?=# |$)/i);
      const characterMatrixMatch = content.match(/# (?:CHARACTER RELATIONSHIP MATRIX|RELATIONSHIP MATRIX).*?\n([\s\S]*?)(?=# |$)/i);
      
      // Extract evidence cards directly
      const evidenceCards: EvidenceCard[] = [];
      const evidencePattern = /(?:## EVIDENCE CARD #?\d+:?\s*([^\n]+)|"?EVIDENCE CARD #?\d+:?\s*([^\n]+)"?)([\s\S]*?)(?=(?:## EVIDENCE CARD)|##|# |$)/gi;
      let evidenceMatch;
      
      while ((evidenceMatch = evidencePattern.exec(content)) !== null) {
        const title = (evidenceMatch[1] || evidenceMatch[2] || "Evidence").trim();
        const description = evidenceMatch[3]?.trim() || "";
        
        evidenceCards.push({
          title,
          content: description,
          description: ""
        });
      }
      
      // Use the extractCharactersFromContent function for characters
      const characters = extractCharactersFromContent(content);
      
      let characterMatrix = '';
      if (characterMatrixMatch && characterMatrixMatch[1]) {
        characterMatrix = formatMatrixAsTable(characterMatrixMatch[1].trim());
      }
      
      setTabData({
        hostGuide: hostGuideMatch?.[1]?.trim() || '',
        characters,
        clues: evidenceCards.length > 0 ? evidenceCards : [],
        inspectorScript: inspectorScriptMatch?.[1]?.trim() || '',
        characterMatrix
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error extracting content from markdown:", error);
      setLoading(false);
    }
  };

  const renderCharacters = () => {
    if (tabData.characters.length === 0) {
      return <p>No character information available.</p>;
    }

    return (
      <div className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {tabData.characters.map((character, index) => (
            <AccordionItem key={index} value={`character-${index}`}>
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                {character.character_name}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-4 p-4 rounded-md bg-muted/20">
                  {character.description && (
                    <div>
                      <h3 className="text-md font-semibold mb-1">Description</h3>
                      <p>{character.description}</p>
                    </div>
                  )}
                  
                  {character.background && (
                    <div>
                      <h3 className="text-md font-semibold mb-1">Background</h3>
                      <p>{character.background}</p>
                    </div>
                  )}
                  
                  {character.relationships && character.relationships.length > 0 && (
                    <div>
                      <h3 className="text-md font-semibold mb-1">Relationships</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {character.relationships.map((rel, idx) => (
                          <li key={idx} className="mb-1">
                            <strong>{rel.character}:</strong> {rel.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {character.secrets && character.secrets.length > 0 && (
                    <div>
                      <h3 className="text-md font-semibold mb-1">Secrets</h3>
                      <ul className="list-disc pl-5 space-y-1">
                        {character.secrets.map((secret, idx) => (
                          <li key={idx}>{secret}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {character.round_scripts && (
                    <div>
                      <h3 className="text-md font-semibold mb-1">Script Notes</h3>
                      
                      {character.round_scripts.introduction && (
                        <div className="mb-2 p-2 bg-background rounded-md">
                          <p><strong>Introduction:</strong> "{character.round_scripts.introduction}"</p>
                        </div>
                      )}
                      
                      {character.round_scripts.final && (
                        <div className="space-y-2">
                          <p className="font-medium">Final Statements:</p>
                          
                          {character.round_scripts.final.innocent && (
                            <div className="p-2 bg-background rounded-md">
                              <p><strong>If innocent:</strong> "{character.round_scripts.final.innocent}"</p>
                            </div>
                          )}
                          
                          {character.round_scripts.final.guilty && (
                            <div className="p-2 bg-background rounded-md">
                              <p><strong>If guilty:</strong> "{character.round_scripts.final.guilty}"</p>
                            </div>
                          )}
                          
                          {character.round_scripts.final.accomplice && (
                            <div className="p-2 bg-background rounded-md">
                              <p><strong>If accomplice:</strong> "{character.round_scripts.final.accomplice}"</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  };

  const renderClues = () => {
    if (tabData.clues.length === 0) {
      return <p className="text-center py-8">No clue information available.</p>;
    }

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold mb-4">CLUES AND EVIDENCE</h1>
        
        {tabData.clues.map((clue, index) => (
          <div key={index} className="border rounded-lg p-4 mb-4">
            <h2 className="text-xl font-semibold mb-2">{clue.title}</h2>
            {clue.description && (
              <div className="mb-2">
                <h3 className="text-md font-medium">Description</h3>
                <p>{clue.description}</p>
              </div>
            )}
            {clue.content && (
              <div className="mb-2">
                <ReactMarkdown>{clue.content}</ReactMarkdown>
              </div>
            )}
            {clue.implication && (
              <div>
                <h3 className="text-md font-medium">Implications</h3>
                <p>{clue.implication}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleDownloadPDF = () => {
    // PDF download functionality would be implemented here
    console.log("Download PDF requested");
  };
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-64">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2">Loading mystery content...</span>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl font-bold">{mysteryTitle}</CardTitle>
      </CardHeader>
      
      <CardContent className="pt-6">
        <Tabs defaultValue="host-guide" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center mb-4 justify-between">
            <TabsList className="grid grid-cols-5 w-full max-w-2xl">
              <TabsTrigger value="host-guide" className="flex flex-col gap-1 sm:flex-row sm:gap-2 items-center">
                <Book className="h-4 w-4" />
                <span className="hidden sm:block">Host Guide</span>
                <span className="block sm:hidden">Host</span>
              </TabsTrigger>
              <TabsTrigger value="characters" className="flex flex-col gap-1 sm:flex-row sm:gap-2 items-center">
                <Users className="h-4 w-4" />
                <span>Characters</span>
              </TabsTrigger>
              <TabsTrigger value="clues" className="flex flex-col gap-1 sm:flex-row sm:gap-2 items-center">
                <FileText className="h-4 w-4" />
                <span>Clues</span>
              </TabsTrigger>
              <TabsTrigger value="inspector-script" className="flex flex-col gap-1 sm:flex-row sm:gap-2 items-center">
                <FileCode className="h-4 w-4" />
                <span className="hidden sm:block">Inspector Script</span>
                <span className="block sm:hidden">Script</span>
              </TabsTrigger>
              <TabsTrigger value="character-matrix" className="flex flex-col gap-1 sm:flex-row sm:gap-2 items-center">
                <Table className="h-4 w-4" />
                <span className="hidden sm:block">Character Matrix</span>
                <span className="block sm:hidden">Matrix</span>
              </TabsTrigger>
            </TabsList>
            
            <Button 
              variant="outline" 
              size="sm" 
              className="hidden sm:flex items-center gap-2"
              onClick={handleDownloadPDF}
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </Button>
          </div>
          
          <div className="sm:hidden flex justify-end mb-4">
            <Button 
              variant="outline" 
              size="sm" 
              className="flex items-center gap-2"
              onClick={handleDownloadPDF}
            >
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </Button>
          </div>
          
          <TabsContent value="host-guide" className="prose prose-gray dark:prose-invert max-w-none">
            {tabData.hostGuide ? (
              <ReactMarkdown>{tabData.hostGuide}</ReactMarkdown>
            ) : (
              <p className="text-center py-8">Host guide content is not available.</p>
            )}
          </TabsContent>
          
          <TabsContent value="characters">
            {renderCharacters()}
          </TabsContent>
          
          <TabsContent value="clues">
            {renderClues()}
          </TabsContent>
          
          <TabsContent value="inspector-script" className="prose prose-gray dark:prose-invert max-w-none">
            {tabData.inspectorScript ? (
              <ReactMarkdown>{tabData.inspectorScript}</ReactMarkdown>
            ) : (
              <p className="text-center py-8">Inspector script is not available.</p>
            )}
          </TabsContent>
          
          <TabsContent value="character-matrix">
            {tabData.characterMatrix ? (
              <div 
                className="prose prose-gray dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: tabData.characterMatrix }}
              />
            ) : (
              <p className="text-center py-8">Character relationship matrix is not available.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MysteryPackageTabView;
