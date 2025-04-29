
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
  const [debugMode] = useState(true); // Keep debug mode enabled for troubleshooting
  const [sectionContent, setSectionContent] = useState({
    hostGuide: '',
    characters: '',
    clues: '',
    materials: ''
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (conversationId) {
      // If we have a conversation ID but empty content, fetch from the database
      const fetchFullContent = async () => {
        try {
          setLoading(true);
          if (debugMode) console.log("Fetching content for conversation ID:", conversationId);
          
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
            if (debugMode) {
              console.log("Fetched data:", {
                contentLength: data.content?.length || 0,
                hostGuideLength: data.host_guide?.length || 0,
                evidenceCards: data.evidence_cards?.length || 0,
                detectiveScriptLength: data.detective_script?.length || 0,
                hasId: !!data.id
              });
            }
            
            // Initialize our constructed content with proper markdown sections
            let constructedContent = "";
            let hostGuideContent = "";
            let charactersContent = "";
            let cluesContent = "";
            let materialsContent = "";
            
            // 1. Add Host Guide if available
            if (data.host_guide && data.host_guide.length > 10) {
              hostGuideContent = `# HOST GUIDE\n\n${data.host_guide}\n\n`;
              constructedContent += hostGuideContent;
              if (debugMode) console.log("Added host guide to content, length:", hostGuideContent.length);
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
                charactersContent = `# CHARACTERS\n\n`;
                if (debugMode) console.log(`Found ${charactersData.length} characters`);
                
                for (const char of charactersData) {
                  charactersContent += `## ${char.character_name}\n\n`;
                  
                  if (char.description) {
                    charactersContent += `### CHARACTER DESCRIPTION\n${char.description}\n\n`;
                  }
                  
                  if (char.background) {
                    charactersContent += `### BACKGROUND\n${char.background}\n\n`;
                  }
                  
                  // Format relationships properly
                  if (Array.isArray(char.relationships) && char.relationships.length > 0) {
                    charactersContent += `### RELATIONSHIPS\n`;
                    
                    for (const rel of char.relationships) {
                      if (typeof rel === 'object' && rel.character && rel.description) {
                        charactersContent += `**${rel.character}**: ${rel.description}\n\n`;
                      }
                    }
                  }
                  
                  // Format secrets properly
                  if (Array.isArray(char.secrets) && char.secrets.length > 0) {
                    charactersContent += `### SECRETS\n`;
                    
                    for (const secret of char.secrets) {
                      if (typeof secret === 'string' && secret.trim()) {
                        charactersContent += `${secret}\n\n`;
                      }
                    }
                  }
                  
                  // Add any round scripts if available
                  if (char.round_scripts && typeof char.round_scripts === 'object') {
                    charactersContent += `### SCRIPT NOTES\n`;
                    
                    // Format introduction scripts
                    if (char.round_scripts.introduction) {
                      charactersContent += `**Introduction**: "${char.round_scripts.introduction}"\n\n`;
                    }
                    
                    // Format final statements
                    if (char.round_scripts.final) {
                      if (char.round_scripts.final.innocent) {
                        charactersContent += `**If innocent**: "${char.round_scripts.final.innocent}"\n\n`;
                      }
                      if (char.round_scripts.final.guilty) {
                        charactersContent += `**If guilty**: "${char.round_scripts.final.guilty}"\n\n`;
                      }
                      if (char.round_scripts.final.accomplice) {
                        charactersContent += `**If accomplice**: "${char.round_scripts.final.accomplice}"\n\n`;
                      }
                    }
                  }
                  
                  // Add a separator between characters
                  charactersContent += `\n---\n\n`;
                }
                
                // Remove the last separator
                charactersContent = charactersContent.replace(/\n---\n\n$/, '\n\n');
                
                constructedContent += charactersContent;
                if (debugMode) console.log("Added characters content, length:", charactersContent.length);
              }
            }
            
            // 3. Add clues/evidence if available
            if (Array.isArray(data.evidence_cards) && data.evidence_cards.length > 0) {
              cluesContent = `# CLUES AND EVIDENCE\n\n`;
              if (debugMode) console.log(`Found ${data.evidence_cards.length} evidence cards`);
              
              data.evidence_cards.forEach((card, index) => {
                if (card && typeof card === 'object' && card.content) {
                  const title = card.title || `Item ${index + 1}`;
                  cluesContent += `## EVIDENCE ${index + 1}: ${title}\n\n${card.content}\n\n`;
                }
              });
              
              constructedContent += cluesContent;
              if (debugMode) console.log("Added clues content, length:", cluesContent.length);
            } else if (data.detective_script && data.detective_script.length > 10) {
              // Add detective script as an alternative source of clues
              cluesContent = `# CLUES AND EVIDENCE\n\n${data.detective_script}\n\n`;
              constructedContent += cluesContent;
              if (debugMode) console.log("Added detective script as clues, length:", cluesContent.length);
            }
            
            // 4. Add printable materials section
            materialsContent = `# PRINTABLE MATERIALS\n\n`;
            materialsContent += `## Name Tags\n\nPrint name tags for each character using card stock or sticker paper.\n\n`;
            materialsContent += `## Evidence Cards\n\nPrint the evidence cards on card stock and cut them out.\n\n`;
            
            constructedContent += materialsContent;
            if (debugMode) console.log("Added materials content, length:", materialsContent.length);
            
            // Use this constructed content if it's substantial, otherwise fall back to existing content
            if (constructedContent.length > 100) {
              if (debugMode) console.log("Using constructed content, length:", constructedContent.length);
              setCompleteContent(constructedContent);
              
              // Set each section directly without extraction
              setSectionContent({
                hostGuide: hostGuideContent,
                characters: charactersContent,
                clues: cluesContent,
                materials: materialsContent
              });
            } else if (data.content && data.content.length > 100) {
              if (debugMode) console.log("Using original content from database, length:", data.content.length);
              setCompleteContent(data.content);
              
              // Extract sections from the original content
              const extractedSections = {
                hostGuide: extractSection(data.content, "Host Guide"),
                characters: extractSection(data.content, "Character"),
                clues: extractSection(data.content, "Clue"),
                materials: extractSection(data.content, "Printable Material")
              };
              
              setSectionContent(extractedSections);
              
              if (debugMode) {
                console.log("Extracted section lengths:", {
                  hostGuide: extractedSections.hostGuide.length,
                  characters: extractedSections.characters.length,
                  clues: extractedSections.clues.length,
                  materials: extractedSections.materials.length
                });
              }
            }
            
            // For debugging
            if (debugMode) {
              console.log("Content construction results:");
              console.log("- Host guide length:", hostGuideContent.length);
              console.log("- Characters length:", charactersContent.length);
              console.log("- Clues length:", cluesContent.length);
              console.log("- Materials length:", materialsContent.length);
              console.log("- Total constructed content length:", constructedContent.length);
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
        } finally {
          setLoading(false);
        }
      };
      
      fetchFullContent();
    } else {
      // No conversation ID, use provided package content and extract sections
      setCompleteContent(packageContent);
      
      const extractedSections = {
        hostGuide: extractSection(packageContent, "Host Guide"),
        characters: extractSection(packageContent, "Character"),
        clues: extractSection(packageContent, "Clue"),
        materials: extractSection(packageContent, "Printable Material")
      };
      
      setSectionContent(extractedSections);
      setLoading(false);
      
      if (debugMode) {
        console.log("Using provided package content, length:", packageContent.length);
        console.log("Extracted section lengths:", {
          hostGuide: extractedSections.hostGuide.length,
          characters: extractedSections.characters.length,
          clues: extractedSections.clues.length,
          materials: extractedSections.materials.length
        });
      }
    }
  }, [conversationId, packageContent, debugMode]);
  
  // Enhanced section extraction with multiple fallback patterns
  function extractSection(content: string, sectionName: string): string {
    if (!content) return "";
    
    if (debugMode) {
      console.log(`Extracting section: ${sectionName}`);
      console.log(`Content length: ${content.length}`);
      console.log(`First 100 chars: ${content.substring(0, 100)}`);
    }
    
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
        if (debugMode) console.log(`Found match with pattern: ${pattern}`);
        return match[0].trim();
      }
    }
    
    // Additional fallbacks for specific section types
    
    // Additional fallback for character sections
    if (sectionName === "Character") {
      const characterSections = [];
      let characterPattern = /# ([^-\n]+) - CHARACTER GUIDE\n([\s\S]*?)(?=# \w+ - CHARACTER GUIDE|# |$)/g;
      let match;
      
      while ((match = characterPattern.exec(content)) !== null) {
        characterSections.push(`# ${match[1]} - CHARACTER GUIDE\n${match[2]}`);
      }
      
      if (characterSections.length > 0) {
        if (debugMode) console.log(`Found ${characterSections.length} character sections with special pattern`);
        return characterSections.join('\n\n');
      }
      
      // Try for just CHARACTERS section
      const charactersSection = content.match(/# CHARACTERS\s*\n([\s\S]*?)(?=# |$)/i);
      if (charactersSection && charactersSection[0]) {
        if (debugMode) console.log("Found CHARACTERS section with direct pattern");
        return charactersSection[0];
      }
      
      // Try for character sections with ## headers
      const charSections = [];
      const charHeaderPattern = /## ([^\n]+)\n([\s\S]*?)(?=## |# |$)/g;
      let charMatch;
      
      while ((charMatch = charHeaderPattern.exec(content)) !== null) {
        if (
          charMatch[1].includes("CHARACTER") || 
          !charMatch[1].includes(":") || 
          !/EVIDENCE|CLUE|PRINTABLE|HOST|GUIDE/i.test(charMatch[1])
        ) {
          charSections.push(`## ${charMatch[1]}\n${charMatch[2]}`);
        }
      }
      
      if (charSections.length > 0) {
        if (debugMode) console.log(`Found ${charSections.length} character sections with ## pattern`);
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
        if (debugMode) console.log("Found EVIDENCE section with pattern");
        return evidenceMatch[0].trim();
      }
      
      if (cluesMatch && cluesMatch[0]) {
        if (debugMode) console.log("Found CLUES section with pattern");
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
        if (debugMode) console.log(`Found ${evidenceItems.length} evidence items with ## pattern`);
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
          if (debugMode) console.log(`Found host guide with pattern: ${pattern}`);
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
          if (debugMode) console.log(`Found materials with pattern: ${pattern}`);
          return match[0].trim();
        }
      }
    }
    
    if (debugMode) console.log(`No matching section found for ${sectionName}`);
    return "";
  }
  
  const getTabContent = (section: string, sectionKey: keyof typeof sectionContent) => {
    // First check if we've already extracted this section
    if (sectionContent[sectionKey] && sectionContent[sectionKey].length > 0) {
      return sectionContent[sectionKey];
    }
    
    // If not extracted but generation is in progress
    if (isGenerating) {
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
    
    // If we have complete content but no extracted section, try to extract it again
    if (completeContent && completeContent.length > 0) {
      const extractedContent = extractSection(completeContent, section);
      if (extractedContent && extractedContent.length > 0) {
        return extractedContent;
      }
      
      // If this is the first tab and we have content but no extracted host guide,
      // just show the complete content
      if (sectionKey === "hostGuide") {
        return completeContent;
      }
    }
    
    // Default fallback message
    return loading 
      ? `Loading ${section.toLowerCase()} content...` 
      : `${section} content will appear here.`;
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
            <ReactMarkdown>{getTabContent("Character", "characters")}</ReactMarkdown>
          </TabsContent>
          
          <TabsContent value="clues" className="prose prose-gray dark:prose-invert max-w-none">
            <ReactMarkdown>{getTabContent("Clue", "clues")}</ReactMarkdown>
          </TabsContent>
          
          <TabsContent value="materials" className="prose prose-gray dark:prose-invert max-w-none">
            <ReactMarkdown>{getTabContent("Printable Material", "materials")}</ReactMarkdown>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MysteryPackageTabView;
