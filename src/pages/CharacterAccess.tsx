import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface CharacterAssignment {
  id: string;
  guest_name: string;
  guest_email: string;
  mystery_characters: {
    character_name: string;
    description: string;
    background: string;
    secret: string;
    introduction: string;
    rumors: string;
    round2_questions: string;
    round3_questions: string;
    round2_innocent: string;
    round2_guilty: string;
    round2_accomplice: string;
    round3_innocent: string;
    round3_guilty: string;
    round3_accomplice: string;
    round4_questions: string;
    round4_innocent: string;
    round4_guilty: string;
    round4_accomplice: string;
    final_innocent: string;
    final_guilty: string;
    final_accomplice: string;
    relationships: any;
    secrets: any;
  };
}

const CharacterAccess: React.FC = () => {
  const { t } = useTranslation();
  const { token } = useParams<{ token: string }>();
  const [assignment, setAssignment] = useState<CharacterAssignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (token) {
      loadCharacterAssignment();
    } else {
      setError("No access token provided");
      setLoading(false);
    }
  }, [token]);

  const loadCharacterAssignment = async () => {
    if (!token) {
      setError("Access token is required");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // First, get the character assignment
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('character_assignments')
        .select('id, guest_name, guest_email, character_id')
        .eq('access_token', token)
        .eq('is_sent', true)
        .single();

      if (assignmentError) {
        console.error('Assignment error:', assignmentError);
        setError('Character assignment not found or access denied.');
        return;
      }

      // Then, get the character details
      const { data: characterData, error: characterError } = await supabase
        .from('mystery_characters')
        .select('*')
        .eq('id', assignmentData.character_id)
        .single();

      if (characterError) {
        console.error('Character error:', characterError);
        setError('Character data not found.');
        return;
      }

      // Combine the data
      setAssignment({
        ...assignmentData,
        mystery_characters: characterData
      });
    } catch (error: any) {
      console.error('Error loading character assignment:', error);
      setError(`Failed to load character: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const buildCharacterGuideContent = (character: any): string => {
    let content = `# ${character.character_name} - Your Character\n\n`;
    
    if (character.description) {
      content += `${character.description}\n\n`;
    }
    
    if (character.background) {
      content += `## Your Background\n\n${character.background}\n\n`;
    }
    
    if (character.secret) {
      content += `## Your Secret\n\n${character.secret}\n\n`;
    }
    
    if (character.introduction) {
      content += `## Introduction\n\n${character.introduction}\n\n`;
    }
    
    if (character.rumors) {
      content += `## Rumors You Know\n\n${character.rumors}\n\n`;
    }
    
    // Add round responses
    if (character.round2_questions) {
      content += `## Round 2 Questions\n\n${character.round2_questions}\n\n`;

      if (character.round2_innocent) {
        content += `**If You're Innocent:**\n${character.round2_innocent}\n\n`;
      }

      if (character.round2_guilty) {
        content += `**If You're Guilty:**\n${character.round2_guilty}\n\n`;
      }

      if (character.round2_accomplice) {
        content += `**If You're an Accomplice:**\n${character.round2_accomplice}\n\n`;
      }
    }

    if (character.round3_questions) {
      content += `## Round 3 Questions\n\n${character.round3_questions}\n\n`;

      if (character.round3_innocent) {
        content += `**If You're Innocent:**\n${character.round3_innocent}\n\n`;
      }

      if (character.round3_guilty) {
        content += `**If You're Guilty:**\n${character.round3_guilty}\n\n`;
      }

      if (character.round3_accomplice) {
        content += `**If You're an Accomplice:**\n${character.round3_accomplice}\n\n`;
      }
    }

    if (character.round4_questions) {
      content += `## Round 4 Questions\n\n${character.round4_questions}\n\n`;

      if (character.round4_innocent) {
        content += `**If You're Innocent:**\n${character.round4_innocent}\n\n`;
      }

      if (character.round4_guilty) {
        content += `**If You're Guilty:**\n${character.round4_guilty}\n\n`;
      }

      if (character.round4_accomplice) {
        content += `**If You're an Accomplice:**\n${character.round4_accomplice}\n\n`;
      }
    }
      
    if (character.final_innocent) {
      content += `**If You're Innocent:**\n${character.final_innocent}\n\n`;
    }
    
    if (character.final_guilty) {
      content += `**If You're Guilty:**\n${character.final_guilty}\n\n`;
    }
    
    if (character.final_accomplice) {
      content += `**If You're an Accomplice:**\n${character.final_accomplice}\n\n`;
    }

    if (character.accusations) {
      content += `${character.accusations}\n\n`;
    }
    
    return content;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p>{t('character.access.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center text-red-600">{t('character.access.accessDenied')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              {error || t('character.access.characterNotFound')}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const characterContent = buildCharacterGuideContent(assignment.mystery_characters);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <User className="h-6 w-6" />
            <h1 className="text-2xl font-bold">{t('character.access.welcome', { name: assignment.guest_name })}</h1>
          </div>
          <p className="text-muted-foreground">
            {t('character.access.guide.description')}
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            <div className="mystery-content">
              <ReactMarkdown
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-2xl font-bold mb-4 text-primary">
                      {children}
                    </h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-xl font-semibold mb-3 text-secondary">
                      {children}
                    </h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-lg font-medium mb-2">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="mb-4 leading-relaxed">
                      {children}
                    </p>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold text-foreground">
                      {children}
                    </strong>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-4 space-y-2">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-4 space-y-2">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="ml-2">
                      {children}
                    </li>
                  ),
                }}
              >
                {buildCharacterGuideContent(assignment.mystery_characters)}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CharacterAccess;
