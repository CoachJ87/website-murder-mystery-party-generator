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

  // Update status message based on generationStatus
  useEffect(() => {
    if (generationStatus) {
      setStatusMessage(generationStatus.currentStep || "Processing...");
    }
  }, [generationStatus]);

  // Fallback text parsing functions for backwards compatibility
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
    
    return charactersList;
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

  // Get data with structured data priority, fallback to text parsing
  const getHostGuide = () => {
    // PRIORITY 1: Use structured packageData
    if (packageData?.hostGuide) {
      console.log("✅ Using structured host guide data");
      return packageData.hostGuide;
    }
    
    // PRIORITY 2: Fallback to text parsing
console.log("⚠️ Falling back to text parsing for host guide");
   return extractHostGuide();
 };

 const getDetectiveScript = () => {
   // PRIORITY 1: Use structured packageData
   if (packageData?.detectiveScript) {
     console.log("✅ Using structured detective script data");
     return packageData.detectiveScript;
   }
   
   // PRIORITY 2: Fallback to text parsing
   console.log("⚠️ Falling back to text parsing for detective script");
   return extractInspectorScript();
 };

 const getRelationshipMatrix = () => {
   // PRIORITY 1: Use structured packageData
   if (packageData?.relationshipMatrix) {
     console.log("✅ Using structured relationship matrix data");
     // Parse JSON if it's a string
     if (typeof packageData.relationshipMatrix === 'string') {
       try {
         const parsed = JSON.parse(packageData.relationshipMatrix);
         return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
       } catch (e) {
         return packageData.relationshipMatrix;
       }
     }
     return packageData.relationshipMatrix;
   }
   
   // PRIORITY 2: Fallback to text parsing
   console.log("⚠️ Falling back to text parsing for relationship matrix");
   return extractCharacterMatrix();
 };

 const getCharacters = () => {
   // PRIORITY 1: Use characters prop from database
   if (characters && characters.length > 0) {
     console.log("✅ Using database characters:", characters.length);
     return characters;
   }
   
   // PRIORITY 2: Fallback to text parsing only if no database characters
   console.log("⚠️ Falling back to text parsing for characters");
   return extractCharacters();
 };

 const getEvidenceCards = () => {
   // PRIORITY 1: Use structured packageData
   if (packageData?.evidenceCards) {
     console.log("✅ Using structured evidence cards data");
     // Parse JSON if it's a string
     if (typeof packageData.evidenceCards === 'string') {
       try {
         const parsed = JSON.parse(packageData.evidenceCards);
         return typeof parsed === 'string' ? parsed : JSON.stringify(parsed, null, 2);
       } catch (e) {
         return packageData.evidenceCards;
       }
     }
     return packageData.evidenceCards;
   }
   
   // PRIORITY 2: Fallback to extracting clues and formatting them
   console.log("⚠️ Falling back to text parsing for evidence cards");
   const clues = extractClues();
   if (clues.length > 0) {
     return clues.map(clue => `## ${clue.title}\n\n${clue.content}`).join('\n\n---\n\n');
   }
   
   return "";
 };

 // Get all the content with priority system
 const hostGuide = getHostGuide();
 const detectiveScript = getDetectiveScript();
 const relationshipMatrix = getRelationshipMatrix();
 const charactersList = getCharacters();
 const evidenceCards = getEvidenceCards();

 // Enhanced logging for debugging
 console.log("🔍 MysteryPackageTabView Debug:", {
   hasPackageData: !!packageData,
   hasPackageContent: !!packageContent,
   hasCharacters: charactersList.length,
   hasHostGuide: !!hostGuide,
   hasDetectiveScript: !!detectiveScript,
   hasEvidenceCards: !!evidenceCards,
   hasRelationshipMatrix: !!relationshipMatrix,
   packageDataKeys: packageData ? Object.keys(packageData) : [],
   generationStatus: generationStatus?.status
 });

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

 // Enhanced content availability check
 const hasAnyContent = () => {
   return !!(hostGuide || detectiveScript || relationshipMatrix || charactersList.length > 0 || evidenceCards);
 };

 console.log("Content availability check:", {
   hostGuide: !!hostGuide,
   detectiveScript: !!detectiveScript,
   relationshipMatrix: !!relationshipMatrix,
   charactersList: charactersList.length,
   evidenceCards: !!evidenceCards,
   hasAnyContent: hasAnyContent()
 });

 return (
   <div className="w-full relative">
     <div className="mb-6">
       <h1 className="text-3xl font-bold text-center">
         {packageData?.title || mysteryTitle}
       </h1>
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
           ) : isGenerating ? (
             <LoadingTabContent message="Creating your complete host guide with all the instructions and materials needed to run your mystery game." />
           ) : (
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
           )}
         </div>
       </TabsContent>

       <TabsContent value="characters">
         <div className="mystery-content">
           {Array.isArray(charactersList) && charactersList.length > 0 ? (
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
           ) : isGenerating ? (
             <LoadingTabContent message="Developing unique character profiles with backgrounds, motivations, and secrets for your mystery game." />
           ) : (
             <div className="text-center py-6">
               <p className="text-muted-foreground">Character guides will be available after generation starts.</p>
             </div>
           )}
         </div>
       </TabsContent>

       <TabsContent value="clues">
         <div className="mystery-content">
           {evidenceCards ? (
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
           ) : isGenerating ? (
             <LoadingTabContent message="Crafting evidence cards, clues, and investigative materials that will help solve your mystery." />
           ) : (
             <div className="text-center py-6">
               <p className="text-muted-foreground">Evidence cards will be available after generation starts.</p>
             </div>
           )}
         </div>
       </TabsContent>

       <TabsContent value="inspector">
         <div className="mystery-content">
           {detectiveScript ? (
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
           ) : isGenerating ? (
             <LoadingTabContent message="Writing the detective's script and investigation timeline to guide the mystery solving process." />
           ) : (
             <div className="text-center py-6">
               <p className="text-muted-foreground">Detective guide will be available after generation starts.</p>
             </div>
           )}
         </div>
       </TabsContent>

       <TabsContent value="matrix">
         <div className="mystery-content">
           {relationshipMatrix ? (
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
           ) : isGenerating ? (
             <LoadingTabContent message="Building the character relationship matrix showing connections, conflicts, and hidden relationships." />
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
