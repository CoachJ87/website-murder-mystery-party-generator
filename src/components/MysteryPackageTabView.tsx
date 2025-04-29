
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Users, FileText, Printer, Download } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { GenerationStatus } from "@/services/mysteryPackageService";
import { supabase } from "@/lib/supabase";

export interface MysteryPackageTabViewProps {
  packageContent: string;
  mysteryTitle: string;
  generationStatus?: GenerationStatus;
  isGenerating?: boolean;
  conversationId?: string;
}

const MysteryPackageTabView: React.FC<MysteryPackageTabViewProps> = ({
  packageContent,
  mysteryTitle,
  generationStatus,
  isGenerating,
  conversationId
}) => {
  const [activeTab, setActiveTab] = useState("host-guide");
  const [completeContent, setCompleteContent] = useState(packageContent);
  const [title, setTitle] = useState(mysteryTitle);
  const [debugMode] = useState(false); // Set to true for debugging content issues
  
  useEffect(() => {
    if (conversationId) {
      // If we have a conversation ID but empty content, fetch from the database
      const fetchFullContent = async () => {
        try {
          // Fetch the main package data
          const { data, error } = await supabase
            .from("mystery_packages")
            .select("id, content, host_guide, evidence_cards, conversation_id, detective_script")
            .eq("conversation_id", conversationId)
            .single();
            
          if (error) {
            console.error("Error fetching mystery package:", error);
            return;
          }
            
          if (data) {
            // Initialize our constructed content
            let constructedContent = "";
            
            // 1. Add Host Guide if available
            if (data.host_guide && data.host_guide.length > 10) {
              constructedContent += `# HOST GUIDE\n\n${data.host_guide}\n\n`;
              if (debugMode) console.log("Added host guide to content");
            }
            
            // 2. Fetch and add characters data if available
            if (data.id) {
              const { data: charactersData, error: charError } = await supabase
                .from("mystery_characters")
                .select("*")
                .eq("package_id", data.id);
                
              if (charError) {
                console.error("Error fetching characters:", charError);
              }
                
              if (charactersData && charactersData.length > 0) {
                constructedContent += `# CHARACTERS\n\n`;
                if (debugMode) console.log(`Found ${charactersData.length} characters`);
                
                charactersData.forEach(char => {
                  constructedContent += `## ${char.character_name}\n\n`;
                  
                  if (char.description) {
                    constructedContent += `### CHARACTER DESCRIPTION\n${char.description}\n\n`;
                  }
                  
                  if (char.background) {
                    constructedContent += `### BACKGROUND\n${char.background}\n\n`;
                  }
                  
                  if (char.relationships && char.relationships.length > 0) {
                    constructedContent += `### RELATIONSHIPS\n`;
                    char.relationships.forEach((rel: any) => {
                      if (rel.character && rel.description) {
                        constructedContent += `**${rel.character}**: ${rel.description}\n\n`;
                      }
                    });
                  }
                  
                  if (char.secrets && char.secrets.length > 0) {
                    constructedContent += `### SECRETS\n${char.secrets.join('\n\n')}\n\n`;
                  }
                });
              }
            }
            
            // 3. Add clues/evidence if available
            if (data.evidence_cards && data.evidence_cards.length > 0) {
              constructedContent += `# CLUES AND EVIDENCE\n\n`;
              if (debugMode) console.log(`Found ${data.evidence_cards.length} evidence cards`);
              
              data.evidence_cards.forEach((card: any, index: number) => {
                if (card.content) {
                  constructedContent += `## EVIDENCE ${index + 1}: ${card.title || 'Item'}\n\n${card.content}\n\n`;
                }
              });
            } else if (data.detective_script && data.detective_script.length > 10) {
              // Add detective script as an alternative source of clues
              constructedContent += `# CLUES AND EVIDENCE\n\n${data.detective_script}\n\n`;
              if (debugMode) console.log("Added detective script as clues");
            }
            
            // 4. Add printable materials section
            constructedContent += `# PRINTABLE MATERIALS\n\n`;
            constructedContent += `## Name Tags\n\nPrint name tags for each character using card stock or sticker paper.\n\n`;
            constructedContent += `## Evidence Cards\n\nPrint the evidence cards on card stock and cut them out.\n\n`;
            
            // Use this constructed content if it's substantial, otherwise fall back to existing content
            if (constructedContent.length > 100) {
              if (debugMode) console.log("Using constructed content, length:", constructedContent.length);
              setCompleteContent(constructedContent);
            } else if (data.content && data.content.length > 100) {
              if (debugMode) console.log("Using original content from database");
              setCompleteContent(data.content);
            }
            
            // For debugging
            if (debugMode) {
              console.log("Content construction results:");
              console.log("- Host guide length:", data.host_guide?.length || 0);
              console.log("- Evidence cards:", data.evidence_cards?.length || 0);
              console.log("- Constructed content length:", constructedContent.length);
              console.log("- Original content length:", data.content?.length || 0);
              console.log("- Final content used length:", 
                constructedContent.length > 100 ? constructedContent.length : data.content?.length || 0);
            }
          }
          
          // Also fetch the conversation title
          const { data: convData } = await supabase
            .from("conversations")
            .select("title")
            .eq("id", conversationId)
            .single();
            
          if (convData && convData.title) {
            setTitle(convData.title);
          }
        } catch (err) {
          console.error("Error fetching mystery content:", err);
        }
      };
      
      fetchFullContent();
    } else {
      setCompleteContent(packageContent);
    }
  }, [conversationId, packageContent, debugMode]);
  
  // Parse the different sections from the package content
  const sections = {
    hostGuide: extractSection(completeContent, "Host Guide"),
    characters: extractSection(completeContent, "Character"),
    clues: extractSection(completeContent, "Clue"),
    materials: extractSection(completeContent, "Printable Material"),
  };
  
  // If debug mode is enabled, log the extracted sections
  useEffect(() => {
    if (debugMode) {
      console.log("Extracted sections:");
      console.log("- Host Guide length:", sections.hostGuide?.length || 0);
      console.log("- Characters length:", sections.characters?.length || 0);
      console.log("- Clues length:", sections.clues?.length || 0);
      console.log("- Materials length:", sections.materials?.length || 0);
      console.log("Total content length:", completeContent?.length || 0);
    }
  }, [sections, completeContent, debugMode]);
  
  function extractSection(content: string, sectionName: string): string {
    if (!content) return "";
    
    // Enhanced section extraction with fallback patterns
    const patterns = [
      new RegExp(`# ${sectionName.toUpperCase()}S?[^#]*(?=# |$)`, 'is'),
      new RegExp(`# ${sectionName}S?[^#]*(?=# |$)`, 'is'),
      new RegExp(`# .* ${sectionName}[^#]*(?=# |$)`, 'is'),
      new RegExp(`## ${sectionName}[^#]*(?=##|# |$)`, 'is'),
      new RegExp(`${sectionName}[^#]*(?=# |$)`, 'is')
    ];
    
    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[0]) {
        return match[0].trim();
      }
    }
    
    // Additional fallback for character sections
    if (sectionName === "Character") {
      const characterSections = [];
      let characterPattern = /# ([^-\n]+) - CHARACTER GUIDE\n([\s\S]*?)(?=# \w+ - CHARACTER GUIDE|# |$)/g;
      let match;
      
      while ((match = characterPattern.exec(content)) !== null) {
        characterSections.push(`# ${match[1]} - CHARACTER GUIDE\n${match[2]}`);
      }
      
      if (characterSections.length > 0) {
        return characterSections.join('\n\n');
      }
      
      // Try for just CHARACTERS section
      const charactersSection = content.match(/# CHARACTERS\s*\n([\s\S]*?)(?=# |$)/i);
      if (charactersSection && charactersSection[0]) {
        return charactersSection[0];
      }
      
      // Try for character sections with ## headers
      const charSections = [];
      const charHeaderPattern = /## ([^\n]+)\n([\s\S]*?)(?=## |# |$)/g;
      let charMatch;
      
      while ((charMatch = charHeaderPattern.exec(content)) !== null) {
        if (charMatch[1].includes("CHARACTER") || !charMatch[1].includes(":")) {
          charSections.push(`## ${charMatch[1]}\n${charMatch[2]}`);
        }
      }
      
      if (charSections.length > 0) {
        return `# CHARACTERS\n\n${charSections.join('\n\n')}`;
      }
    }
    
    // Additional fallback for clues/evidence sections
    if (sectionName === "Clue") {
      const evidencePattern = /# (EVIDENCE|CLUES AND EVIDENCE)[^#]*(?=# |$)/is;
      const cluesPattern = /# CLUES[^#]*(?=# |$)/is;
      
      const evidenceMatch = content.match(evidencePattern);
      const cluesMatch = content.match(cluesPattern);
      
      if (evidenceMatch && evidenceMatch[0]) {
        return evidenceMatch[0].trim();
      }
      
      if (cluesMatch && cluesMatch[0]) {
        return cluesMatch[0].trim();
      }
      
      // Look for evidence items with ## headers
      const evidenceItems = [];
      const evidenceItemPattern = /## (EVIDENCE \d+|CLUE \d+)[^\n]*\n([\s\S]*?)(?=## |# |$)/gi;
      let evidenceItemMatch;
      
      while ((evidenceItemMatch = evidenceItemPattern.exec(content)) !== null) {
        evidenceItems.push(`## ${evidenceItemMatch[1]}\n${evidenceItemMatch[2]}`);
      }
      
      if (evidenceItems.length > 0) {
        return `# CLUES AND EVIDENCE\n\n${evidenceItems.join('\n\n')}`;
      }
    }
    
    // Host Guide fallbacks
    if (sectionName === "Host Guide") {
      const hostPattern = /# HOST GUIDE\s*\n([\s\S]*?)(?=# |$)/i;
      const setupPattern = /# SETUP\s*\n([\s\S]*?)(?=# |$)/i;
      const guidePattern = /# GUIDE\s*\n([\s\S]*?)(?=# |$)/i;
      
      for (const pattern of [hostPattern, setupPattern, guidePattern]) {
        const match = content.match(pattern);
        if (match && match[0]) {
          return match[0].trim();
        }
      }
    }
    
    // Materials fallbacks
    if (sectionName === "Printable Material") {
      const materialsPattern = /# (PRINTABLE )?MATERIALS\s*\n([\s\S]*?)(?=# |$)/i;
      const printablesPattern = /# PRINTABLES\s*\n([\s\S]*?)(?=# |$)/i;
      
      for (const pattern of [materialsPattern, printablesPattern]) {
        const match = content.match(pattern);
        if (match && match[0]) {
          return match[0].trim();
        }
      }
    }
    
    return "";
  }
  
  const getTabContent = (section: string, sectionKey: keyof typeof sections) => {
    if (!sections[sectionKey] && isGenerating) {
      const isInProgress = generationStatus?.sections?.[sectionKey] === false;
      const isComplete = generationStatus?.sections?.[sectionKey] === true;
      
      if (isComplete) {
        return "Processing completed content...";
      } else if (isInProgress) {
        return `Generating ${section}...`;
      } else {
        return `Waiting to generate ${section}...`;
      }
    }
    
    // If no specific section content is found but we have packageContent, 
    // show the full content in the first tab as a fallback
    if (!sections[sectionKey] && completeContent && sectionKey === "hostGuide") {
      return completeContent;
    }
    
    return sections[sectionKey] || `${section} content will appear here.`;
  };
  
  const handleDownloadPDF = () => {
    // PDF download functionality would be implemented here
    console.log("Download PDF requested");
  };
  
  return (
    <Card>
      {title && (
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{title}</CardTitle>
        </CardHeader>
      )}
      
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
            <ReactMarkdown>{getTabContent("Host Guide", "hostGuide")}</ReactMarkdown>
          </TabsContent>
          
          <TabsContent value="characters" className="prose prose-gray dark:prose-invert max-w-none">
            <ReactMarkdown>{getTabContent("Character Information", "characters")}</ReactMarkdown>
          </TabsContent>
          
          <TabsContent value="clues" className="prose prose-gray dark:prose-invert max-w-none">
            <ReactMarkdown>{getTabContent("Clues and Evidence", "clues")}</ReactMarkdown>
          </TabsContent>
          
          <TabsContent value="materials" className="prose prose-gray dark:prose-invert max-w-none">
            <ReactMarkdown>{getTabContent("Printable Materials", "materials")}</ReactMarkdown>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MysteryPackageTabView;
