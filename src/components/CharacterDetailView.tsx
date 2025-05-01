
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MysteryCharacter, normalizeCharacterRelationships, normalizeCharacterSecrets } from "@/interfaces/mystery";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';

interface CharacterDetailViewProps {
  character: MysteryCharacter;
  isGuilty?: boolean;
  isAccomplice?: boolean;
  showFullScript?: boolean;
}

export function CharacterDetailView({ 
  character,
  isGuilty = false,
  isAccomplice = false,
  showFullScript = true
}: CharacterDetailViewProps) {
  // Normalize relationships and secrets
  const relationships = normalizeCharacterRelationships(character.relationships);
  const secrets = normalizeCharacterSecrets(character.secrets);

  // Determine role for script selection
  const role = isGuilty ? 'guilty' : (isAccomplice ? 'accomplice' : 'innocent');

  // Format content for markdown rendering
  const formatForMarkdown = (content?: string) => {
    if (!content) return '';
    
    // Check if content already has markdown headers, if not, add them
    if (!content.includes('#') && !content.includes('*')) {
      return content.split('\n').map(line => line.trim()).join('\n\n');
    }
    return content;
  };

  return (
    <div className="space-y-8">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{character.character_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {character.description && (
            <div>
              <h3 className="text-lg font-semibold mb-2">Character Description</h3>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                  {formatForMarkdown(character.description)}
                </ReactMarkdown>
              </div>
            </div>
          )}
          
          {character.background && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2">Background</h3>
                <div className="prose dark:prose-invert max-w-none">
                  <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                    {formatForMarkdown(character.background)}
                  </ReactMarkdown>
                </div>
              </div>
            </>
          )}

          {relationships.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2">Relationships</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {relationships.map((rel, index) => (
                    <li key={index}>
                      <strong>{rel.character}</strong>: {rel.description}
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {secrets.length > 0 && (
            <>
              <Separator />
              <div>
                <h3 className="text-lg font-semibold mb-2">Secrets</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {secrets.map((secret, index) => (
                    <li key={index}>{secret}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Whereabouts */}
      {character.whereabouts && (
        <Card>
          <CardHeader>
            <CardTitle>Whereabouts During the Murder</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {formatForMarkdown(character.whereabouts)}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Introduction */}
      {(character.introduction || character.round_scripts?.introduction) && (
        <Card>
          <CardHeader>
            <CardTitle>Introduction</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {formatForMarkdown(character.introduction || character.round_scripts?.introduction || '')}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Round 1 */}
      {(character.round1_statement || character.round_scripts?.round1) && (
        <Card>
          <CardHeader>
            <CardTitle>Round 1: Initial Investigation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {formatForMarkdown(character.round1_statement || character.round_scripts?.round1 || '')}
              </ReactMarkdown>
            </div>
            
            {/* Questions */}
            {character.questioning_options && character.questioning_options.length > 0 && (
              <div className="mt-4">
                <h3 className="text-lg font-semibold mb-2">Questioning Options</h3>
                <ul className="list-disc pl-5 space-y-2">
                  {character.questioning_options.map((q, idx) => (
                    <li key={idx}>
                      <strong>Ask {q.target}:</strong> "{q.question}"
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Round 2 */}
      {showFullScript && (character.round2_statement || 
        (character.round_scripts?.round2 && (
          character.round_scripts.round2.innocent || 
          character.round_scripts.round2.guilty || 
          character.round_scripts.round2.accomplice
        ))) && (
        <Card>
          <CardHeader>
            <CardTitle>Round 2: Deeper Revelations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {formatForMarkdown(
                  character.round2_statement || 
                  (character.round_scripts?.round2 && character.round_scripts.round2[role as keyof ScriptOptions]) || 
                  ''
                )}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Round 3 */}
      {showFullScript && (character.round3_statement || 
        (character.round_scripts?.round3 && (
          character.round_scripts.round3.innocent || 
          character.round_scripts.round3.guilty || 
          character.round_scripts.round3.accomplice
        ))) && (
        <Card>
          <CardHeader>
            <CardTitle>Round 3: Final Clues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {formatForMarkdown(
                  character.round3_statement || 
                  (character.round_scripts?.round3 && character.round_scripts.round3[role as keyof ScriptOptions]) || 
                  ''
                )}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Statement */}
      {showFullScript && character.round_scripts?.final && (
        character.round_scripts.final.innocent || 
        character.round_scripts.final.guilty || 
        character.round_scripts.final.accomplice
      ) && (
        <Card>
          <CardHeader>
            <CardTitle>Final Statement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {formatForMarkdown(
                  (character.round_scripts?.final && character.round_scripts.final[role as keyof ScriptOptions]) || 
                  ''
                )}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

interface ScriptOptions {
  innocent?: string;
  guilty?: string;
  accomplice?: string;
}

export default CharacterDetailView;
