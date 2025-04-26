
import React, { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Book, Users, FileText, Printer, Download } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { GenerationStatus } from "@/services/mysteryPackageService";

export interface MysteryPackageTabViewProps {
  packageContent: string;
  mysteryTitle: string;
  generationStatus?: GenerationStatus;
  isGenerating?: boolean;
}

const MysteryPackageTabView: React.FC<MysteryPackageTabViewProps> = ({
  packageContent,
  mysteryTitle,
  generationStatus,
  isGenerating
}) => {
  const [activeTab, setActiveTab] = useState("host-guide");
  
  // Parse the different sections from the package content
  const sections = {
    hostGuide: extractSection(packageContent, "Host Guide"),
    characters: extractSection(packageContent, "Character"),
    clues: extractSection(packageContent, "Clue"),
    materials: extractSection(packageContent, "Printable Material"),
  };
  
  function extractSection(content: string, sectionName: string): string {
    // This is a simple extraction - could be improved with regex based on actual content structure
    const sectionIndex = content.indexOf(`# ${sectionName}`);
    if (sectionIndex === -1) return "";
    
    const nextSectionIndex = content.indexOf("# ", sectionIndex + 2);
    if (nextSectionIndex === -1) {
      return content.substring(sectionIndex);
    }
    
    return content.substring(sectionIndex, nextSectionIndex);
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
    
    return sections[sectionKey] || `${section} content will appear here.`;
  };
  
  return (
    <Card>
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
            
            <Button variant="outline" size="sm" className="hidden sm:flex items-center gap-2">
              <Download className="h-4 w-4" />
              <span>Download PDF</span>
            </Button>
          </div>
          
          <div className="sm:hidden flex justify-end mb-4">
            <Button variant="outline" size="sm" className="flex items-center gap-2">
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
