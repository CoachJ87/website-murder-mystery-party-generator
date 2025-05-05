// src/components/MysteryPackageTabView.tsx
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Users, FileText, Grid2x2, FileCode, Download, Sparkles } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { GenerationStatus } from "@/services/mysteryPackageService";
import { supabase } from "@/lib/supabase";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { MysteryCharacter } from "@/interfaces/mystery";
import CharacterDetailView from "./CharacterDetailView";
import CharacterRoleAssignment from "./CharacterRoleAssignment";
import { Separator } from "./ui/separator";

export interface MysteryPackageTabViewProps {
  packageContent?: string;
  mysteryTitle: string;
  generationStatus?: GenerationStatus;
  isGenerating?: boolean;
  conversationId?: string;
  onGenerateClick?: () => void; // New callback for generation button
  streamingContent?: {
    hostGuide?: string;
    characters?: MysteryCharacter[];
    clues?: any[];
    inspectorScript?: string;
    characterMatrix?: string;
    currentlyGenerating?: string; // Indicates which tab is currently being generated
  };
}

interface TabData {
  hostGuide: string;
  characters: MysteryCharacter[];
  clues: any[];
  inspectorScript: string;
  characterMatrix: string;
}

const MysteryPackageTabView: React.FC<MysteryPackageTabViewProps> = ({
  packageContent,
  mysteryTitle,
  generationStatus,
  isGenerating,
  conversationId,
  onGenerateClick,
  streamingContent
}) => {
  const [activeTab, setActiveTab] = useState("host-guide");
  const [loading, setLoading] = useState(true);
  const [tabData, setTabData] = useState<TabData>({
    hostGuide: '',
    characters: [],
    clues: [],
    inspectorScript: '',
    characterMatrix: ''
  });
  
  // Determine if we're in empty state where no content is available yet
  const isEmpty = !packageContent && 
    !streamingContent?.hostGuide && 
    streamingContent?.characters?.length === 0 && 
    streamingContent?.clues?.length === 0 && 
    !streamingContent?.inspectorScript &&
    !tabData.hostGuide && 
    tabData.characters.length === 0 && 
    tabData.clues.length === 0 && 
    !tabData.inspectorScript;

  // Cursor blink effect for live generation
  const [showCursor, setShowCursor] = useState(true);
  useEffect(() => {
    if (isGenerating) {
      const interval = setInterval(() => {
        setShowCursor(prev => !prev);
      }, 530);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [isGenerating]);
  
  // Auto-switch to tab that's being generated
  useEffect(() => {
    if (streamingContent?.currentlyGenerating && isGenerating) {
      switch (streamingContent.currentlyGenerating) {
        case 'hostGuide':
          setActiveTab('host-guide');
          break;
        case 'characters':
          setActiveTab('characters');
          break;
        case 'clues':
          setActiveTab('clues');
          break;
        case 'inspectorScript':
          setActiveTab('detective-script');
          break;
        case 'characterMatrix':
          setActiveTab('character-matrix');
          break;
      }
    }
  }, [streamingContent?.currentlyGenerating, isGenerating]);

  useEffect(() => {
    if (conversationId) {
      fetchFullContent(conversationId);
    } else if (packageContent) {
      extractContentFromMarkdown(packageContent);
    }
  }, [conversationId, packageContent]);

  const fetchFullContent = async (conversationId: string) => {
    try {
      setLoading(true);
      console.log("Fetching content for conversation ID:", conversationId);
      
      // Fetch package data with all needed fields
      const { data: packageData, error: packageError } = await supabase
        .from("mystery_packages")
        .select("id, content, host_guide, evidence_cards, detective_script, relationship_matrix")
        .eq("conversation_id", conversationId)
        .maybeSingle();
        
      if (packageError) {
        console.error("Error fetching mystery package:", packageError);
        setLoading(false);
        return;
      }
      
      console.log("Package data fetched:", {
        id: packageData?.id,
        hostGuideLength: packageData?.host_guide?.length || 0,
        evidenceCardsCount: Array.isArray(packageData?.evidence_cards) ? packageData?.evidence_cards.length : 0,
        hasDetectiveScript: !!packageData?.detective_script,
        hasRelationshipMatrix: !!packageData?.relationship_matrix
      });
      
      // Fetch characters if we have a package ID
      let charactersData: MysteryCharacter[] = [];
      if (packageData?.id) {
        const { data: chars, error: charsError } = await supabase
          .from("mystery_characters")
          .select("*")
          .eq("package_id", packageData.id);
          
        if (charsError) {
          console.error("Error fetching characters:", charsError);
        } else if (chars && chars.length > 0) {
          // Transform character data to ensure consistent structure
          charactersData = chars.map(character => {
            // Normalize relationships to expected format
            let relationships = [];
            
            // Handle database format with name/relation pairs
            if (Array.isArray(character.relationships)) {
              relationships = character.relationships.map((rel: any) => {
                // Support both name/relation and character/description formats
                if (rel.name && rel.relation) {
                  return {
                    character: rel.name,
                    description: rel.relation
                  };
                } else if (rel.character && rel.description) {
                  return rel; // Already in correct format
                } else {
                  // Try to extract from simple object
                  const characterName = Object.keys(rel)[0];
                  return {
                    character: characterName,
                    description: rel[characterName] || ''
                  };
                }
              });
            }
            
            // Normalize secrets to array format
            let secrets: string[] = [];
            if (typeof character.secrets === 'string') {
              // If it's a single string, convert to array
              secrets = [character.secrets];
            } else if (Array.isArray(character.secrets)) {
              // If array, ensure all items are strings
              secrets = character.secrets.map(secret => 
                typeof secret === 'string' ? secret : JSON.stringify(secret)
              );
            } else if (character.secrets && typeof character.secrets === 'object') {
              // If it's an object, convert to array of strings
              secrets = Object.entries(character.secrets).map(
                ([key, value]) => `${key}: ${value}`
              );
            }
            
            // Normalize round scripts
            let round_scripts = character.round_scripts || {};
            if (typeof round_scripts !== 'object') {
              round_scripts = {};
            }
            
            // Ensure the character data conforms to our interface
            return {
              id: character.id || '',
              package_id: character.package_id || '',
              character_name: character.character_name || 'Unknown Character',
              description: character.description || '',
              background: character.background || '',
              relationships: relationships.filter(r => r.character && r.character.trim().length > 0),
              secrets: secrets.filter(s => s && s.trim().length > 0),
              round_scripts: {
                introduction: character.round_scripts?.introduction || character.introduction || '',
                round1: character.round1_statement || '',
                round2: character.round_scripts?.round2 || {},
                round3: character.round_scripts?.round3 || {},
                final: character.round_scripts?.final || {}
              },
              introduction: character.introduction || '',
              whereabouts: character.whereabouts || '',
              round1_statement: character.round1_statement || '',
              round2_statement: character.round2_statement || '',
              round3_statement: character.round3_statement || '',
              questioning_options: character.questioning_options || [],
              created_at: character.created_at || new Date().toISOString(),
              updated_at: character.updated_at || new Date().toISOString()
            };
          });
          
          console.log(`Found and processed ${charactersData.length} characters`);
        }
      }

      // Now we have all the data we need, let's process and display it correctly
      const hostGuideContent = packageData?.host_guide || '';
      
      // Format evidence cards properly
      let evidenceCards: any[] = [];
      if (packageData?.evidence_cards && Array.isArray(packageData.evidence_cards)) {
        evidenceCards = packageData.evidence_cards.map((card: any, index: number) => ({
          title: card.title || `Evidence ${index + 1}`,
          content: card.content || '',
          description: card.description || '',
          implication: card.implication || ''
        }));
      }
      
      // Format inspector script
      const inspectorScript = packageData?.detective_script || '';
      
      // Format relationship matrix - convert to HTML table if it's just text
      let characterMatrix = packageData?.relationship_matrix || '';
      if (typeof characterMatrix === 'string' && characterMatrix.includes('|')) {
        characterMatrix = formatMatrixAsTable(characterMatrix);
      } else if (typeof characterMatrix === 'object') {
        characterMatrix = formatMatrixObjectAsTable(characterMatrix);
      }
      
      // If we still don't have character data, try extracting it from content
      if (charactersData.length === 0 && packageData?.content) {
        const extractedCharacters = extractCharactersFromContent(packageData.content);
        if (extractedCharacters.length > 0) {
          charactersData = extractedCharacters;
          console.log(`Extracted ${extractedCharacters.length} characters from content`);
          
          // If we have a package_id, save these characters to the database
          if (packageData?.id) {
            try {
              for (const character of extractedCharacters) {
                await supabase.from("mystery_characters").insert({
                  package_id: packageData.id,
                  character_name: character.character_name,
                  description: character.description,
                  background: character.background,
                  relationships: character.relationships,
                  secrets: character.secrets,
                  round_scripts: character.round_scripts,
                  introduction: character.introduction || character.round_scripts?.introduction,
                  whereabouts: character.whereabouts,
                  round1_statement: character.round1_statement || (character.round_scripts?.round2 as any)?.innocent,
                  round2_statement: character.round2_statement || (character.round_scripts?.round3 as any)?.innocent,
                  round3_statement: character.round3_statement || (character.round_scripts?.final as any)?.innocent,
                  questioning_options: character.questioning_options
                });
              }
              toast.success("Character data saved to database");
            } catch (error) {
              console.error("Error saving extracted characters to database:", error);
            }
          }
        }
      }
      
      // If character data is still empty but we have a content string that likely contains characters
      if (charactersData.length === 0 && packageData?.content && 
          packageData.content.includes("CHARACTER GUIDE")) {
        toast.info("Extracting character information from raw content");
      }
      
      // Store all the data
      setTabData({
        hostGuide: hostGuideContent,
        characters: charactersData,
        clues: evidenceCards,
        inspectorScript: inspectorScript,
        characterMatrix: characterMatrix
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching mystery content:", error);
      toast.error("Failed to load mystery content");
      setLoading(false);
    }
  };

  const formatMatrixAsTable = (matrixText: string): string => {
    if (!matrixText.includes('|')) return matrixText;
    
    const lines = matrixText.split('\n').filter(line => line.trim());
    let tableHtml = '<table class="min-w-full border-collapse border border-gray-300">\n';
    
    // Process header row
    if (lines.length > 0) {
      const headerCells = lines[0].split('|').map(cell => cell.trim());
      tableHtml += '  <thead>\n    <tr>\n';
      headerCells.forEach(cell => {
        tableHtml += `      <th class="border border-gray-300 px-4 py-2 bg-muted">${cell}</th>\n`;
      });
      tableHtml += '    </tr>\n  </thead>\n';
    }
    
    // Process body rows
    if (lines.length > 1) {
      tableHtml += '  <tbody>\n';
      for (let i = 1; i < lines.length; i++) {
        if (lines[i].includes('---')) continue; // Skip separator rows
        
        const cells = lines[i].split('|').map(cell => cell.trim());
        tableHtml += '    <tr>\n';
        cells.forEach((cell, index) => {
          if (index === 0) {
            tableHtml += `      <td class="border border-gray-300 px-4 py-2 font-semibold bg-muted/50">${cell}</td>\n`;
          } else {
            tableHtml += `      <td class="border border-gray-300 px-4 py-2 bg-card">${cell}</td>\n`;
          }
        });
        tableHtml += '    </tr>\n';
      }
      tableHtml += '  </tbody>\n';
    }
    
    tableHtml += '</table>';
    return tableHtml;
  };

  const formatMatrixObjectAsTable = (matrixObj: any): string => {
    if (!matrixObj || typeof matrixObj !== 'object') return '';
    
    const characters = Object.keys(matrixObj);
    if (characters.length === 0) return '';
    
    let tableHtml = '<table class="min-w-full border-collapse border border-gray-300">\n';
    
    // Header row
    tableHtml += '  <thead>\n    <tr>\n';
    tableHtml += '      <th class="border border-gray-300 px-4 py-2 bg-muted">Character</th>\n';
    tableHtml += '      <th class="border border-gray-300 px-4 py-2 bg-muted">Primary Connection</th>\n';
    tableHtml += '      <th class="border border-gray-300 px-4 py-2 bg-muted">Secondary Connections</th>\n';
    tableHtml += '      <th class="border border-gray-300 px-4 py-2 bg-muted">Secret Connections</th>\n';
    tableHtml += '    </tr>\n  </thead>\n';
    
    // Body rows
    tableHtml += '  <tbody>\n';
    characters.forEach(character => {
      const charData = matrixObj[character];
      tableHtml += '    <tr>\n';
      tableHtml += `      <td class="border border-gray-300 px-4 py-2 font-semibold bg-muted/50">${character}</td>\n`;
      tableHtml += `      <td class="border border-gray-300 px-4 py-2 bg-card">${charData.primary_connection || ''}</td>\n`;
      
      let secondaryConn = '';
      if (Array.isArray(charData.secondary_connections)) {
        secondaryConn = charData.secondary_connections.join(', ');
      } else if (typeof charData.secondary_connections === 'string') {
        secondaryConn = charData.secondary_connections;
      }
      tableHtml += `      <td class="border border-gray-300 px-4 py-2 bg-card">${secondaryConn}</td>\n`;
      
      let secretConn = '';
      if (Array.isArray(charData.secret_connections)) {
        secretConn = charData.secret_connections.join(', ');
      } else if (typeof charData.secret_connections === 'string') {
        secretConn = charData.secret_connections;
      }
      tableHtml += `      <td class="border border-gray-300 px-4 py-2 bg-card">${secretConn}</td>\n`;
      
      tableHtml += '    </tr>\n';
    });
    tableHtml += '  </tbody>\n';
    
    tableHtml += '</table>';
    return tableHtml;
  };

  const extractCharactersFromContent = (content: string): MysteryCharacter[] => {
    const characters: MysteryCharacter[] = [];
    
    // Try to match character sections
    const characterPattern = /# ([^-\n]+) - CHARACTER GUIDE\n([\s\S]*?)(?=# \w+ - CHARACTER GUIDE|# |$)/g;
    let match;
    
    while ((match = characterPattern.exec(content)) !== null) {
      const characterName = match[1].trim();
      const characterContent = match[2].trim();
      
      // Extract character details
      const description = extractSection(characterContent, "CHARACTER DESCRIPTION");
      const background = extractSection(characterContent, "(?:YOUR )?BACKGROUND");
      const relationshipsText = extractSection(characterContent, "(?:YOUR )?RELATIONSHIPS");
      const secretsText = extractSection(characterContent, "(?:YOUR )?SECRETS?");
      const whereaboutsText = extractSection(characterContent, "(?:YOUR )?WHEREABOUTS");
      const round1Text = extractSection(characterContent, "ROUND 1: INITIAL INVESTIGATION");
      const round2Text = extractSection(characterContent, "ROUND 2: DEEPER REVELATIONS");
      const round3Text = extractSection(characterContent, "ROUND 3: FINAL CLUES");
      const finalStatementText = extractSection(characterContent, "FINAL STATEMENT");
      
      // Extract introductory statement
      const introPattern = /YOUR INTRODUCTION\s*\n([^#]+?)(?=CHOOSE|$)/is;
      const introMatch = round1Text.match(introPattern);
      const introduction = introMatch ? introMatch[1].trim().replace(/"([^"]+)"/, '$1') : '';
      
      // Extract questioning options
      const questioningOptions: { target: string, question: string }[] = [];
      const questioningPattern = /Ask ([^:]+):\s*"([^"]+)"/g;
      let questionMatch;
      const questioningSection = characterContent.includes("CHOOSE SOMEONE TO QUESTION") ? 
                               extractSection(characterContent, "CHOOSE SOMEONE TO QUESTION") : '';
                               
      while ((questionMatch = questioningPattern.exec(questioningSection)) !== null) {
        questioningOptions.push({
          target: questionMatch[1].trim(),
          question: questionMatch[2].trim()
        });
      }
      
      // Process relationships
      const relationships: {character: string; description: string}[] = [];
      
      // Try different formatting patterns
      const relationshipPatterns = [
        /\*\*([^*]+)\*\*:\s*([^\n]+)/g, // Bold format: **Name**: Description
        /\*([^*]+)\*:\s*([^\n]+)/g,     // Italic format: *Name*: Description
        /^([^:]+):\s*(.+)$/gm           // Simple format: Name: Description
      ];
      
      for (const pattern of relationshipPatterns) {
        let relMatch;
        while ((relMatch = pattern.exec(relationshipsText)) !== null) {
          relationships.push({
            character: relMatch[1].trim(),
            description: relMatch[2].trim()
          });
        }
      }
      
      // If no relationships were found using patterns, try paragraph-based extraction
      if (relationships.length === 0 && relationshipsText) {
        const paragraphs = relationshipsText.split('\n\n');
        paragraphs.forEach(para => {
          const parts = para.split(' - ');
          if (parts.length >= 2) {
            relationships.push({
              character: parts[0].trim(),
              description: parts.slice(1).join(' - ').trim()
            });
          }
        });
      }
      
      // Process secrets
      let secrets: string[] = [];
      if (secretsText) {
        // Try numbered list pattern (1. Secret)
        const numberedSecretPattern = /\d+\.\s*([^\n]+)/g;
        let secretMatch;
        while ((secretMatch = numberedSecretPattern.exec(secretsText)) !== null) {
          secrets.push(secretMatch[1].trim());
        }
        
        // Try bulleted list pattern (- Secret or * Secret)
        if (secrets.length === 0) {
          const bulletedSecretPattern = /[-*]\s*([^\n]+)/g;
          while ((secretMatch = bulletedSecretPattern.exec(secretsText)) !== null) {
            secrets.push(secretMatch[1].trim());
          }
        }
        
        // If no structured secrets found, use paragraphs
        if (secrets.length === 0) {
          secrets = secretsText.split('\n\n')
            .map(s => s.trim())
            .filter(s => s.length > 0);
        }
        
        // If still empty but we have text, use the whole thing as one secret
        if (secrets.length === 0 && secretsText.trim()) {
          secrets = [secretsText.trim()];
        }
      }
      
      // Extract round statements
      const round1StatementPattern = /IF YOU ARE INNOCENT:\s*"([^"]+)"/i;
      const round1Match = round1Text.match(round1StatementPattern);
      const round1Statement = round1Match ? round1Match[1].trim() : '';
      
      const round2StatementPattern = /IF YOU ARE INNOCENT:\s*"([^"]+)"/i;
      const round2Match = round2Text.match(round2StatementPattern);
      const round2Statement = round2Match ? round2Match[1].trim() : '';
      
      const round3StatementPattern = /IF YOU ARE INNOCENT:\s*"([^"]+)"/i;
      const round3Match = round3Text.match(round3StatementPattern);
      const round3Statement = round3Match ? round3Match[1].trim() : '';

      // Extract scripts for different roles
      // Find innocent, guilty and accomplice statements
      const extractRoleScript = (text: string, role: string): string => {
        const pattern = new RegExp(`IF YOU ARE ${role}:\\s*"([^"]+)"`, 'i');
        const match = text.match(pattern);
        return match ? match[1].trim() : '';
      };
      
      const finalInnocent = extractRoleScript(finalStatementText, 'INNOCENT');
      const finalGuilty = extractRoleScript(finalStatementText, 'GUILTY');
      const finalAccomplice = extractRoleScript(finalStatementText, 'ACCOMPLICE');
      
      const round2Innocent = extractRoleScript(round2Text, 'INNOCENT');
      const round2Guilty = extractRoleScript(round2Text, 'GUILTY');
      const round2Accomplice = extractRoleScript(round2Text, 'ACCOMPLICE');
      
      const round3Innocent = extractRoleScript(round3Text, 'INNOCENT');
      const round3Guilty = extractRoleScript(round3Text, 'GUILTY');
      const round3Accomplice = extractRoleScript(round3Text, 'ACCOMPLICE');
      
      const characterObj: MysteryCharacter = {
        id: '',  // Will be assigned when saved to DB
        package_id: '', // Will be assigned when saved to DB
        character_name: characterName,
        description,
        background,
        relationships,
        secrets,
        introduction,
        whereabouts: whereaboutsText,
        round1_statement: round1Statement,
        round2_statement: round2Statement,
        round3_statement: round3Statement,
        questioning_options: questioningOptions,
        round_scripts: {
          introduction,
          round1: round1Statement,
          round2: {
            innocent: round2Innocent,
            guilty: round2Guilty,
            accomplice: round2Accomplice
          },
          round3: {
            innocent: round3Innocent,
            guilty: round3Guilty,
            accomplice: round3Accomplice
          },
          final: {
            innocent: finalInnocent,
            guilty: finalGuilty,
            accomplice: finalAccomplice
          }
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      characters.push(characterObj);
    }
    
    return characters;
  };

  const extractContentFromMarkdown = (content: string) => {
    if (!content) return;
    
    try {
      // Extract host guide
      const hostGuideMatch = content.match(/# .+ - HOST GUIDE\n([\s\S]*?)(?=# |$)/i);
      const hostGuide = hostGuideMatch ? hostGuideMatch[1].trim() : '';
      
      // Extract inspector script
      const inspectorScriptMatch = content.match(/# (?:INSPECTOR|DETECTIVE) SCRIPT\n([\s\S]*?)(?=# |$)/i);
      const inspectorScript = inspectorScriptMatch ? inspectorScriptMatch[1].trim() : '';
      
      // Extract evidence cards
      const evidenceCards: any[] = [];
      const evidencePattern = /# EVIDENCE: (.*?)\n([\s\S]*?)(?=# EVIDENCE:|# |$)/gi;
      let evidenceMatch;
      
      while ((evidenceMatch = evidencePattern.exec(content)) !== null) {
        const title = evidenceMatch[1].trim();
        const cardContent = evidenceMatch[2].trim();
        evidenceCards.push({
          title,
          content: cardContent,
          description: '',
          implication: ''
        });
      }
      
      // Extract character matrix
      const matrixMatch = content.match(/# CHARACTER RELATIONSHIP MATRIX\n([\s\S]*?)(?=# |$)/i);
      let characterMatrix = matrixMatch ? matrixMatch[1].trim() : '';
      
      // Convert matrix text to HTML table if needed
      if (characterMatrix && characterMatrix.includes('|')) {
        characterMatrix = formatMatrixAsTable(characterMatrix);
      }
      
      // Extract characters
      const extractedCharacters = extractCharactersFromContent(content);
      
      // Store the data
      setTabData({
        hostGuide,
        characters: extractedCharacters,
        clues: evidenceCards,
        inspectorScript,
        characterMatrix
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error extracting content:", error);
      toast.error("Failed to process mystery content");
      setLoading(false);
    }
  };

  const extractSection = (content: string, sectionName: string, nextSectionName?: string): string => {
    if (!content) return '';
    
    const sectionPattern = new RegExp(`(?:##?\\s*${sectionName}|${sectionName}:)([\\s\\S]*?)${nextSectionName ? `(?:##?\\s*${nextSectionName}|${nextSectionName}:)` : '$'}`, 'i');
    const match = content.match(sectionPattern);
    
    return match ? match[1].trim() : '';
  };

  // Get any streaming content if available, otherwise use loaded content
  const finalTabData = {
    hostGuide: streamingContent?.hostGuide || tabData.hostGuide,
    characters: streamingContent?.characters?.length ? streamingContent.characters : tabData.characters,
    clues: streamingContent?.clues?.length ? streamingContent.clues : tabData.clues,
    inspectorScript: streamingContent?.inspectorScript || tabData.inspectorScript,
    characterMatrix: streamingContent?.characterMatrix || tabData.characterMatrix
  };

  // Empty state component
  const EmptyStateView = () => (
    <div className="flex flex-col items-center justify-center h-96 text-center">
      <Sparkles className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-2xl font-semibold mb-2">Your mystery package awaits creation</h3>
      <p className="text-muted-foreground mb-6 max-w-md">
        Generate your complete murder mystery with character guides, host instructions, and all game materials.
      </p>
      <Button 
        size="lg" 
        className="animate-pulse" 
        onClick={onGenerateClick}
      >
        <Sparkles className="h-5 w-5 mr-2" />
        Generate Mystery Package
      </Button>
    </div>
  );

  // Generate typing cursor effect
  const typingCursor = isGenerating && showCursor ? (
    <span className="inline-block w-2 h-4 bg-primary ml-1 animate-pulse" />
  ) : null;

  // Determine if each tab is currently being generated
  const isTabGenerating = (tabId: string) => {
    if (!isGenerating) return false;
    
    switch (tabId) {
      case 'host-guide': 
        return streamingContent?.currentlyGenerating === 'hostGuide';
      case 'characters': 
        return streamingContent?.currentlyGenerating === 'characters';
      case 'clues': 
        return streamingContent?.currentlyGenerating === 'clues';
      case 'detective-script': 
        return streamingContent?.currentlyGenerating === 'inspectorScript';
      case 'character-matrix': 
        return streamingContent?.currentlyGenerating === 'characterMatrix';
      default: 
        return false;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (isEmpty && onGenerateClick) {
    return <EmptyStateView />;
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full flex flex-wrap justify-start mb-4 bg-muted/20">
          <TabsTrigger 
            value="host-guide" 
            className={`${isTabGenerating('host-guide') ? 'animate-pulse' : ''}`}
            disabled={isEmpty && !isGenerating}
          >
            <Book className="h-4 w-4 mr-2" />
            <span>Host Guide</span>
            {isTabGenerating('host-guide') && <span className="ml-2 text-xs">(Generating...)</span>}
          </TabsTrigger>
          
          <TabsTrigger 
            value="characters"
            className={`${isTabGenerating('characters') ? 'animate-pulse' : ''}`}
            disabled={isEmpty && !isGenerating}
          >
            <Users className="h-4 w-4 mr-2" />
            <span>Characters</span>
            {isTabGenerating('characters') && <span className="ml-2 text-xs">(Generating...)</span>}
          </TabsTrigger>
          
          <TabsTrigger 
            value="clues"
            className={`${isTabGenerating('clues') ? 'animate-pulse' : ''}`}
            disabled={isEmpty && !isGenerating}
          >
            <FileText className="h-4 w-4 mr-2" />
            <span>Clues & Evidence</span>
            {isTabGenerating('clues') && <span className="ml-2 text-xs">(Generating...)</span>}
          </TabsTrigger>
          
          <TabsTrigger 
            value="detective-script"
            className={`${isTabGenerating('detective-script') ? 'animate-pulse' : ''}`}
            disabled={isEmpty && !isGenerating}
          >
            <FileCode className="h-4 w-4 mr-2" />
            <span>Detective Script</span>
            {isTabGenerating('detective-script') && <span className="ml-2 text-xs">(Generating...)</span>}
          </TabsTrigger>
          
          <TabsTrigger 
            value="character-matrix"
            className={`${isTabGenerating('character-matrix') ? 'animate-pulse' : ''}`}
            disabled={isEmpty && !isGenerating}
          >
            <Grid2x2 className="h-4 w-4 mr-2" />
            <span>Character Matrix</span>
            {isTabGenerating('character-matrix') && <span className="ml-2 text-xs">(Generating...)</span>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="host-guide" className="mt-4">
          {finalTabData.hostGuide ? (
            <div className="space-y-6">
              <div className="bg-card p-6 rounded-lg shadow-sm">
                <div className="prose prose-stone dark:prose-invert max-w-none mystery-prose">
                  <ReactMarkdown>{finalTabData.hostGuide}</ReactMarkdown>
                  {isTabGenerating('host-guide') && typingCursor}
                </div>
              </div>

              <div className="bg-card p-6 rounded-lg shadow-sm">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="section-card border-0 shadow-sm">
                    <CardHeader className="pb-2">
                      <CardTitle>Setup</CardTitle>
                    </CardHeader>
                    <CardContent className="section-card-content">
                      <div className="prose prose-stone dark:prose-invert max-w-none mystery-prose">
                        <ReactMarkdown>{extractSection(finalTabData.hostGuide, "SETUP")}</ReactMarkdown>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-muted/10 p-6 rounded-lg border border-dashed border-muted flex items-center justify-center">
              <p className="text-muted-foreground text-center">
                {isGenerating ? "Generating host guide..." : "Host guide not available yet"}
                {isTabGenerating('host-guide') && typingCursor}
              </p>
            </div>
          )}
        </TabsContent>

        {/* Additional TabsContent sections for other tabs would go here */}
      </Tabs>
    </div>
  );
};

export default MysteryPackageTabView;
