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
  
  useEffect(() => {
    if (conversationId) {
      // If we have a conversation ID but empty content, fetch from the database
      const fetchFullContent = async () => {
        try {
          const { data, error } = await supabase
            .from("mystery_packages")
            .select("id, content, host_guide, conversation_id") // Added 'id' to the select list
            .eq("conversation_id", conversationId)
            .single();
            
          if (data) {
            if (data.content && data.content.length > 100) {
              setCompleteContent(data.content);
            } else if (data.host_guide) {
              // If content is empty but we have host_guide, construct content
              let constructedContent = `# HOST GUIDE\n\n${data.host_guide}\n\n`;
              
              // Fetch characters data if available
              const { data: charactersData } = await supabase
                .from("mystery_characters")
                .select("*")
                .eq("package_id", data.id);
                
              if (charactersData && charactersData.length > 0) {
                constructedContent += `# CHARACTERS\n\n`;
                charactersData.forEach(char => {
                  constructedContent += `## ${char.character_name}\n\n${char.description || ''}\n\n${char.background || ''}\n\n`;
                });
              }
              
              setCompleteContent(constructedContent);
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
  }, [conversationId, packageContent]);
  
  // Parse the different sections from the package content
  const sections = {
    hostGuide: extractSection(completeContent, "Host Guide"),
    characters: extractSection(completeContent, "Character"),
    clues: extractSection(completeContent, "Clue"),
    materials: extractSection(completeContent, "Printable Material"),
  };
  
  function extractSection(content: string, sectionName: string): string {
    if (!content) return "";
    
    // Enhanced section extraction with fallback patterns
    const patterns = [
      new RegExp(`# .* ${sectionName}[^#]*(?=# |$)`, 'is'),
      new RegExp(`# ${sectionName}[^#]*(?=# |$)`, 'is'),
      new RegExp(`## ${sectionName}[^#]*(?=## |# |$)`, 'is'),
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
      if (charactersSection && charactersSection[1]) {
        return `# CHARACTERS\n${charactersSection[1]}`;
      }
    }
    
    // Additional fallback for clues/evidence sections
    if (sectionName === "Clue") {
      const evidencePattern = /# EVIDENCE[^#]*(?=# |$)/is;
      const cluesPattern = /# CLUES[^#]*(?=# |$)/is;
      
      const evidenceMatch = content.match(evidencePattern);
      const cluesMatch = content.match(cluesPattern);
      
      if (evidenceMatch && evidenceMatch[0]) {
        return evidenceMatch[0].trim();
      }
      
      if (cluesMatch && cluesMatch[0]) {
        return cluesMatch[0].trim();
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
      const materialsPattern = /# MATERIALS\s*\n([\s\S]*?)(?=# |$)/i;
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
