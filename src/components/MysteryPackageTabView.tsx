import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Download, Mail, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import SendToGuestsDialog from "@/components/SendToGuestsDialog";

interface MysteryPackageTabViewProps {
  packageContent: string;
  mysteryTitle: string;
}

const MysteryPackageTabView = ({ packageContent, mysteryTitle }: MysteryPackageTabViewProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [sendToGuestsOpen, setSendToGuestsOpen] = useState(false);

  // Parse the package content sections
  const sections = parsePackageContent(packageContent);
  
  // Extract character list for SendToGuests dialog
  const characters = extractCharacters(packageContent);

  const handleDownloadText = () => {
    const blob = new Blob([packageContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mysteryTitle.replace(/\s+/g, '_')}_murder_mystery.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Text file downloaded successfully");
  };

  const handleDownloadPDF = () => {
    toast.info("PDF generation will be implemented soon!");
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>${mysteryTitle} - Murder Mystery</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 20px; }
              h1, h2, h3 { margin-top: 20px; }
              pre { white-space: pre-wrap; }
            </style>
          </head>
          <body>
            <pre>${packageContent}</pre>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    } else {
      toast.error("Unable to open print window. Please check your popup blocker.");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">{mysteryTitle}</h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownloadText}>
            <FileText className="h-4 w-4 mr-2" />
            Text
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSendToGuestsOpen(true)}>
            <Mail className="h-4 w-4 mr-2" />
            Email to Guests
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="host">Host Guide</TabsTrigger>
          <TabsTrigger value="characters">Characters</TabsTrigger>
          <TabsTrigger value="clues">Clues & Evidence</TabsTrigger>
          <TabsTrigger value="solution">Solution</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="p-4 border rounded-md mt-4">
          <div className="prose max-w-none">
            <h2>Murder Mystery Overview</h2>
            {sections.overview ? (
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(sections.overview) }} />
            ) : (
              <p>No overview available.</p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="host" className="p-4 border rounded-md mt-4">
          <div className="prose max-w-none">
            <h2>Host Guide</h2>
            {sections.host ? (
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(sections.host) }} />
            ) : (
              <p>No host guide available.</p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="characters" className="p-4 border rounded-md mt-4">
          <div className="prose max-w-none">
            <h2>Character Guides</h2>
            {sections.characters ? (
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(sections.characters) }} />
            ) : (
              <p>No character guides available.</p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="clues" className="p-4 border rounded-md mt-4">
          <div className="prose max-w-none">
            <h2>Clues & Evidence</h2>
            {sections.clues ? (
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(sections.clues) }} />
            ) : (
              <p>No clues and evidence available.</p>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="solution" className="p-4 border rounded-md mt-4">
          <div className="prose max-w-none">
            <h2>Solution</h2>
            {sections.solution ? (
              <div dangerouslySetInnerHTML={{ __html: markdownToHtml(sections.solution) }} />
            ) : (
              <p>No solution available.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <SendToGuestsDialog 
        open={sendToGuestsOpen} 
        onOpenChange={setSendToGuestsOpen} 
        characters={characters}
      />
    </div>
  );
};

// Helper function to parse the package content into sections
function parsePackageContent(content: string) {
  const sections = {
    overview: '',
    host: '',
    characters: '',
    clues: '',
    solution: ''
  };
  
  // Extract overview section
  const overviewMatch = content.match(/# .+?\n\n([\s\S]*?)(?=\n## Host Guide|\n## Character|$)/i);
  if (overviewMatch) {
    sections.overview = overviewMatch[1].trim();
  }
  
  // Extract host guide section
  const hostMatch = content.match(/## Host Guide\n\n([\s\S]*?)(?=\n## Character|$)/i);
  if (hostMatch) {
    sections.host = hostMatch[1].trim();
  }
  
  // Extract characters section
  const charactersMatch = content.match(/## Character.*?\n\n([\s\S]*?)(?=\n## (?!Character)|$)/i);
  if (charactersMatch) {
    sections.characters = charactersMatch[1].trim();
  }
  
  // Extract clues section
  const cluesMatch = content.match(/## (?:Clues|Evidence|Props).*?\n\n([\s\S]*?)(?=\n## (?!Clue|Evidence|Prop)|$)/i);
  if (cluesMatch) {
    sections.clues = cluesMatch[1].trim();
  }
  
  // Extract solution section
  const solutionMatch = content.match(/## (?:Solution|Resolution).*?\n\n([\s\S]*?)(?=\n## (?!Solution|Resolution)|$)/i);
  if (solutionMatch) {
    sections.solution = solutionMatch[1].trim();
  }
  
  return sections;
}

// Helper function to extract character list
function extractCharacters(content: string) {
  const characters: {name: string, role: string, description: string}[] = [];
  
  // Look for character sections in the content
  const characterBlocks = content.match(/\*\*([^*]+)\*\*\s*(?:-\s*)?([^\n]+)?/g) || [];
  
  characterBlocks.forEach(block => {
    const match = block.match(/\*\*([^*]+)\*\*\s*(?:-\s*)?([^\n]+)?/);
    if (match) {
      const name = match[1].trim();
      const role = match[2]?.trim() || 'Character';
      const description = 'A character in the murder mystery.';
      
      // Only include if it looks like a character name (not a section header)
      if (name.length < 50 && !name.includes('Host Guide') && !name.includes('Evidence')) {
        characters.push({
          name,
          role,
          description
        });
      }
    }
  });
  
  return characters;
}

// Simple markdown to HTML converter
function markdownToHtml(markdown: string) {
  return markdown
    .replace(/## ([^\n]+)/g, '<h2>$1</h2>')
    .replace(/### ([^\n]+)/g, '<h3>$1</h3>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/<li>(.+)<\/li>/g, function(match) {
      return match.replace(/\n/g, ' ');
    })
    .replace(/(<li>.*?<\/li>)\n(<li>)/g, '$1$2')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

export default MysteryPackageTabView;
