import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from 'react-markdown';
import { toast } from "sonner";

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
    round1_statement: string;
    round2_statement: string;
    round3_statement: string;
    round2_questions: string;
    round3_questions: string;
    round4_questions: string;
    round2_innocent: string;
    round2_guilty: string;
    round2_accomplice: string;
    round3_innocent: string;
    round3_guilty: string;
    round3_accomplice: string;
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
      
      const { data, error } = await supabase
        .from('character_assignments')
        .select(`
          id,
          guest_name,
          guest_email,
          mystery_characters!inner (
            character_name,
            description,
            background,
            secret,
            introduction,
            rumors,
            round1_statement,
            round2_statement,
            round3_statement,
            round2_questions,
            round3_questions,
            round4_questions,
            round2_innocent,
            round2_guilty,
            round2_accomplice,
            round3_innocent,
            round3_guilty,
            round3_accomplice,
            round4_innocent,
            round4_guilty,
            round4_accomplice,
            final_innocent,
            final_guilty,
            final_accomplice,
            relationships,
            secrets
          )
        `)
        .eq('access_token', token)
        .eq('is_sent', true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          setError('Character assignment not found or access denied. This link may be invalid or expired.');
        } else {
          console.error('Database error:', error);
          setError(`Error loading character: ${error.message}`);
        }
        return;
      }

      if (!data) {
        setError('Character assignment not found');
        return;
      }

      setAssignment(data);
    } catch (error: any) {
      console.error('Error loading character assignment:', error);
      setError(`Failed to load character: ${error.message || 'Unknown error'}`);
      toast.error('Failed to load character assignment');
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
    
    // Add round statements and responses
    if (character.round1_statement) {
      content += `## Round 1: Initial Statement\n\n${character.round1_statement}\n\n`;
    }
    
    if (character.round2_statement) {
      content += `## Round 2: Motives\n\n${character.round2_statement}\n\n`;
    
      if (character.round2_questions) {
        content += `### Questions to Ask\n\n${character.round2_questions}\n\n`;
      }
      
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
    
    // Continue with rounds 3 and 4...
    if (character.round3_statement) {
      content += `## Round 3: Method\n\n${character.round3_statement}\n\n`;
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
          <p>Loading your character...</p>
        </div>
      </div>
    );
  }

  if (error || !assignment) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-center text-red-600">Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              {error || 'Character assignment not found.'}
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
            <h1 className="text-2xl font-bold">Welcome, {assignment.guest_name}!</h1>
          </div>
          <p className="text-muted-foreground">
            Here's your character guide for the mystery game
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
                }}
              >
                {characterContent}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CharacterAccess;
