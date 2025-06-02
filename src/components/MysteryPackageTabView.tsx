
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { Loader2, Wand2, CheckCircle2, Eye } from "lucide-react";
import { MysteryCharacter } from "@/interfaces/mystery";
import "../styles/mystery-package.css";

interface MysteryPackageData {
  title?: string;
  gameOverview?: string;
  hostGuide?: string;
  materials?: string;
  preparation?: string;
  timeline?: string;
  hostingTips?: string;
  evidenceCards?: string;
  relationshipMatrix?: string;
  detectiveScript?: string;
}

interface MysteryPackageTabViewProps {
  packageContent: string;
  mysteryTitle: string;
  generationStatus?: any;
  isGenerating: boolean;
  conversationId?: string;
  onGenerateClick?: () => void;
  packageData?: MysteryPackageData;
  characters?: MysteryCharacter[];
}

const MysteryPackageTabView = ({
  packageContent,
  mysteryTitle,
  generationStatus,
  isGenerating,
  conversationId,
  onGenerateClick,
  packageData,
  characters = []
}: MysteryPackageTabViewProps) => {
  const [activeTab, setActiveTab] = useState("host-guide");
  const [statusMessage, setStatusMessage] = useState("Starting generation...");

  // Debug logging on component mount and prop changes
  useEffect(() => {
    console.log("🎯 [DEBUG] MysteryPackageTabView props updated:");
    console.log("  - mysteryTitle:", mysteryTitle);
    console.log("  - packageContent length:", packageContent?.length || 0);
    console.log("  - packageData:", packageData);
    console.log("  - characters count:", characters?.length || 0);
    console.log("  - isGenerating:", isGenerating);
    console.log("  - generationStatus:", generationStatus);
  }, [packageContent, packageData, characters, isGenerating, generationStatus, mysteryTitle]);

  // Update status message based on generationStatus
  useEffect(() => {
    if (generationStatus) {
      setStatusMessage(generationStatus.currentStep || "Processing...");
    }
  }, [generationStatus]);

  // Fallback text parsing functions for backwards compatibility
  const extractHostGuide = () => {
    if (!packageContent) {
      console.log("ℹ️ [DEBUG] extractHostGuide: No packageContent available");
      return "";
    }
    
    const hostGuidePattern = /# .+ - HOST GUIDE\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(hostGuidePattern);
    const result = match ? match[1].trim() : "";
    console.log("📋 [DEBUG] extractHostGuide result length:", result.length);
    return result;
  };

  const extractInspectorScript = () => {
    if (!packageContent) {
      console.log("ℹ️ [DEBUG] extractInspectorScript: No packageContent available");
      return "";
    }
    
    const inspectorPattern = /# (?:INSPECTOR|DETECTIVE) SCRIPT\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(inspectorPattern);
    const result = match ? match[1].trim() : "";
    console.log("📋 [DEBUG] extractInspectorScript result length:", result.length);
    return result;
  };

  const extractCharacterMatrix = () => {
    if (!packageContent) {
      console.log("ℹ️ [DEBUG] extractCharacterMatrix: No packageContent available");
      return "";
    }
    
    const matrixPattern = /# CHARACTER RELATIONSHIP MATRIX\n([\s\S]*?)(?=# |$)/i;
    const match = packageContent.match(matrixPattern);
    const result = match ? match[1].trim() : "";
    console.log("📋 [DEBUG] extractCharacterMatrix result length:", result.length);
    return result;
  };

  const extractCharacters = () => {
    if (!packageContent) {
      console.log("ℹ️ [DEBUG] extractCharacters: No packageContent available");
      return [];
    }
    
    const charactersList: MysteryCharacter[] = [];
    const characterPattern = /# ([^-\n]+) - CHARACTER GUIDE\n([\s\S]*?)(?=# \w+ - CHARACTER GUIDE|# |$)/g;
    
    let match;
    while ((match = characterPattern.exec(packageContent)) !== null) {
      const characterName = match[1].trim();
      const characterContent = match[2].trim();
      
      charactersList.push({
        id: crypto.randomUUID(),
        package_id: conversationId || "",
        character_name: characterName,
        description: characterContent.substring(0, characterContent.indexOf('\n\n')) || '',
        background: '',
        relationships: [],
        secrets: []
      });
    }
    
    console.log("📋 [DEBUG] extractCharacters result:", charactersList.length, "characters");
    return charactersList;
  };

  const extractClues = () => {
    if (!packageContent) {
      console.log("ℹ️ [DEBUG] extractClues: No packageContent available");
      return [];
    }
    
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
    
    console.log("📋 [DEBUG] extractClues result:", clues.length, "clues");
    return clues;
  };

  // Get data with structured data priority, fallback to text parsing
  const getHostGuide = () => {
    const structuredData = packageData?.hostGuide;
    const fallbackData = extractHostGuide();
    
    console.log("🔍 [DEBUG] getHostGuide sources:");
    console.log("  - Structured data length:", structuredData?.length || 0);
    console.log("  - Fallback data length:", fallbackData?.length || 0);
    
    const result = structuredData || fallbackData;
    console.log("➡️ [DEBUG] getHostGuide final result length:", result?.length || 0);
    return result;
  };

  const getDetectiveScript = () => {
    const structuredData = packageData?.detectiveScript;
    const fallbackData = extractInspectorScript();
    
    console.log("🔍 [DEBUG] getDetectiveScript sources:");
    console.log("  - Structured data length:", structuredData?.length || 0);
    console.log("  - Fallback data length:", fallbackData?.length || 0);
    
    const result = structuredData || fallbackData;
    console.log("➡️ [DEBUG] getDetectiveScript final result length:", result?.length || 0);
    return result;
  };

  const getRelationshipMatrix = () => {
    const structuredData = packageData?.relationshipMatrix;
    const fallbackData = extractCharacterMatrix();
    
    console.log("🔍 [DEBUG] getRelationshipMatrix sources:");
    console.log("  - Structured data length:", structuredData?.length || 0);
    console.log("  - Fallback data length:", fallbackData?.length || 0);
    
    const result = structuredData || fallbackData;
    console.log("➡️ [DEBUG] getRelationshipMatrix final result length:", result?.length || 0);
    return result;
  };

  const getCharacters = () => {
    // Priority 1: Use characters prop from database
    if (characters && characters.length > 0) {
      console.log("✅ [DEBUG] getCharacters: Using database characters (", characters.length, "found)");
      return characters;
    }
    
    // Priority 2: Fallback to text parsing only if no database characters
    console.log("🔄 [DEBUG] getCharacters: Falling back to text parsing");
    const result = extractCharacters();
    console.log("➡️ [DEBUG] getCharacters final result:", result.length, "characters");
    return result;
  };

  const getEvidenceCards = () => {
    if (packageData?.evidenceCards) {
      console.log("✅ [DEBUG] getEvidenceCards: Using structured evidence cards");
      return packageData.evidenceCards;
    }
    
    // Fallback to extracting clues and formatting them
    console.log("🔄 [DEBUG] getEvidenceCards: Falling back to extracted clues");
    const clues = extractClues();
    if (clues.length > 0) {
      const result = clues.map(clue => `## ${clue.title}\n\n${clue.content}`).join('\n\n---\n\n');
      console.log("➡️ [DEBUG] getEvidenceCards from clues, result length:", result.length);
      return result;
    }
    
    console.log("ℹ️ [DEBUG] getEvidenceCards: No evidence cards found");
    return "";
  };

  const hostGuide = getHostGuide();
  const detectiveScript = getDetectiveScript();
  const relationshipMatrix = getRelationshipMatrix();
  const charactersList = getCharacters();
  const evidenceCards = getEvidenceCards();

  // Log final computed values
  useEffect(() => {
    console.log("📊 [DEBUG] Final computed content availability:");
    console.log("  - hostGuide:", !!hostGuide, `(${hostGuide?.length || 0} chars)`);
    console.log("  - detectiveScript:", !!detectiveScript, `(${detectiveScript?.length || 0} chars)`);
    console.log("  - relationshipMatrix:", !!relationshipMatrix, `(${relationshipMatrix?.length || 0} chars)`);
    console.log("  - charactersList:", !!charactersList.length, `(${charactersList.length} characters)`);
    console.log("  - evidenceCards:", !!evidenceCards, `(${evidenceCards?.length || 0} chars)`);
  }, [hostGuide, detectiveScript, relationshipMatrix, charactersList, evidenceCards]);

  // Helper function to check if a section is generated based on generationStatus
  const isSectionComplete = (sectionName: string) => {
    return generationStatus?.sections?.[sectionName] || false;
  };

  // Simplified loading component for individual tabs
  const LoadingTabContent = ({ message }: { message: string }) => (
    <div className="loading-section">
      <div className="flex flex-col items-center justify-center space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <h3 className="text-lg font-semibold">Generating...</h3>
        <p className="text-muted-foreground text-center max-w-md">
          {message}
        </p>
        {statusMessage && (
          <p className="text-sm text-center text-muted-foreground">
            Status: {statusMessage}
          </p>
        )}
      </div>
    </div>
  );

  return (
    <div className="w-full relative">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-center">{mysteryTitle}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full grid grid-cols-2 md:grid-cols-5 mb-4">
          <TabsTrigger value="host-guide" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Host Guide</span>
              {(hostGuide || isSectionComplete('hostGuide')) && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="characters" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Characters ({charactersList && Array.isArray(charactersList) ? charactersList.length : 0})</span>
              {(charactersList.length > 0 || isSectionComplete('characters')) && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="clues" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Evidence</span>
              {(evidenceCards || isSectionComplete('clues')) && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="inspector" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Detective Guide</span>
              {detectiveScript && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
          <TabsTrigger value="matrix" className="whitespace-nowrap">
            <div className="flex items-center space-x-1">
              <span>Relationships</span>
              {relationshipMatrix && <CheckCircle2 className="h-3 w-3 text-green-500" />}
            </div>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="host-guide">
          <div className="mystery-content">
            {hostGuide ? (
              <>
                {console.log("✅ [DEBUG] Rendering host guide content")}
                <ReactMarkdown 
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto">
                        <table>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {hostGuide}
                </ReactMarkdown>
              </>
            ) : isGenerating ? (
              <>
                {console.log("🔄 [DEBUG] Rendering host guide loading state")}
                <LoadingTabContent message="Creating your complete host guide with all the instructions and materials needed to run your mystery game." />
              </>
            ) : (
              <>
                {console.log("📋 [DEBUG] Rendering host guide generation prompt")}
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
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="characters">
          <div className="mystery-content">
            {Array.isArray(charactersList) && charactersList.length > 0 ? (
              <>
                {console.log("✅ [DEBUG] Rendering", charactersList.length, "characters")}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {charactersList.map((character, index) => (
                    <div key={character.id || index} className="character-card">
                      <h3>{character.character_name}</h3>
                      <p>{character.description}</p>
                      {character.background && (
                        <div className="mt-2">
                          <h4 className="font-semibold text-sm">Background:</h4>
                          <p className="text-sm text-muted-foreground">{character.background}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            ) : isGenerating ? (
              <>
                {console.log("🔄 [DEBUG] Rendering characters loading state")}
                <LoadingTabContent message="Developing unique character profiles with backgrounds, motivations, and secrets for your mystery game." />
              </>
            ) : (
              <>
                {console.log("📋 [DEBUG] Rendering characters empty state")}
                <div className="text-center py-6">
                  <p className="text-muted-foreground">Character guides will be available after generation starts.</p>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="clues">
          <div className="mystery-content">
            {evidenceCards ? (
              <>
                {console.log("✅ [DEBUG] Rendering evidence cards content")}
                <ReactMarkdown 
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto">
                        <table>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {evidenceCards}
                </ReactMarkdown>
              </>
            ) : isGenerating ? (
              <>
                {console.log("🔄 [DEBUG] Rendering evidence cards loading state")}
                <LoadingTabContent message="Crafting evidence cards, clues, and investigative materials that will help solve your mystery." />
              </>
            ) : (
              <>
                {console.log("📋 [DEBUG] Rendering evidence cards empty state")}
                <div className="text-center py-6">
                  <p className="text-muted-foreground">Evidence cards will be available after generation starts.</p>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="inspector">
          <div className="mystery-content">
            {detectiveScript ? (
              <>
                {console.log("✅ [DEBUG] Rendering detective script content")}
                <ReactMarkdown 
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto">
                        <table>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {detectiveScript}
                </ReactMarkdown>
              </>
            ) : isGenerating ? (
              <>
                {console.log("🔄 [DEBUG] Rendering detective script loading state")}
                <LoadingTabContent message="Writing the detective's script and investigation timeline to guide the mystery solving process." />
              </>
            ) : (
              <>
                {console.log("📋 [DEBUG] Rendering detective script empty state")}
                <div className="text-center py-6">
                  <p className="text-muted-foreground">Detective guide will be available after generation starts.</p>
                </div>
              </>
            )}
          </div>
        </TabsContent>

        <TabsContent value="matrix">
          <div className="mystery-content">
            {relationshipMatrix ? (
              <>
                {console.log("✅ [DEBUG] Rendering relationship matrix content")}
                <ReactMarkdown 
                  components={{
                    table: ({ children }) => (
                      <div className="overflow-x-auto">
                        <table>{children}</table>
                      </div>
                    ),
                  }}
                >
                  {relationshipMatrix}
                </ReactMarkdown>
              </>
            ) : isGenerating ? (
              <>
                {console.log("🔄 [DEBUG] Rendering relationship matrix loading state")}
                <LoadingTabContent message="Building the character relationship matrix showing connections, conflicts, and hidden relationships." />
              </>
            ) : (
              <>
                {console.log("📋 [DEBUG] Rendering relationship matrix empty state")}
                <div className="text-center py-6">
                  <p className="text-muted-foreground">Relationship matrix will be available after generation starts.</p>
                </div>
              </>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MysteryPackageTabView;
