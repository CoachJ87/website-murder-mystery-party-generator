import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { MysteryCharacter, normalizeCharacterRelationships, normalizeCharacterSecrets } from "@/interfaces/mystery";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
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

  // Helper function to get the appropriate script for a round based on role
  const getRoundScript = (roundKey: string) => {
    if (!character.round_scripts) return null;
    
    // Direct statement takes precedence if available
    const directStatement = character[`${roundKey}_statement` as keyof MysteryCharacter];
    if (directStatement) return directStatement as string;
    
    // Otherwise look in round_scripts
    const roundScripts = character.round_scripts[roundKey as keyof typeof character.round_scripts];
    if (!roundScripts) return null;
    
    // If roundScripts is an object with role-specific responses
    if (typeof roundScripts === 'object' && roundScripts !== null) {
      return (roundScripts as any)[role] || null;
    }
    
    // If roundScripts is a string
    if (typeof roundScripts === 'string') {
      return roundScripts;
    }
    
    return null;
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
              <h3 className="text-lg font-semibold mb-2">{t('character.detail.description')}</h3>
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
                <h3 className="text-lg font-semibold mb-2">{t('character.detail.background')}</h3>
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
                <h3 className="text-lg font-semibold mb-2">{t('character.detail.relationships')}</h3>
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
                <h3 className="text-lg font-semibold mb-2">{t('character.detail.secrets')}</h3>
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
            <CardTitle>{t('character.detail.whereabouts')}</CardTitle>
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
      {(character.introduction || (character.round_scripts?.introduction)) && (
        <Card>
          <CardHeader>
            <CardTitle>{t('character.detail.introduction')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {formatForMarkdown(character.introduction || (character.round_scripts?.introduction as string) || '')}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Round 1 */}
      {(() => {
        const round1Content = getRoundScript('round1');
        return round1Content ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('character.detail.round1')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                  {formatForMarkdown(round1Content)}
                </ReactMarkdown>
              </div>
              
              {/* Questions */}
              {character.questioning_options && character.questioning_options.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">{t('character.detail.questioningOptions')}</h3>
                  <ul className="list-disc pl-5 space-y-2">
                    {character.questioning_options.map((q, idx) => (
                      <li key={idx}>
                        <strong>{t('character.detail.askTarget', { target: q.target })}:</strong> "{q.question}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Round 2 */}
      {showFullScript && (() => {
        const round2Content = getRoundScript('round2');
        return round2Content ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('character.detail.round2')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                  {formatForMarkdown(round2Content)}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Round 3 */}
      {showFullScript && (() => {
        const round3Content = getRoundScript('round3');
        return round3Content ? (
          <Card>
            <CardHeader>
              <CardTitle>{t('character.detail.round3')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose dark:prose-invert max-w-none">
                <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                  {formatForMarkdown(round3Content)}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        ) : null;
      })()}

      {/* Final Statement */}
      {showFullScript && character.round_scripts?.final && (
        <Card>
          <CardHeader>
            <CardTitle>{t('character.detail.finalStatement')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="prose dark:prose-invert max-w-none">
              <ReactMarkdown rehypePlugins={[rehypeRaw]}>
                {formatForMarkdown(
                  ((character.round_scripts.final as any)[role]) || ''
                )}
              </ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default CharacterDetailView;
