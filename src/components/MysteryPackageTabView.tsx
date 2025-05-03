
import React, { useState, useEffect, useRef } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Download, FileText, Loader2, RefreshCw, Play } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from 'react-markdown';
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  generateCompletePackage, 
  getPackageGenerationStatus, 
  toggleTestMode, 
  getTestModeEnabled 
} from "@/services/mysteryPackageService";

interface MysteryPackageTabViewProps {
  packageContent: string | null;
  mysteryTitle: string;
  generationStatus?: any;
  isGenerating?: boolean;
  conversationId?: string | null;
}

const MysteryPackageTabView: React.FC<MysteryPackageTabViewProps> = ({
  packageContent,
  mysteryTitle,
  generationStatus,
  isGenerating = false,
  conversationId
}) => {
  const [activeTab, setActiveTab] = useState("host-guide");
  const [testMode, setTestMode] = useState<boolean>(false);
  const [generating, setGenerating] = useState(isGenerating);
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [statusCheckInterval, setStatusCheckInterval] = useState<number | null>(null);
  const [sections, setSections] = useState<any>({
    hostGuide: false,
    characters: false,
    clues: false
  });
  const [content, setContent] = useState<string>(packageContent || "");
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [tabsWithContent, setTabsWithContent] = useState<string[]>([]);
  const packageReadyNotified = useRef<boolean>(false);
  
  // Sections of the markdown content for each tab
  const hostGuide = extractSection(content, "HOST GUIDE", "CHARACTER");
  const characterGuides = extractCharacters(content);
  const clues = extractSection(content, "CLUES AND EVIDENCE", "SOLUTION");
  const solution = extractSection(content, "SOLUTION", "PRINTABLE MATERIALS");
  const printableMaterials = extractSection(content, "PRINTABLE MATERIALS", "END");
  
  // Effect for checking which tabs have content
  useEffect(() => {
    const availableTabs = [];
    if (hostGuide.trim()) availableTabs.push("host-guide");
    if (characterGuides.length > 0) availableTabs.push("characters");
    if (clues.trim()) availableTabs.push("clues");
    if (solution.trim()) availableTabs.push("solution");
    if (printableMaterials.trim()) availableTabs.push("materials");
    
    setTabsWithContent(availableTabs);
    
    // Set to first available tab if current tab has no content
    if (availableTabs.length > 0 && !availableTabs.includes(activeTab)) {
      setActiveTab(availableTabs[0]);
    }
  }, [content, activeTab]);

  // Check generation status periodically while generating
  useEffect(() => {
    if (!conversationId) return;
    
    const checkStatus = async () => {
      try {
        const status = await getPackageGenerationStatus(conversationId);
        setProgress(status.progress || 0);
        setCurrentStep(status.currentStep || "");
        setSections(status.sections || {
          hostGuide: false,
          characters: false,
          clues: false
        });
        setLastUpdate(new Date());
        
        // Update content if we have it
        if (status.content && status.content !== content) {
          setContent(status.content);
        }
        
        if (status.status === 'completed') {
          setGenerating(false);
          clearStatusPolling();
          if (!packageReadyNotified.current) {
            toast.success("Your mystery package is ready!");
            packageReadyNotified.current = true;
          }
        } else if (status.status === 'failed') {
          setGenerating(false);
          clearStatusPolling();
          toast.error("There was an issue generating your package");
        }
      } catch (error) {
        console.error("Error checking generation status:", error);
      }
    };
    
    // Initial check
    if (generating && conversationId) {
      checkStatus();
      
      // Start polling
      const intervalId = window.setInterval(checkStatus, 3000);
      setStatusCheckInterval(intervalId);
      
      return () => {
        if (intervalId) clearInterval(intervalId);
      };
    }
    
    return () => {
      if (statusCheckInterval) clearInterval(statusCheckInterval);
    };
  }, [conversationId, generating]);
  
  // Get test mode setting on mount
  useEffect(() => {
    setTestMode(getTestModeEnabled());
  }, []);

  const clearStatusPolling = () => {
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      setStatusCheckInterval(null);
    }
  };

  const handleGeneratePackage = async () => {
    if (!conversationId) {
      toast.error("Mystery ID is missing");
      return;
    }
    
    try {
      setGenerating(true);
      packageReadyNotified.current = false;
      
      toast.info(
        <div className="space-y-2">
          <div className="font-semibold">Generating your murder mystery</div>
          <p className="text-sm">This will take about 5-10 minutes. Please keep this browser tab open.</p>
        </div>
      );
      
      // Start generation
      const initialContent = await generateCompletePackage(conversationId, testMode);
      setContent(initialContent);
      
      // Set up polling for status updates
      const status = await getPackageGenerationStatus(conversationId);
      setProgress(status.progress || 0);
      setCurrentStep(status.currentStep || "");
      setSections(status.sections || {});
      setLastUpdate(new Date());
      
    } catch (error: any) {
      console.error("Error starting package generation:", error);
      setGenerating(false);
      toast.error(error.message || "Failed to start generation");
    }
  };

  const handleTestModeChange = (enabled: boolean) => {
    setTestMode(enabled);
    toggleTestMode(enabled);
  };

  const handleDownloadText = () => {
    if (!content) return;
    
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mysteryTitle.replace(/\s+/g, '_')}_murder_mystery.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast.success("Download started");
  };

  const handleDownloadPDF = () => {
    toast.info("PDF generation will be implemented soon!");
  };
  
  const renderPlaceholderContent = (tabName: string) => {
    const isGeneratingThis = generating && (
      (tabName === "host-guide" && progress < 30) ||
      (tabName === "characters" && progress >= 30 && progress < 60) ||
      (tabName === "clues" && progress >= 60 && progress < 90)
    );
    
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
        {isGeneratingThis ? (
          <>
            <div className="animate-pulse">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Generating {tabName.replace('-', ' ')}...</h3>
              <p className="text-muted-foreground mt-1">
                Please wait while we create this section for you
              </p>
            </div>
          </>
        ) : !generating ? (
          <>
            <FileText className="h-10 w-10 text-muted-foreground" />
            <div>
              <h3 className="text-lg font-medium">No content yet</h3>
              <p className="text-muted-foreground mt-1">
                Click the Generate button to create your mystery
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="opacity-50">
              <FileText className="h-10 w-10" />
            </div>
            <div>
              <h3 className="text-lg font-medium">Coming soon</h3>
              <p className="text-muted-foreground mt-1">
                This section will be generated shortly
              </p>
            </div>
          </>
        )}
      </div>
    );
  };

  function extractSection(content: string, startSection: string, endSection: string): string {
    if (!content) return "";
    
    const startPattern = new RegExp(`#+\\s*.*${startSection}.*\\n`);
    const endPattern = new RegExp(`#+\\s*.*${endSection}.*\\n`);
    
    const startMatch = content.match(startPattern);
    if (!startMatch) return "";
    
    const startIndex = startMatch.index;
    if (startIndex === undefined) return "";
    
    const endMatch = content.slice(startIndex).match(endPattern);
    const endIndex = endMatch ? startIndex + endMatch.index : content.length;
    
    return content.slice(startIndex, endIndex);
  }

  function extractCharacters(content: string): { name: string, content: string }[] {
    if (!content) return [];
    
    const characters: { name: string, content: string }[] = [];
    const characterPattern = /#+\s*(.*)\s*-\s*CHARACTER GUIDE\s*\n([\s\S]*?)(?=#+\s*.*\s*-\s*CHARACTER GUIDE|#+\s*CLUES AND EVIDENCE|#+\s*SOLUTION|#+\s*PRINTABLE MATERIALS|$)/g;
    
    let match;
    while ((match = characterPattern.exec(content)) !== null) {
      const name = match[1].trim();
      const characterContent = match[0];
      characters.push({ name, content: characterContent });
    }
    
    return characters;
  }

  const renderCharacterTabs = () => {
    if (characterGuides.length === 0) {
      return renderPlaceholderContent("characters");
    }
    
    return (
      <Tabs defaultValue={characterGuides.length > 0 ? characterGuides[0].name : ""} className="w-full">
        <TabsList className="mb-4 flex flex-wrap">
          {characterGuides.map((character, index) => (
            <TabsTrigger key={index} value={character.name} className="mb-1">
              {character.name}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {characterGuides.map((character, index) => (
          <TabsContent key={index} value={character.name} className="prose prose-stone dark:prose-invert max-w-none">
            <Card>
              <CardContent className="pt-6">
                <ScrollArea className="h-[60vh]">
                  <ReactMarkdown>
                    {character.content}
                  </ReactMarkdown>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    );
  };
  
  // Animation classes for revealing text
  const getRevealingTextClass = (tabName: string) => {
    const isActive = generating && (
      (tabName === "host-guide" && progress < 30) ||
      (tabName === "characters" && progress >= 30 && progress < 60) ||
      (tabName === "clues" && progress >= 60 && progress < 90)
    );
    
    return isActive ? "animate-pulse" : "";
  };

  const renderGenerationBanner = () => {
    return (
      <div className={`mb-4 ${generating ? "block" : "hidden"}`}>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>{currentStep}</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        
        <div className="flex gap-2 mt-2 flex-wrap">
          {Object.entries(sections).map(([key, isComplete]) => (
            key !== 'solution' && (
              <Badge 
                key={key}
                variant={isComplete ? "secondary" : "outline"}
                className={isComplete ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : ""}
              >
                {key === "hostGuide" ? "Host Guide" : 
                 key === "characters" ? "Characters" :
                 key === "clues" ? "Clues" : ""}
                {isComplete ? " ✓" : ""}
              </Badge>
            )
          ))}
        </div>
      </div>
    );
  };

  const renderGenerateButton = () => {
    if (generating) return null;
    
    return (
      <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-center space-x-2">
          <Switch 
            id="test-mode" 
            checked={testMode} 
            onCheckedChange={handleTestModeChange}
          />
          <Label htmlFor="test-mode">Test Mode (Faster, Less Content)</Label>
        </div>
        
        <Button
          onClick={handleGeneratePackage}
          disabled={generating}
          className="ml-auto"
        >
          {generating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : tabsWithContent.length > 0 ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Regenerate Mystery
            </>
          ) : (
            <>
              <Play className="mr-2 h-4 w-4" />
              Generate Mystery
            </>
          )}
        </Button>
      </div>
    );
  };

  return (
    <>
      {renderGenerateButton()}
      {renderGenerationBanner()}
    
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="host-guide" disabled={generating && !tabsWithContent.includes("host-guide")}>
            Host Guide {sections.hostGuide && "✓"}
          </TabsTrigger>
          <TabsTrigger value="characters" disabled={generating && !tabsWithContent.includes("characters")}>
            Characters {sections.characters && "✓"}
          </TabsTrigger>
          <TabsTrigger value="clues" disabled={generating && !tabsWithContent.includes("clues")}>
            Clues & Evidence {sections.clues && "✓"}
          </TabsTrigger>
          <TabsTrigger value="solution" disabled={generating && !tabsWithContent.includes("solution")}>
            Solution
          </TabsTrigger>
          <TabsTrigger value="materials" disabled={generating && !tabsWithContent.includes("materials")}>
            Printable Materials
          </TabsTrigger>
        </TabsList>
        
        <div className="flex justify-between mb-4">
          <h2 className="text-xl font-semibold">{mysteryTitle}</h2>
          
          <div className="space-x-2">
            <Button variant="outline" size="sm" onClick={handleDownloadText} disabled={!content}>
              <Download className="h-4 w-4 mr-2" />
              Download Text
            </Button>
            <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={!content}>
              <FileText className="h-4 w-4 mr-2" />
              Download PDF
            </Button>
          </div>
        </div>
        
        <TabsContent value="host-guide" className={`prose prose-stone dark:prose-invert max-w-none ${getRevealingTextClass("host-guide")}`}>
          <Card>
            <CardContent className="pt-6">
              {hostGuide ? (
                <ScrollArea className="h-[60vh]">
                  <ReactMarkdown>{hostGuide}</ReactMarkdown>
                </ScrollArea>
              ) : (
                renderPlaceholderContent("host-guide")
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="characters">
          <Card>
            <CardContent className="pt-6">
              {renderCharacterTabs()}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="clues" className={`prose prose-stone dark:prose-invert max-w-none ${getRevealingTextClass("clues")}`}>
          <Card>
            <CardContent className="pt-6">
              {clues ? (
                <ScrollArea className="h-[60vh]">
                  <ReactMarkdown>{clues}</ReactMarkdown>
                </ScrollArea>
              ) : (
                renderPlaceholderContent("clues")
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="solution" className="prose prose-stone dark:prose-invert max-w-none">
          <Card>
            <CardContent className="pt-6">
              {solution ? (
                <ScrollArea className="h-[60vh]">
                  <ReactMarkdown>{solution}</ReactMarkdown>
                </ScrollArea>
              ) : (
                renderPlaceholderContent("solution")
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="materials" className="prose prose-stone dark:prose-invert max-w-none">
          <Card>
            <CardContent className="pt-6">
              {printableMaterials ? (
                <ScrollArea className="h-[60vh]">
                  <ReactMarkdown>{printableMaterials}</ReactMarkdown>
                </ScrollArea>
              ) : (
                renderPlaceholderContent("materials")
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
};

export default MysteryPackageTabView;
