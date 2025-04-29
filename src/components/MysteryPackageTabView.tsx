// src/components/MysteryPackageTabView.tsx
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Users, FileText, Printer, Download } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { GenerationStatus } from "@/services/mysteryPackageService";
import { supabase } from "@/lib/supabase";
import { MysteryCharacter } from "@/interfaces/mystery";

export interface MysteryPackageTabViewProps {
  packageContent?: string;
  mysteryTitle: string;
  generationStatus?: GenerationStatus;
  isGenerating?: boolean;
  conversationId?: string;
}

interface TabData {
  hostGuide: string;
  characters: MysteryCharacter[];
  clues: any[];
  materials: string;
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
    materials: ''
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
        id: packageData.id,
        hostGuideLength: packageData.host_guide?.length || 0,
        evidenceCardsCount: packageData.evidence_cards?.length || 0,
        hasContent: !!packageData.content,
      });
      
      // Fetch characters if we have a package ID
      let charactersData: MysteryCharacter[] = [];
      if (packageData.id) {
        const { data: chars, error: charsError } = await supabase
          .from("mystery_characters")
          .select("*")
          .eq("package_id", packageData.id);
          
        if (charsError) {
          console.error("Error fetching characters:", charsError);
        } else if (chars) {
          charactersData = chars;
          console.log(`Found ${chars.length} characters`);
        }
      }

      // Fetch conversation title as fallback
      let title = mysteryTitle;
      if (!title && conversationId) {
        const { data: convData } = await supabase
          .from("conversations")
          .select("title")
          .eq("id", conversationId)
          .single();
          
        if (convData?.title) {
          title = convData.title;
        }
      }
      
      // Build tab data from fetched content
      const newTabData: TabData = {
        hostGuide: packageData.host_guide || '',
        characters: charactersData,
        clues: packageData.evidence_cards || [],
        materials: generateMaterialsContent(packageData, charactersData)
      };
      
      setTabData(newTabData);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching mystery content:", error);
      setLoading(false);
    }
  };

  const extractContentFromMarkdown = (content: string) => {
    // This is a fallback for when we only have the packageContent string
    // and not direct database access
    try {
      const hostGuideMatch = content.match(/# (?:HOST GUIDE|.*HOST GUIDE).*?\n([\s\S]*?)(?=# |$)/i);
      const charactersMatch = content.match(/# (?:CHARACTERS|.*CHARACTER).*?\n([\s\S]*?)(?=# |$)/i);
      const cluesMatch = content.match(/# (?:CLUES|EVIDENCE|.*CLUES|.*EVIDENCE).*?\n([\s\S]*?)(?=# |$)/i);
      const materialsMatch = content.match(/# (?:MATERIALS|PRINTABLE|.*MATERIALS|.*PRINTABLE).*?\n([\s\S]*?)(?=# |$)/i);
      
      setTabData({
        hostGuide: hostGuideMatch?.[1]?.trim() || '',
        characters: [], // We can't extract structured character data from markdown
        clues: [], // We can't extract structured clue data from markdown
        materials: materialsMatch?.[1]?.trim() || ''
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error extracting content from markdown:", error);
      setLoading(false);
    }
  };

  const generateMaterialsContent = (packageData: any, characters: MysteryCharacter[]): string => {
    let content = "# PRINTABLE MATERIALS\n\n";
    
    // Add name tags section
    content += "## Name Tags\n\n";
    content += "Print name tags for each character using card stock or sticker paper:\n\n";
    characters.forEach(char => {
      content += `- ${char.character_name}\n`;
    });
    
    // Add evidence cards section
    content += "\n## Evidence Cards\n\n";
    content += "Print the following evidence cards on card stock and cut them out:\n\n";
    
    if (packageData.evidence_cards && packageData.evidence_cards.length > 0) {
      packageData.evidence_cards.forEach((card: any, index: number) => {
        const title = card.title || `Evidence ${index + 1}`;
        content += `### ${title}\n\n`;
        if (card.content) {
          content += `${card.content}\n\n`;
        }
      });
    } else {
      content += "No evidence cards available.\n\n";
    }
    
    return content;
  };

  const renderCharacters = () => {
    if (tabData.characters.length === 0) {
      return <p>No character information available.</p>;
    }

    return (
      <div className="space-y-6">
        {tabData.characters.map((character, index) => (
          <div key={index} className="border rounded-lg p-4 mb-4">
            <h2 className="text-xl font-bold mb-2">{character.character_name}</h2>
            
            {character.description && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1">Description</h3>
                <p>{character.description}</p>
              </div>
            )}
            
            {character.background && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1">Background</h3>
                <p>{character.background}</p>
              </div>
            )}
            
            {character.relationships && character.relationships.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1">Relationships</h3>
                <ul className="list-disc pl-5">
                  {character.relationships.map((rel: any, idx: number) => (
                    <li key={idx}>
                      <strong>{rel.character}:</strong> {rel.description}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {character.secrets && character.secrets.length > 0 && (
              <div className="mb-4">
                <h3 className="text-lg font-semibold mb-1">Secrets</h3>
                <ul className="list-disc pl-5">
                  {character.secrets.map((secret: string, idx: number) => (
                    <li key={idx}>{secret}</li>
                  ))}
                </ul>
              </div>
            )}
            
            {character.round_scripts && (
              <div>
                <h3 className="text-lg font-semibold mb-1">Script Notes</h3>
                
                {character.round_scripts.introduction && (
                  <div className="mb-2">
                    <p><strong>Introduction:</strong> "{character.round_scripts.introduction}"</p>
                  </div>
                )}
                
                {character.round_scripts.final && (
                  <div>
                    <p className="font-medium">Final Statements:</p>
                    {character.round_scripts.final.innocent && (
                      <p><strong>If innocent:</strong> "{character.round_scripts.final.innocent}"</p>
                    )}
                    {character.round_scripts.final.guilty && (
                      <p><strong>If guilty:</strong> "{character.round_scripts.final.guilty}"</p>
                    )}
                    {character.round_scripts.final.accomplice && (
                      <p><strong>If accomplice:</strong> "{character.round_scripts.final.accomplice}"</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderClues = () => {
    if (tabData.clues.length === 0) {
      return <ReactMarkdown>{`# CLUES AND EVIDENCE\n\nNo clue information available.`}</ReactMarkdown>;
    }

    let cluesContent = `# CLUES AND EVIDENCE\n\n`;
    
    tabData.clues.forEach((clue, index) => {
      const title = clue.title || `Evidence ${index + 1}`;
      cluesContent += `## ${title}\n\n`;
      if (clue.content) {
        cluesContent += `${clue.content}\n\n`;
      }
    });
    
    return <ReactMarkdown>{cluesContent}</ReactMarkdown>;
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
            <TabsList className="grid grid-cols-4 w-full max-w-xl">
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
              <TabsTrigger value="materials" className="flex flex-col gap-1 sm:flex-row sm:gap-2 items-center">
                <Printer className="h-4 w-4" />
                <span className="hidden sm:block">Materials</span>
                <span className="block sm:hidden">Print</span>
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
            <ReactMarkdown>{tabData.hostGuide}</ReactMarkdown>
          </TabsContent>
          
          <TabsContent value="characters" className="prose prose-gray dark:prose-invert max-w-none">
            {renderCharacters()}
          </TabsContent>
          
          <TabsContent value="clues" className="prose prose-gray dark:prose-invert max-w-none">
            {renderClues()}
          </TabsContent>
          
          <TabsContent value="materials" className="prose prose-gray dark:prose-invert max-w-none">
            <ReactMarkdown>{tabData.materials}</ReactMarkdown>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MysteryPackageTabView;
