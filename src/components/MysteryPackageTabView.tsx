
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Progress } from "@/components/ui/progress";
import { Loader2, Wand2, CheckCircle2 } from "lucide-react";
import { MysteryCharacter } from "@/interfaces/mystery";

interface MysteryPackageTabViewProps {
  packageContent: string;
  mysteryTitle: string;
  generationStatus?: any;
  isGenerating: boolean;
  conversationId?: string;
  onGenerateClick?: () => void;
}

const MysteryPackageTabView = ({
  packageContent,
  mysteryTitle,
  generationStatus,
  isGenerating,
  conversationId,
  onGenerateClick
}: MysteryPackageTabViewProps) => {
  const [activeTab, setActiveTab] = useState("overview");
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("Starting generation...");

  // Update progress and status message based on generationStatus
  useEffect(() => {
    if (generationStatus) {
      setProgress(generationStatus.progress || 0);
      setStatusMessage(generationStatus.currentStep || "Processing...");
    }
  }, [generationStatus]);

  // Sections from package content extraction helpers
  const extractHostGuide = () => {
    if (!packageContent) return "";
    
    const hostGuidePattern = /# .+ - HOST GUIDE\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(hostGuidePattern);
    return match ? match[1].trim() : "";
  };

  const extractInspectorScript = () => {
    if (!packageContent) return "";
    
    const inspectorPattern = /# (?:INSPECTOR|DETECTIVE) SCRIPT\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(inspectorPattern);
    return match ? match[1].trim() : "";
  };

  const extractCharacterMatrix = () => {
    if (!packageContent) return "";
    
    const matrixPattern = /# CHARACTER RELATIONSHIP MATRIX\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(matrixPattern);
    return match ? match[1].trim() : "";
  };

  const extractCharacters = () => {
    if (!packageContent) return [];
    
    const characters: MysteryCharacter[] = [];
    const characterPattern = /# ([^-\n]+) - CHARACTER GUIDE\n([\s\S]*?)(?=# \w+ - CHARACTER GUIDE|# |$)/g;
    
    let match;
    while ((match = characterPattern.exec(packageContent)) !== null) {
      const characterName = match[1].trim();
      const characterContent = match[2].trim();
      
      characters.push({
        id: crypto.randomUUID(),
        package_id: conversationId || "",
        character_name: characterName,
        description: characterContent.substring(0, characterContent.indexOf('\n\n')) || '',
        background: '',
        relationships: [],
        secrets: []
      });
    }
    
    return characters;
  };

  const extractClues = () => {
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
  };

  const hostGuide = extractHostGuide();
  const inspectorScript = extractInspectorScript();
  const relationshipMatrix = extractCharacterMatrix();
  const characters = extractCharacters();
  const clues = extractClues();

  // Helper function to check if a section is generated based on generationStatus
  const isSectionComplete = (sectionName: string) => {
    return generationStatus?.sections?.[sectionName] || false;
  };

  // Loading component for individual tabs
  const LoadingTabContent = ({ message }: { message: string }) => (
    <div className="flex flex-col items-center justify-center py-12 space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <h3 className="text-lg font-semibold">{message}</h3>
      <p className="text-muted-foreground text-center">
        This section is being generated. You can switch between tabs to check the progress of other sections.
      </p>
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center">{mysteryTitle}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-6 mb-4">
          <TabsTrigger value="overview" className="whitespace-nowrap">
            Overview
          </TabsTrigger>
          <TabsTrigger value="host-guide" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Host Guide</span>
              {isSectionComplete('hostGuide') && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="characters" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Characters ({characters && Array.isArray(characters) ? characters.length : 0})</span>
              {isSectionComplete('characters') && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="clues" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Clues ({clues && Array.isArray(clues) ? clues.length : 0})</span>
              {isSectionComplete('clues') && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="inspector" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Inspector</span>
              {inspectorScript && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="matrix" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Relationships</span>
              {relationshipMatrix && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="prose prose-stone dark:prose-invert max-w-none">
            {isGenerating && (
              <div className="mb-6 p-6 border rounded-lg bg-card">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-sm font-medium">
                    {progress < 100 ? "Processing..." : "Generation Complete"}
                  </div>
                  <div className="text-sm text-muted-foreground">{progress}%</div>
                </div>
                <Progress value={progress} className="h-2 mb-4" />
                <div className="text-sm text-muted-foreground mb-4">
                  {statusMessage}
                </div>
                <p className="text-sm text-muted-foreground">
                  Your mystery is being generated. You can switch between tabs to see the progress of different sections.
                  Keep this browser tab open during generation.
                </p>
              </div>
            )}
            
            {!isGenerating && !packageContent ? (
              <div className="text-center py-12 space-y-4">
                <Wand2 className="h-12 w-12 mx-auto text-muted-foreground" />
                <h3 className="text-xl font-semibold">Ready to Generate Your Mystery</h3>
                <p className="text-muted-foreground">
                  Click the button below to start generating your complete mystery package with all materials included.
                </p>
                {onGenerateClick && (
                  <Button onClick={onGenerateClick} className="mt-4">
                    Generate Package
                  </Button>
                )}
              </div>
            ) : packageContent ? (
              <div>
                <p>Your mystery package is ready! Use the tabs above to explore all the components:</p>
                <ul>
                  <li><strong>Host Guide:</strong> Complete instructions for running your murder mystery</li>
                  <li><strong>Characters:</strong> Detailed character sheets for all players</li>
                  <li><strong>Clues:</strong> Physical evidence to distribute during the game</li>
                  <li><strong>Inspector:</strong> Role-playing instructions for the detective</li>
                  <li><strong>Relationships:</strong> Character relationship matrix</li>
                </ul>
              </div>
            ) : null}
          </div>
        </TabsContent>

        <TabsContent value="host-guide">
          <div className="prose prose-stone dark:prose-invert max-w-none">
            {hostGuide ? (
              <ReactMarkdown>{hostGuide}</ReactMarkdown>
            ) : isGenerating ? (
              <LoadingTabContent message="Generating host guide..." />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Host guide will be available after generation starts.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="characters">
          <div className="prose prose-stone dark:prose-invert max-w-none">
            {Array.isArray(characters) && characters.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {characters.map((character, index) => (
                  <div key={character.id || index} className="border rounded-lg p-4 bg-card">
                    <h3 className="text-lg font-bold mb-2">{character.character_name}</h3>
                    <p>{character.description}</p>
                  </div>
                ))}
              </div>
            ) : isGenerating ? (
              <LoadingTabContent message="Generating character guides..." />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Character guides will be available after generation starts.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="clues">
          <div className="prose prose-stone dark:prose-invert max-w-none">
            {Array.isArray(clues) && clues.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {clues.map((clue, index) => (
                  <div key={index} className="border rounded-lg p-4 bg-card">
                    <h3 className="text-lg font-bold mb-2">{clue.title}</h3>
                    <ReactMarkdown>{clue.content}</ReactMarkdown>
                  </div>
                ))}
              </div>
            ) : isGenerating ? (
              <LoadingTabContent message="Generating clues and evidence..." />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Clues and evidence will be available after generation starts.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inspector">
          <div className="prose prose-stone dark:prose-invert max-w-none">
            {inspectorScript ? (
              <ReactMarkdown>{inspectorScript}</ReactMarkdown>
            ) : isGenerating ? (
              <LoadingTabContent message="Generating inspector script..." />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Inspector script will be available after generation starts.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="matrix">
          <div className="prose prose-stone dark:prose-invert max-w-none">
            {relationshipMatrix ? (
              <ReactMarkdown>{relationshipMatrix}</ReactMarkdown>
            ) : isGenerating ? (
              <LoadingTabContent message="Generating relationship matrix..." />
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground">Relationship matrix will be available after generation starts.</p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MysteryPackageTabView;
