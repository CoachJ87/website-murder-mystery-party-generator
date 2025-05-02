
// src/components/MysteryPackageTabView.tsx
import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book, Users, FileText, FileCode, Grid2x2, Download } from "lucide-react";
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { GenerationStatus } from "@/services/mysteryPackageService";
import { supabase } from "@/lib/supabase";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "sonner";
import { MysteryCharacter } from "@/interfaces/mystery";

export interface MysteryPackageTabViewProps {
  packageContent?: string;
  mysteryTitle: string;
  generationStatus?: GenerationStatus;
  isGenerating?: boolean;
  conversationId?: string;
}

interface EvidenceCard {
  title: string;
  content: string;
  description?: string;
  implication?: string;
}

interface TabData {
  hostGuide: string;
  characters: MysteryCharacter[];
  clues: EvidenceCard[];
  inspectorScript: string;
  characterMatrix: string;
}

const MysteryPackageTabView: React.FC<MysteryPackageTabViewProps> = ({
  packageContent,
  mysteryTitle,
  generationStatus,
  isGenerating,
  conversationId
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
      let evidenceCards: EvidenceCard[] = [];
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

  const extractSection = (content: string, sectionName: string): string => {
    const pattern = new RegExp(`##\\s*(?:${sectionName})\\s*\\n([\\s\\S]*?)(?=##|$)`, 'i');
    const match = content.match(pattern);
    if (match) return match[1].trim();
    
    // Try alternative pattern with no ## markers
    const altPattern = new RegExp(`${sectionName}\\s*\\n([\\s\\S]*?)(?=(?:ROUND|YOUR|FINAL|CHOOSE|$))`, 'i');
    const altMatch = content.match(altPattern);
    return altMatch ? altMatch[1].trim() : '';
  };

  const extractContentFromMarkdown = (content: string) => {
    // This is a fallback for when we only have the packageContent string
    // and not direct database access
    try {
      const hostGuideMatch = content.match(/# (?:HOST GUIDE|.*HOST GUIDE).*?\n([\s\S]*?)(?=# |$)/i);
      const inspectorScriptMatch = content.match(/# (?:INSPECTOR SCRIPT|DETECTIVE SCRIPT).*?\n([\s\S]*?)(?=# |$)/i);
      const characterMatrixMatch = content.match(/# (?:CHARACTER RELATIONSHIP MATRIX|RELATIONSHIP MATRIX).*?\n([\s\S]*?)(?=# |$)/i);
      
      // Extract evidence cards directly
      const evidenceCards: EvidenceCard[] = [];
      const evidencePattern = /(?:## EVIDENCE CARD #?\d+:?\s*([^\n]+)|"?EVIDENCE CARD #?\d+:?\s*([^\n]+)"?)([\s\S]*?)(?=(?:## EVIDENCE CARD)|##|# |$)/gi;
      let evidenceMatch;
      
      while ((evidenceMatch = evidencePattern.exec(content)) !== null) {
        const title = (evidenceMatch[1] || evidenceMatch[2] || "Evidence").trim();
        const description = evidenceMatch[3]?.trim() || "";
        
        evidenceCards.push({
          title,
          content: description,
          description: ""
        });
      }
      
      // Use the extractCharactersFromContent function for characters
      const characters = extractCharactersFromContent(content);
      
      let characterMatrix = '';
      if (characterMatrixMatch && characterMatrixMatch[1]) {
        characterMatrix = formatMatrixAsTable(characterMatrixMatch[1].trim());
      }
      
      setTabData({
        hostGuide: hostGuideMatch?.[1]?.trim() || '',
        characters,
        clues: evidenceCards.length > 0 ? evidenceCards : [],
        inspectorScript: inspectorScriptMatch?.[1]?.trim() || '',
        characterMatrix
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Error extracting content from markdown:", error);
      setLoading(false);
      toast.error("Failed to extract mystery content");
    }
  };

  const renderCharacters = () => {
    if (tabData.characters.length === 0) {
      return <p className="text-center py-8">No character information available.</p>;
    }

    return (
      <div className="space-y-4">
        <Accordion type="single" collapsible className="w-full">
          {tabData.characters.map((character, index) => (
            <AccordionItem key={index} value={`character-${index}`}>
              <AccordionTrigger className="text-lg font-semibold hover:no-underline">
                {character.character_name}
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-6 p-4 rounded-md bg-card/50">
                  {character.description && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Character Description</h3>
                      <p className="text-base">{character.description}</p>
                    </div>
                  )}
                  
                  {character.background && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Background</h3>
                      <div className="prose prose-sm max-w-none">
                        <ReactMarkdown>{character.background}</ReactMarkdown>
                      </div>
                    </div>
                  )}
                  
                  {character.relationships?.length > 0 && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Relationships</h3>
                      <ul className="list-disc pl-5 space-y-2">
                        {character.relationships.map((rel, idx) => (
                          <li key={idx} className="mb-1">
                            <strong>{rel.character}:</strong> {rel.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {character.secrets?.length > 0 && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Secrets</h3>
                      <ul className="list-disc pl-5 space-y-2">
                        {character.secrets.map((secret, idx) => (
                          <li key={idx}>{secret}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {character.whereabouts && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Whereabouts During the Murder</h3>
                      <p className="text-base">{character.whereabouts}</p>
                    </div>
                  )}
                  
                  {character.introduction && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Introduction</h3>
                      <div className="p-3 bg-background rounded-md italic">
                        "{character.introduction}"
                      </div>
                    </div>
                  )}
                  
                  {character.questioning_options && character.questioning_options.length > 0 && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Questioning Options</h3>
                      <ul className="list-disc pl-5 space-y-2">
                        {character.questioning_options.map((option, idx) => (
                          <li key={idx}>
                            Ask <strong>{option.target}</strong>: "{option.question}"
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {(character.round1_statement || character.round_scripts?.round1) && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Round 1 Response</h3>
                      <div className="p-3 bg-background rounded-md italic">
                        "{character.round1_statement || character.round_scripts?.round1}"
                      </div>
                    </div>
                  )}
                  
                  {(character.round2_statement || 
                    character.round_scripts?.round2?.innocent || 
                    character.round_scripts?.round2?.guilty) && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Round 2 Response</h3>
                      {character.round2_statement && (
                        <div className="p-3 bg-background rounded-md italic mb-2">
                          "{character.round2_statement}"
                        </div>
                      )}
                      {character.round_scripts?.round2?.innocent && (
                        <div className="p-3 bg-background rounded-md italic mb-2">
                          <strong>If Innocent:</strong> "{character.round_scripts.round2.innocent}"
                        </div>
                      )}
                      {character.round_scripts?.round2?.guilty && (
                        <div className="p-3 bg-background rounded-md italic mb-2">
                          <strong>If Guilty:</strong> "{character.round_scripts.round2.guilty}"
                        </div>
                      )}
                    </div>
                  )}
                  
                  {(character.round3_statement || 
                    character.round_scripts?.round3?.innocent || 
                    character.round_scripts?.round3?.guilty) && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Round 3 Response</h3>
                      {character.round3_statement && (
                        <div className="p-3 bg-background rounded-md italic mb-2">
                          "{character.round3_statement}"
                        </div>
                      )}
                      {character.round_scripts?.round3?.innocent && (
                        <div className="p-3 bg-background rounded-md italic mb-2">
                          <strong>If Innocent:</strong> "{character.round_scripts.round3.innocent}"
                        </div>
                      )}
                      {character.round_scripts?.round3?.guilty && (
                        <div className="p-3 bg-background rounded-md italic mb-2">
                          <strong>If Guilty:</strong> "{character.round_scripts.round3.guilty}"
                        </div>
                      )}
                    </div>
                  )}
                  
                  {(character.round_scripts?.final?.innocent || 
                    character.round_scripts?.final?.guilty || 
                    character.round_scripts?.final?.accomplice) && (
                    <div>
                      <h3 className="text-md font-semibold mb-2">Final Statement</h3>
                      
                      {character.round_scripts.final.innocent && (
                        <div className="p-3 bg-background rounded-md italic mb-2">
                          <strong>If innocent:</strong> "{character.round_scripts.final.innocent}"
                        </div>
                      )}
                      
                      {character.round_scripts.final.guilty && (
                        <div className="p-3 bg-background rounded-md italic mb-2">
                          <strong>If guilty:</strong> "{character.round_scripts.final.guilty}"
                        </div>
                      )}
                      
                      {character.round_scripts.final.accomplice && (
                        <div className="p-3 bg-background rounded-md italic mb-2">
                          <strong>If accomplice:</strong> "{character.round_scripts.final.accomplice}"
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    );
  };

  const renderClues = () => {
    if (tabData.clues.length === 0) {
      return <p className="text-center py-8">No clue information available.</p>;
    }

    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold mb-6">Clues and Evidence</h1>
        
        <div className="grid gap-6 md:grid-cols-2">
          {tabData.clues.map((clue, index) => (
            <div key={index} className="border rounded-lg p-4 bg-card/50">
              <h2 className="text-xl font-semibold mb-2">{clue.title}</h2>
              {clue.description && (
                <div className="mb-4">
                  <h3 className="text-md font-medium mb-1">Description</h3>
                  <p className="text-base">{clue.description}</p>
                </div>
              )}
              {clue.content && (
                <div className="mb-4">
                  <div className="prose prose-sm max-w-none">
                    <ReactMarkdown>{clue.content}</ReactMarkdown>
                  </div>
                </div>
              )}
              {clue.implication && (
                <div>
                  <h3 className="text-md font-medium mb-1">Implications</h3>
                  <p className="text-base">{clue.implication}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const handleDownloadPDF = () => {
    // PDF download functionality would be implemented here
    console.log("Download PDF requested");
    toast.info("PDF download functionality is coming soon");
  };
  
  if (loading) {
    return (
      <Card>
        <CardContent className="p-6 flex justify-center items-center h-64">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-2">Loading mystery content...</span>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-2xl font-bold">{mysteryTitle}</CardTitle>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleDownloadPDF}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          <span>Download PDF</span>
        </Button>
      </CardHeader>
      
      <CardContent>
        <Tabs defaultValue="host-guide" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="border-b pb-2 mb-4">
            <TabsList className="h-10 p-0 bg-transparent space-x-2 w-full overflow-x-auto flex-nowrap">
              <TabsTrigger 
                value="host-guide" 
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-foreground px-3 py-1.5 h-10 whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <Book className="h-4 w-4" />
                  <span>Host Guide</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="characters" 
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-foreground px-3 py-1.5 h-10 whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Characters</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="clues" 
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-foreground px-3 py-1.5 h-10 whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span>Clues</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="inspector-script" 
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-foreground px-3 py-1.5 h-10 whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <FileCode className="h-4 w-4" />
                  <span>Detective Script</span>
                </div>
              </TabsTrigger>
              <TabsTrigger 
                value="character-matrix" 
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-foreground px-3 py-1.5 h-10 whitespace-nowrap"
              >
                <div className="flex items-center gap-2">
                  <Grid2x2 className="h-4 w-4" />
                  <span>Character Matrix</span>
                </div>
              </TabsTrigger>
            </TabsList>
          </div>
          
          <TabsContent value="host-guide" className="mt-6">
            <div className="prose prose-stone dark:prose-invert max-w-none">
              <h1 className="text-2xl font-bold mb-6">Host Guide</h1>
              <ReactMarkdown>{tabData.hostGuide}</ReactMarkdown>
            </div>
          </TabsContent>
          
          <TabsContent value="characters" className="mt-6">
            {renderCharacters()}
          </TabsContent>
          
          <TabsContent value="clues" className="mt-6">
            {renderClues()}
          </TabsContent>
          
          <TabsContent value="inspector-script" className="mt-6">
            <div className="prose prose-stone dark:prose-invert max-w-none">
              <h1 className="text-2xl font-bold mb-6">Detective Script</h1>
              <ReactMarkdown>{tabData.inspectorScript}</ReactMarkdown>
            </div>
          </TabsContent>
          
          <TabsContent value="character-matrix" className="mt-6">
            <h1 className="text-2xl font-bold mb-6">Character Matrix</h1>
            {tabData.characterMatrix ? (
              <div 
                className="prose prose-stone dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: tabData.characterMatrix }}
              />
            ) : (
              <p className="text-center py-8">Character relationship matrix is not available.</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default MysteryPackageTabView;
