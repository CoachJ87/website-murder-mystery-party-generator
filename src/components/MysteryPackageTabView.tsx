
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Progress } from "@/components/ui/progress";
import { Loader2, Wand2 } from "lucide-react";
import { MysteryCharacter } from "@/interfaces/mystery";

interface MysteryPackageTabViewProps {
  packageContent: string;
  mysteryTitle: string;
  generationStatus?: any;
  isGenerating: boolean;
  conversationId?: string;
  onGenerateClick?: () => void;
  streamingContent?: {
    hostGuide?: string;
    characters?: MysteryCharacter[];
    clues?: any[];
    inspectorScript?: string;
    characterMatrix?: string;
    currentlyGenerating?: string;
  };
}

const MysteryPackageTabView = ({
  packageContent,
  mysteryTitle,
  generationStatus,
  isGenerating,
  conversationId,
  onGenerateClick,
  streamingContent = {}
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
    if (streamingContent?.hostGuide) return streamingContent.hostGuide;
    
    if (!packageContent) return "";
    
    const hostGuidePattern = /# .+ - HOST GUIDE\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(hostGuidePattern);
    return match ? match[1].trim() : "";
  };

  const extractInspectorScript = () => {
    if (streamingContent?.inspectorScript) return streamingContent.inspectorScript;
    
    if (!packageContent) return "";
    
    const inspectorPattern = /# (?:INSPECTOR|DETECTIVE) SCRIPT\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(inspectorPattern);
    return match ? match[1].trim() : "";
  };

  const extractCharacterMatrix = () => {
    if (streamingContent?.characterMatrix) return streamingContent.characterMatrix;
    
    if (!packageContent) return "";
    
    const matrixPattern = /# CHARACTER RELATIONSHIP MATRIX\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(matrixPattern);
    return match ? match[1].trim() : "";
  };

  const extractCharacters = () => {
    if (streamingContent?.characters && Array.isArray(streamingContent.characters)) return streamingContent.characters;
    
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
    if (streamingContent?.clues && Array.isArray(streamingContent.clues)) return streamingContent.clues;
    
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

  const isExternalProcessing = isGenerating && progress < 90 && !packageContent;

  return (
    <div className="w-full">
      {isGenerating && (
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div className="text-sm font-medium">
              {progress < 100 ? "Processing..." : "Generation Complete"}
            </div>
            <div className="text-sm text-muted-foreground">{progress}%</div>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="mt-2 text-sm text-muted-foreground">
            {statusMessage}
          </div>
        </div>
      )}

      {isExternalProcessing ? (
        <div className="text-center py-12">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <h3 className="text-lg font-semibold mb-2">Processing Externally</h3>
          <p className="text-muted-foreground mb-4">
            Your mystery is being generated on our external service. This will take 3-5 minutes to complete.
          </p>
          <p className="text-sm text-muted-foreground">
            You can wait here or check back later - you'll be notified when it's ready.
          </p>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full grid grid-cols-2 md:grid-cols-6 mb-4">
            <TabsTrigger value="overview" className="whitespace-nowrap">
              Overview
            </TabsTrigger>
            <TabsTrigger value="host-guide" className="whitespace-nowrap" disabled={!hostGuide}>
              Host Guide
            </TabsTrigger>
            <TabsTrigger 
              value="characters" 
              className="whitespace-nowrap" 
              disabled={!characters || characters.length === 0}
            >
              Characters ({characters && Array.isArray(characters) ? characters.length : 0})
            </TabsTrigger>
            <TabsTrigger 
              value="clues" 
              className="whitespace-nowrap" 
              disabled={!clues || clues.length === 0}
            >
              Clues ({clues && Array.isArray(clues) ? clues.length : 0})
            </TabsTrigger>
            <TabsTrigger value="inspector" className="whitespace-nowrap" disabled={!inspectorScript}>
              Inspector
            </TabsTrigger>
            <TabsTrigger value="matrix" className="whitespace-nowrap" disabled={!relationshipMatrix}>
              Relationships
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="prose prose-stone dark:prose-invert max-w-none">
              <h2>{mysteryTitle}</h2>
              
              {isGenerating && !packageContent ? (
                <div className="flex items-center space-x-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generation in progress...</span>
                </div>
              ) : !packageContent ? (
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
              ) : (
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
              )}
            </div>
          </TabsContent>

          <TabsContent value="host-guide">
            <div className="prose prose-stone dark:prose-invert max-w-none">
              <ReactMarkdown>{hostGuide}</ReactMarkdown>
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
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No character information available yet.</p>
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
              ) : (
                <div className="text-center py-6">
                  <p className="text-muted-foreground">No clues available yet.</p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="inspector">
            <div className="prose prose-stone dark:prose-invert max-w-none">
              <ReactMarkdown>{inspectorScript}</ReactMarkdown>
            </div>
          </TabsContent>

          <TabsContent value="matrix">
            <div className="prose prose-stone dark:prose-invert max-w-none">
              <ReactMarkdown>{relationshipMatrix}</ReactMarkdown>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default MysteryPackageTabView;
