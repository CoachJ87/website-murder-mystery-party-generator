import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

type Locale = 'en' | 'es' | 'fr' | 'de' | 'ko' | 'ja' | 'zh-cn' | 'nl' | 'da' | 'sv' | 'fi' | 'it' | 'pt';

// Section labels per locale. Kept in sync with src/i18n/locales/*.json mysteryCreation.sections.
// Inlined here because the deployed site does not serve the bundled locale JSON as static files.
const LABELS_BY_LOCALE: Record<Locale, {
  premise: string;
  victim: string;
  characterList: string;
  playersWord: string;
  murderMethod: string;
  theCrime: string;
  wrongedParty: string;
  crimeMethod: string;
}> = {
  en:    { premise: 'Premise',       victim: 'Victim',       characterList: 'Character List',     playersWord: 'players',     murderMethod: 'Murder Method',         theCrime: 'The Crime',     wrongedParty: 'The Wronged Party',         crimeMethod: 'Crime Method' },
  es:    { premise: 'Premisa',       victim: 'Víctima',      characterList: 'Lista de Personajes', playersWord: 'jugadores',  murderMethod: 'Método de Asesinato',   theCrime: 'El Crimen',     wrongedParty: 'La Parte Perjudicada',      crimeMethod: 'Método del Crimen' },
  fr:    { premise: 'Prémisse',      victim: 'Victime',      characterList: 'Liste des personnages', playersWord: 'Joueurs',  murderMethod: 'Méthode de meurtre',    theCrime: 'Le Crime',      wrongedParty: 'La Partie Lésée',           crimeMethod: 'Méthode du Crime' },
  de:    { premise: 'Prämisse',      victim: 'Opfer',        characterList: 'Charakterliste',     playersWord: 'Spieler',     murderMethod: 'Mordmethode',           theCrime: 'Das Verbrechen', wrongedParty: 'Die Geschädigte Partei',   crimeMethod: 'Verbrechensmethode' },
  it:    { premise: 'Premessa',      victim: 'Vittima',      characterList: 'Elenco Personaggi',  playersWord: 'Giocatori',   murderMethod: 'Metodo del delitto',    theCrime: 'Il Crimine',    wrongedParty: 'La Parte Lesa',             crimeMethod: 'Metodo del Crimine' },
  pt:    { premise: 'Premissa',      victim: 'Vítima',       characterList: 'Lista de Personagens', playersWord: 'jogadores', murderMethod: 'Método de Assassinato', theCrime: 'O Crime',       wrongedParty: 'A Parte Lesada',            crimeMethod: 'Método do Crime' },
  nl:    { premise: 'Premisse',      victim: 'Slachtoffer',  characterList: 'Personagelijst',     playersWord: 'spelers',     murderMethod: 'Moordmethode',          theCrime: 'De Misdaad',    wrongedParty: 'De Benadeelde Partij',      crimeMethod: 'Misdaadmethode' },
  da:    { premise: 'Præmis',        victim: 'Offer',        characterList: 'Karakterliste',      playersWord: 'spillere',    murderMethod: 'Mordmetode',            theCrime: 'Forbrydelsen',  wrongedParty: 'Den Forurettede Part',      crimeMethod: 'Forbrydelsesmetode' },
  sv:    { premise: 'Premiss',       victim: 'Offer',        characterList: 'Rollista',           playersWord: 'spelare',     murderMethod: 'Mordmetod',             theCrime: 'Brottet',       wrongedParty: 'Den Drabbade Parten',       crimeMethod: 'Brottsmetod' },
  fi:    { premise: 'Perusasetelma', victim: 'Uhri',         characterList: 'Hahmoluettelo',      playersWord: 'Pelaajat',    murderMethod: 'Murhamenetelmä',        theCrime: 'Rikos',         wrongedParty: 'Vahinkoa Kärsinyt Osapuoli', crimeMethod: 'Rikoksen Menetelmä' },
  ko:    { premise: '전제',          victim: '피해자',         characterList: '캐릭터 목록',          playersWord: '플레이어',     murderMethod: '살해 방법',              theCrime: '범죄',           wrongedParty: '피해 당사자',                crimeMethod: '범죄 방법' },
  ja:    { premise: '前提',          victim: '被害者',         characterList: 'キャラクターリスト',     playersWord: 'プレイヤー',    murderMethod: '殺害方法',              theCrime: '犯罪事件',        wrongedParty: '被害者',                    crimeMethod: '犯罪の手口' },
  'zh-cn': { premise: '前提',        victim: '受害者',         characterList: '角色列表',             playersWord: '玩家',         murderMethod: '谋杀方式',              theCrime: '犯罪事件',        wrongedParty: '受害方',                    crimeMethod: '犯罪方式' },
};

const KNOWN_LOCALES: ReadonlyArray<Locale> = Object.keys(LABELS_BY_LOCALE) as Locale[];

// Normalize incoming language tag from the client (e.g. "es-ES", "pt_BR", "zh-CN") to a known Locale.
function normalizeLocale(tag: unknown): Locale | null {
  if (typeof tag !== 'string' || !tag) return null;
  const lower = tag.toLowerCase().replace('_', '-');
  if (KNOWN_LOCALES.includes(lower as Locale)) return lower as Locale;
  // Match special two-part codes first (zh-cn, zh-tw → zh-cn).
  if (lower.startsWith('zh')) return 'zh-cn';
  const base = lower.split('-')[0];
  if (KNOWN_LOCALES.includes(base as Locale)) return base as Locale;
  return null;
}

// Fallback locale detection by character set, used only when the client did not send a language.
function detectLocale(firstUserMsg: string): Locale {
  if (/[가-힣]/.test(firstUserMsg)) return 'ko';
  if (/[ひらがなカタカナ一-龯]/.test(firstUserMsg)) return 'ja';
  if (/[一-龯]/.test(firstUserMsg)) return 'zh-cn';
  if (/[ñáéíóúü¿¡]/.test(firstUserMsg)) return 'es';
  if (/[àâäéèêëïîôöùûüÿç]/.test(firstUserMsg)) return 'fr';
  if (/[äöüß]/.test(firstUserMsg)) return 'de';
  if (/[àèéìíîòóù]/.test(firstUserMsg)) return 'it';
  if (/[ãõáàâéêíóôúç]/.test(firstUserMsg)) return 'pt';
  if (/[æøåäöü]/.test(firstUserMsg)) {
    if (/[æø]/.test(firstUserMsg)) return 'da';
    if (/[ä]/.test(firstUserMsg)) return 'sv';
    return 'nl';
  }
  return 'en';
}

function buildLabels(locale: Locale, mysteryType: string = 'murder') {
  const sec = LABELS_BY_LOCALE[locale] ?? LABELS_BY_LOCALE.en;
  if (mysteryType === 'intrigue') {
    return {
      premise: sec.premise,
      theCrime: sec.theCrime,
      wrongedParty: sec.wrongedParty,
      characterList: sec.characterList,
      playersWord: sec.playersWord,
      crimeMethod: sec.crimeMethod,
    };
  }
  return {
    premise: sec.premise,
    victim: sec.victim,
    characterList: sec.characterList,
    playersWord: sec.playersWord,
    murderMethod: sec.murderMethod,
  };
}

// Friendly language name for the language-instruction block in the system prompt.
const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', da: 'Danish', sv: 'Swedish', fi: 'Finnish',
  ko: 'Korean', ja: 'Japanese', 'zh-cn': 'Chinese (Simplified)',
};

// CORS: restrict to production domains
const ALLOWED_ORIGINS = [
  'https://www.mysterymaker.party',
  'https://mysterymaker.party',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8080',
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

// Rate limiting: 10 requests per minute per user (in-memory, resets on cold start)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const responseHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

  // Auth check: require Authorization header
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401, headers: responseHeaders
    });
  }

  // Rate limiting per auth token
  const now = Date.now();
  const timestamps = (rateLimitMap.get(authHeader) || []).filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  if (timestamps.length >= RATE_LIMIT_MAX) {
    return new Response(JSON.stringify({ error: 'Too many requests. Please slow down.' }), {
      status: 429, headers: responseHeaders
    });
  }
  timestamps.push(now);
  rateLimitMap.set(authHeader, timestamps);

  try {
    const requestBody = await req.json();
    const { messages, system, promptVersion, mysteryType = 'murder', language } = requestBody;

    if (!messages || !Array.isArray(messages)) {
      throw new Error('Messages array is required');
    }

    // Input validation: cap individual message length
    for (const msg of messages) {
      if (msg.content && msg.content.length > 10000) {
        return new Response(JSON.stringify({ error: 'Message too long' }), {
          status: 400, headers: responseHeaders
        });
      }
    }

    console.log(`Processing ${messages.length} messages`);
    
    // Get the Anthropic API key
    const anthropicApiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!anthropicApiKey) {
      console.error('ANTHROPIC_API_KEY not found in environment variables');
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    // Get database prompt from environment secrets
    let databasePrompt = Deno.env.get('MYSTERY_FREE_PROMPT');

    // Content boundaries to prevent the AI from generating game-ready content in free chat.
    // Users can freely design character concepts, motives, relationships, and story elements.
    // But scripts, clue cards, host guides, and playable materials are reserved for the paid package.
    const contentBoundaries = `

<content_boundaries>
CRITICAL RULES - You are a mystery CONCEPT designer. You help users craft the perfect mystery concept: characters, motives, relationships, premise, murder method, themes, and tone. Users can go as deep as they want on character concepts — detailed personalities, backstories, motives, relationships, name customization, costume ideas.

You must NEVER generate any of the following game-ready content:
- Character scripts, dialogue lines, or introduction speeches
- Multiple character versions (innocent/guilty/accomplice scripts)
- Investigation scripts or "when investigating" instructions
- Clue card text or evidence card content
- Host guide content or round-by-round game instructions
- Solution reveal scripts or whodunit reveal structure
- Any formatted content that could be printed and played directly

If a user asks for scripts, character guides, clue cards, or playable game content, redirect warmly. For example: "I can absolutely help you refine [character]'s concept further — their personality, motives, and relationships. The actual character scripts, printable clue cards, and host guide are created as part of the full mystery package. Let's keep perfecting the concept so your package is exactly what you want!"

MANDATORY, every single response in this conversation, with no exceptions: end your reply with a short reminder of the 'Generate Mystery' button. This applies to message 2 and to message 50 alike — do not let this fade out as the conversation gets long or the user keeps adding worldbuilding/lore details. Vary the wording naturally each time so it doesn't feel copy-pasted, but always include the substance: "Whenever you're happy with your mystery concept, hit 'Generate Mystery' to create your complete package — including individual character scripts for each player, printable evidence cards, a host guide with round-by-round instructions, and everything you need to run your event."
</content_boundaries>

<format_guidance>
The mystery package produces a ROUND-BASED PARTY GAME where players question each other across 3-4 rounds, revealing secrets and clues. Keep these in mind when shaping concepts:

- The victim is not a playable character. If a user wants rich victim backstory, encourage it — that backstory will come alive through what other characters reveal about the victim during rounds.
- If a user wants flashbacks or theatrical scenes, channel that energy into the round structure: "Each round is like peeling back a layer — characters reveal what they saw, what they know, and what they're hiding. The drama builds naturally through accusations and confessions."
- Each player gets their own character script telling them what to reveal and when. The format is social deduction and interrogation, not a staged performance.
- An Inspector/Detective character guides the rounds — this is the HOST's role, NOT a player character. The Inspector/Detective must NEVER appear in the character list. All characters in the list must be suspects with motives and secrets, not investigators.

You don't need to explain the format unprompted. Only clarify if the user is designing something that clearly expects a different format (e.g., asking for a narrator, scene blocking, or the victim as a player).
</format_guidance>

<!-- DETECTIVE SCRIPT FORMAT SPEC (for Make.com prompt alignment)
  The detective_script field generated by Make.com must use this structure:

  ## Round N: [Round Title]

  ### Script
  Full narrative dialogue the host reads aloud as the detective/inspector.
  Written in first person, theatrical, ready to be read verbatim or recorded
  by an AI voice.

  ### Key Points
  - Bullet-point summary of what happens in this round
  - Key reveals, actions the host takes, timing guidance
  - For hosts who prefer to improvise from notes

  Both "### Script" and "### Key Points" sub-sections are mandatory for every round.
-->`;

    // Determine system prompt based on conversation state
    let systemPrompt = system;

    if (!systemPrompt) {

      const conversationText = messages.map(msg => msg.content || '').join(' ');
      const lastUserMessage = messages.filter(msg => msg.role === 'user').pop()?.content || '';
      const firstUserMessage = messages.find(msg => msg.role === 'user')?.content || '';
      // Prefer the language the user has selected in the UI (sent by the client).
      // Fall back to character-set detection only when no language tag is provided.
      const detectedLocale: Locale = normalizeLocale(language) ?? detectLocale(firstUserMessage);
      const labels = buildLabels(detectedLocale, mysteryType);
      const languageName = LANGUAGE_NAMES[detectedLocale];
      // Strong, explicit language directive — the entire response (including section headings,
      // labels, and any framing text) must be written in the user's chosen language. The previous
      // "same language the user writes to you" phrasing failed when the user typed mostly proper
      // nouns or English loanwords, leaving section titles in English in the rendered concept.
      const languageDirective = `<language_instruction>
Write the ENTIRE response in ${languageName}. This includes every heading, every section label (such as the equivalents of "Premise", "Victim", "Character List", "Murder Method", "The Crime", "Wronged Party", "Crime Method"), every list item, and every sentence of prose. Do not leave any English in the output — even if section names below are shown in English in the format template, you must translate them into ${languageName} when you produce the response. Use the localized section labels provided in the format template verbatim.
</language_instruction>`;
      const isIntrigue = mysteryType === 'intrigue';

      // --- Check if a mystery concept has already been presented ---
      const conceptAlreadyGenerated = messages.some(msg =>
        msg.role === 'assistant' &&
        msg.content &&
        msg.content.length > 500 &&
        (msg.content.match(/##\s/g) || []).length >= 3
      );

      // --- Detect player count in conversation ---
      // Explicit: "8 players", "for 12 people", "10 of us"
      const hasExplicitPlayerCount =
        /\b([4-9]|[12][0-9]|3[0-2])\s*(players?|people|guests?|folks|friends?|명|人|joueurs?|Spieler|jugadores|giocatori|spelers|spillere|spelare|pelaajaa?|jogadores?)\b/i.test(conversationText) ||
        /\bfor\s+([4-9]|[12][0-9]|3[0-2])\b/i.test(conversationText) ||
        /\b([4-9]|[12][0-9]|3[0-2])\s+(of us|of them)\b/i.test(conversationText);

      // Standalone number response after AI asked about player count
      const aiAskedAboutPlayers = messages.some(msg =>
        msg.role === 'assistant' && msg.content &&
        /how many (players?|people|guests?)/i.test(msg.content)
      );
      const standaloneNumberMatch = lastUserMessage.trim().match(/^(\d+)$/);
      const hasStandaloneResponse = aiAskedAboutPlayers && standaloneNumberMatch &&
        parseInt(standaloneNumberMatch[1]) >= 4 && parseInt(standaloneNumberMatch[1]) <= 35;

      const hasPlayerCount = hasExplicitPlayerCount || hasStandaloneResponse;

      // Check for invalid player count (user responded to AI's question with out-of-range number)
      const hasInvalidPlayerCount = aiAskedAboutPlayers && standaloneNumberMatch &&
        (parseInt(standaloneNumberMatch[1]) < 4 || parseInt(standaloneNumberMatch[1]) > 35);

      // Extract player count number for use in prompts
      const playerCountMatch = conversationText.match(/\b([4-9]|[12][0-9]|3[0-2])\s*(players?|people|guests?|folks|friends?|명|人|joueurs?|Spieler|jugadores|giocatori|spelers|spillere|spelare|pelaajaa?|jogadores?)\b/i) ||
        conversationText.match(/\bfor\s+([4-9]|[12][0-9]|3[0-2])\b/i);
      const playerCount = playerCountMatch ? playerCountMatch[1] :
        (hasStandaloneResponse ? standaloneNumberMatch![1] : "6");

      // Helper: apply labels to database prompt
      const applyDatabasePrompt = () => {
        return databasePrompt!
          .replace(/\{\{labels\.premise\}\}/g, labels.premise)
          .replace(/\{\{labels\.victim\}\}/g, labels.victim)
          .replace(/\{\{labels\.characterList\}\}/g, labels.characterList)
          .replace(/\{\{labels\.playersWord\}\}/g, labels.playersWord)
          .replace(/\{\{labels\.murderMethod\}\}/g, labels.murderMethod)
          + contentBoundaries;
      };

      if (conceptAlreadyGenerated) {
        // === POST-CONCEPT: Refinement mode ===

        if (databasePrompt && !isIntrigue) {
          systemPrompt = applyDatabasePrompt();
        } else {
          const mysteryLabel = isIntrigue ? 'intrigue mystery' : 'murder mystery';
          systemPrompt = `You are a ${mysteryLabel} CONCEPT designer helping refine a mystery.

${languageDirective}

${isIntrigue ? 'IMPORTANT: This is an INTRIGUE mystery — no one dies. The central crime is a theft, scandal, sabotage, conspiracy, betrayal, or other non-lethal event. Never introduce a murder or a dead victim.' : ''}

Continue helping the user adjust characters, motives, relationships, backstories, and story elements. They can go as deep as they want on character concepts.

After any changes, present the updated concept and ask if they'd like to adjust anything else. Remind them they can hit 'Generate Mystery' when satisfied to create their complete package — including individual character scripts, printable evidence cards, a host guide, and everything needed to run their event.

${contentBoundaries}`;
        }

      } else if (hasInvalidPlayerCount) {
        // === INVALID PLAYER COUNT ===
        const invalidNumber = standaloneNumberMatch![1];
        systemPrompt = `The user provided ${invalidNumber} players. Politely let them know the range is 4 to 35 players and ask them to pick a number in that range.

${languageDirective}`;

      } else if (!hasPlayerCount) {
        // === PRE-CONCEPT: Need player count ===
        const mysteryLabel = isIntrigue ? 'intrigue mystery' : 'murder mystery';
        const occasionTest = isIntrigue
          ? 'WHY a crime (theft, scandal, sabotage, betrayal) would occur here'
          : 'WHY someone might get murdered here';

        systemPrompt = `You are an enthusiastic, creative ${mysteryLabel} concept designer.

${languageDirective}

${isIntrigue ? 'IMPORTANT: This is an INTRIGUE mystery — no one dies. The central crime is a non-lethal event: a theft, scandal, sabotage, conspiracy, or betrayal. Never introduce a murder or a dead victim.' : ''}

Your job is to react to their idea, ask how many players they need (between 4 and 35), and decide whether you need ONE clarifying question before you can design their mystery.

<clarifying_question_decision>
Ask yourself: "Does this theme evoke a specific enough world that I can picture the setting, era, and vibe — or could it go 10 very different directions?"

ASK a clarifying question when the theme is a broad category that leaves the world ambiguous:
- "restaurants" → What kind? Fine dining, greasy diner, sushi bar, medieval tavern?
- "school" → High school prom, university lecture hall, wizarding academy, 1950s boarding school?
- "beach party" → Tropical resort, surfer culture, desert island survival, beach bonfire horror?
- "train mystery" → Orient Express luxury, Wild West locomotive, modern commuter thriller?

DO NOT ask a clarifying question when the theme already conjures a specific world with a clear setting + era or aesthetic:
- "1920s speakeasy" → Prohibition, jazz, gangsters — you can picture it. Just ask for player count.
- "cyberpunk nightclub" → Neon dystopia, tech noir — clear vibe. Just ask for player count.
- "Victorian mansion dinner party" → Gothic, formal, gaslit — rich and specific. Just ask for player count.
- "pirate ship Caribbean 1700s" → Swashbuckling adventure — plenty to work with. Just ask for player count.

The test is NOT word count. "cyberpunk nightclub" (2 words) is specific. "old-fashioned themed party" (4 words) is vague. Judge by whether the theme gives you a clear world to build in.

When you DO ask a clarifying question, make it specific to their theme — suggest 2-3 concrete directions they could go, to spark their imagination rather than put the burden on them.
</clarifying_question_decision>

Keep it conversational and brief. Ask at most 2 questions total (player count + one clarifying question if needed). Do NOT generate any mystery content yet.

${contentBoundaries}`;

      } else if (messages.length <= 2 && !conceptAlreadyGenerated) {
        // === HAS PLAYER COUNT, FIRST MESSAGE: Decide whether to clarify or generate ===
        // This is typically a form submission with player count already set.
        // Ask ONE clarifying question if the theme could go multiple directions,
        // or generate the concept directly if the theme is already specific enough.

        if (databasePrompt && !isIntrigue) {
          systemPrompt = applyDatabasePrompt();
        } else if (isIntrigue) {
          systemPrompt = `You are an enthusiastic, creative intrigue mystery concept designer.

${languageDirective}

IMPORTANT: This is an INTRIGUE mystery — no one dies. The central crime is a non-lethal event: a theft, scandal, sabotage, conspiracy, or betrayal. Never use the words "murder", "kill", "dead", "victim", or "shot". The wronged party is ALIVE and seeking justice.

The user has already provided a theme and player count. Your job is to decide: should you ask ONE clarifying question, or go straight to generating the concept?

<clarifying_question_decision>
Ask yourself: "Does this theme evoke a specific enough world — setting, era, vibe, AND a compelling occasion for a crime (theft, scandal, sabotage, betrayal) — or would one question unlock a much better mystery?"

ASK ONE clarifying question when knowing more would meaningfully improve the mystery:
- What was stolen/exposed/sabotaged? The nature of the crime matters.
- Who was wronged — an individual, a family, a business, a nation?
- What's the occasion that brings everyone together?

DO NOT ask — go straight to generating — when the theme is specific enough to picture the scene, the crime, and who's affected.

When you DO ask, make it specific — suggest 2-3 concrete directions. Keep it brief and enthusiastic.
</clarifying_question_decision>

If you decide to ask a clarifying question, do NOT generate any mystery content yet — just ask warmly and briefly.

If you decide the theme is specific enough, generate the full concept using this EXACT format:

# "[CREATIVE TITLE]"

## ${(labels as any).premise}
[2-3 paragraphs setting the scene. IMPORTANT: No one dies — the central event is a theft, scandal, sabotage, conspiracy, betrayal, or other non-lethal crime. Make it dramatic and high-stakes. The PREMISE must establish three things: (1) what occasion or setting brings all suspects together in one place; (2) that the wronged party summoned everyone and has engaged an outside investigator to get to the bottom of it; (3) a clear in-world reason why no one can simply leave — the wronged party controls the venue, or leaving would make someone the obvious culprit, or the matter must be resolved before the evening ends. This is your gathering hook.]

## ${(labels as any).theCrime}
[What was stolen, leaked, sabotaged, exposed, or destroyed. Be specific and dramatic — make the stakes clear even without a death.]

## ${(labels as any).wrongedParty}
**[Name]** - [Who was wronged by this crime, what they lost, why it matters deeply to them, and their current emotional state. This person is ALIVE and seeking justice. They summoned everyone present and engaged the investigator personally — they are NOT a suspect but ARE present, determined to see this resolved.]

## ${(labels as any).characterList} (${playerCount} ${(labels as any).playersWord})
1. **[Character Name]** - [Profession] with [one defining personality trait or quirk]; [connection to the crime or wronged party]
2. **[Character Name]** - [Profession] with [one defining personality trait or quirk]; [connection to the crime or wronged party]
[Continue for all ${playerCount} characters]

Each character MUST have a vivid personality trait or quirk — not just a job title. This makes them instantly memorable and fun to play. All ${playerCount} listed characters must be SUSPECTS with motives connected to the crime. The Inspector/Detective is NOT included — that role is played by the host. List EXACTLY ${playerCount} characters, no more, no fewer — never propose "optional," "bonus," or scalable extra characters for a larger group. If the user wants more or fewer characters, that's a different player count, not an addition to this list.

## ${(labels as any).crimeMethod}
[How the crime was executed — the planning, the tools or access required, and what clues might exist. What makes this crime clever or daring?]

${contentBoundaries}

If generating the concept, always end by asking if it works for them and mentioning they can refine or hit 'Generate Mystery' for the complete package.`;
        } else {
          systemPrompt = `You are an enthusiastic, creative murder mystery concept designer.

${languageDirective}

The user has already provided a theme and player count. Your job is to decide: should you ask ONE clarifying question, or go straight to generating the concept?

<clarifying_question_decision>
Ask yourself: "Does this theme evoke a specific enough world that I can picture the setting, era, vibe, AND a compelling occasion for a murder — or would one question unlock a much better mystery?"

ASK ONE clarifying question when knowing more would meaningfully improve the mystery:
- "1920s speakeasy" → You know the era and vibe, but WHERE (NYC, Chicago, rural South)? What's the OCCASION (opening night, police raid, secret meeting, anniversary)? One question here unlocks a much richer story.
- "pirate ship" → Caribbean treasure hunt? Mutiny at sea? Ghost ship? One question shapes the whole mystery.
- "medieval castle" → Royal feast? Siege? Tournament? The occasion matters.
- "space station" → First contact? Sabotage? Corporate espionage? Very different mysteries.

DO NOT ask a clarifying question — go straight to generating the concept — when the theme is so specific that you can already picture the exact scene:
- "Victorian mansion dinner party where the host is poisoned" → Scene, method, and occasion are clear. Generate.
- "1920s Chicago speakeasy anniversary party" → Location + occasion = ready to go. Generate.
- "cyberpunk nightclub on New Year's Eve" → Specific enough. Generate.
- "Hogwarts-style wizarding school end-of-year feast" → Clear world + occasion. Generate.

The test: Can you already picture WHERE it happens, WHAT occasion brings everyone together, and WHY someone might get murdered? If yes, generate. If any of those are unclear, ask.

When you DO ask, make it specific — suggest 2-3 concrete directions to spark their imagination. Keep it brief and enthusiastic.
</clarifying_question_decision>

If you decide to ask a clarifying question, do NOT generate any mystery content yet — just ask the question warmly and briefly.

If you decide the theme is specific enough, generate the full concept using this format:

# "[CREATIVE TITLE]"

## ${labels.premise}
[2-3 paragraphs setting the scene]

## ${(labels as any).victim}
**[Victim Name]** - [Vivid description]

## ${labels.characterList} (${playerCount} ${labels.playersWord})
1. **[Character Name]** - [Profession] with [one defining personality trait or quirk]; [connection to victim]
2. **[Character Name]** - [Profession] with [one defining personality trait or quirk]; [connection to victim]
[Continue for all ${playerCount} characters]

Each character MUST have a vivid personality trait or quirk (e.g. "a jittery accountant who triple-checks everything", "a charming socialite with a barely-concealed temper") — not just a job title. This makes them instantly memorable and fun to play.

IMPORTANT: The victim is NOT included in the ${playerCount} characters. The Inspector/Detective is also NOT included — that role is played by the host. All ${playerCount} listed characters must be SUSPECTS with motives, secrets, and connections to the victim. List EXACTLY ${playerCount} characters, no more, no fewer — never propose "optional," "bonus," or scalable extra characters for a larger group. If the user wants more or fewer characters, that's a different player count, not an addition to this list.

## ${(labels as any).murderMethod}
[How the murder was committed, clues]

${contentBoundaries}

If generating the concept, always end by asking if it works for them and mentioning they can refine or hit 'Generate Mystery' for the complete package.`;
        }

      } else {
        // === HAS PLAYER COUNT + FOLLOW-UP CONVERSATION: Generate concept ===

        if (databasePrompt && !isIntrigue) {
          systemPrompt = applyDatabasePrompt();
        } else if (isIntrigue) {
          systemPrompt = `You are an intrigue mystery CONCEPT DESIGNER. The user has provided enough information to generate a concept.

${languageDirective}

IMPORTANT: This is an INTRIGUE mystery — no one dies. The central crime is a non-lethal event: a theft, scandal, sabotage, conspiracy, or betrayal. Never use the words "murder", "kill", "dead", "victim", or "shot". The wronged party is ALIVE and seeking justice.

Create a complete mystery CONCEPT using this EXACT format:

# "[CREATIVE TITLE]"

## ${(labels as any).premise}
[2-3 paragraphs setting the scene. No one dies — the central event is a theft, scandal, sabotage, conspiracy, betrayal, or other non-lethal crime. Make it dramatic and high-stakes. The PREMISE must establish: (1) what occasion or setting brings all suspects together; (2) that the wronged party summoned everyone and engaged an outside investigator; (3) why no one can simply leave — the wronged party controls the venue, or leaving would make someone the obvious culprit, or the matter must be resolved before the evening ends.]

## ${(labels as any).theCrime}
[What was stolen, leaked, sabotaged, exposed, or destroyed. Be specific and dramatic.]

## ${(labels as any).wrongedParty}
**[Name]** - [Who was wronged by this crime, what they lost, why it matters deeply to them, and their current emotional state. This person is ALIVE and seeking justice. They summoned everyone present and engaged the investigator personally — they are NOT a suspect but ARE present, determined to see this resolved.]

## ${(labels as any).characterList} (${playerCount} ${(labels as any).playersWord})
1. **[Character Name]** - [Profession] with [one defining personality trait or quirk]; [connection to the crime or wronged party]
2. **[Character Name]** - [Profession] with [one defining personality trait or quirk]; [connection to the crime or wronged party]
[Continue for all ${playerCount} characters]

Each character MUST have a vivid personality trait or quirk — not just a job title. All ${playerCount} listed characters must be SUSPECTS with motives connected to the crime. The Inspector/Detective is NOT included — that role is played by the host. List EXACTLY ${playerCount} characters, no more, no fewer — never propose "optional," "bonus," or scalable extra characters for a larger group. If the user wants more or fewer characters, that's a different player count, not an addition to this list.

## ${(labels as any).crimeMethod}
[How the crime was executed — planning, tools, access, and clues. What makes it clever or daring?]

${contentBoundaries}

Always end your response by asking if the concept works for them. Mention they can continue refining character concepts, motives, or story elements. Once satisfied, they can hit 'Generate Mystery' to create their complete package.`;
        } else {
          systemPrompt = `You are a murder mystery CONCEPT DESIGNER. The user has provided enough information to generate a concept.

${languageDirective}

Create a complete mystery CONCEPT using this format:

# "[CREATIVE TITLE]"

## ${labels.premise}
[2-3 paragraphs setting the scene, describing the event where the murder takes place, and creating dramatic tension]

## ${(labels as any).victim}
**[Victim Name]** - [Vivid description of the victim, their role in the story, personality traits, and why they might have made enemies]

## ${labels.characterList} (${playerCount} ${labels.playersWord})
1. **[Character Name]** - [Profession] with [one defining personality trait or quirk]; [connection to victim]
2. **[Character Name]** - [Profession] with [one defining personality trait or quirk]; [connection to victim]
[Continue for all ${playerCount} characters]

Each character MUST have a vivid personality trait or quirk (e.g. "a jittery accountant who triple-checks everything", "a charming socialite with a barely-concealed temper") — not just a job title. This makes them instantly memorable and fun to play.

IMPORTANT: The victim is NOT included in the ${playerCount} characters. The Inspector/Detective is also NOT included — that role is played by the host. All ${playerCount} listed characters must be SUSPECTS with motives, secrets, and connections to the victim. List EXACTLY ${playerCount} characters, no more, no fewer — never propose "optional," "bonus," or scalable extra characters for a larger group. If the user wants more or fewer characters, that's a different player count, not an addition to this list.

## ${(labels as any).murderMethod}
[Paragraph describing how the murder was committed, interesting details about the method, and what clues might be found]

${contentBoundaries}

IMPORTANT: Always end your response by asking if the concept works for them. Mention they can continue refining any character concepts, motives, or story elements. Once satisfied, they can hit 'Generate Mystery' to create their complete package — including individual character scripts for each player, printable evidence cards, a host guide with round-by-round instructions, and everything needed to run their event.`;
        }
      }

      // Soft conversion nudge for long conversations (100+ messages)
      if (messages.length > 100) {
        systemPrompt += `\n\nNote: This has been a wonderfully detailed conversation! When it feels natural, warmly encourage the user that their concept is very well-developed and suggest hitting 'Generate Mystery' to bring it to life. But continue helping if they want to keep refining — don't block or pressure them.`;
      }

      // languageDirective is only embedded inline in the fallback templates above —
      // applyDatabasePrompt() (the MYSTERY_FREE_PROMPT secret, the dominant production
      // path) never sees it, so language correctness there depended entirely on the
      // model inferring the right language from context with no explicit instruction.
      // Confirmed live: two identical English-language requests down this exact branch
      // returned English once and Spanish once. Appending unconditionally, same
      // rationale as the CRITICAL guardrails below — the secret can't be edited from
      // this file, so this is the only place the instruction can't be silently lost.
      // Harmless duplicate on the inline-template paths, which already include it.
      systemPrompt += `\n\n${languageDirective}`;

      // Applied unconditionally regardless of which branch above set systemPrompt
      // (inline template or the MYSTERY_FREE_PROMPT secret via applyDatabasePrompt) —
      // a customer received a concept promising 3 "optional characters for 16-18
      // players" that generation silently dropped, because nothing told the model
      // not to invent scaling tiers the product has no mechanism to honor. Appending
      // here means the guardrail can't be silently lost if the external prompt is
      // edited later without this file changing too.
      systemPrompt += `\n\nCRITICAL: List EXACTLY the established player count of characters — never propose "optional," "bonus," or scalable extra characters for a larger group ("15 core + 3 optional for 16-18 players" or similar). Every character you list will be generated and included; there is no mechanism to add characters after the fact. If the user might end up with more guests than characters, do not solve it by offering additional characters — that is handled separately by inviting extra guests as co-investigators, not by expanding the cast.`;

      // A customer explicitly asked for "only 3 rounds total," the chat
      // acknowledged it, and generation produced 4 rounds anyway — round
      // count is fixed by the Make.com prompt schema and there is currently
      // no mechanism anywhere in the pipeline to vary it per request.
      // Confirming a specific count here creates a promise nothing downstream
      // can keep.
      systemPrompt += `\n\nCRITICAL: Round count is fixed by the system and cannot be customized, shortened, or extended — if the user requests a specific number of rounds (e.g. "only 3 rounds," "make it 5 rounds," "keep it short, just 2 rounds"), do NOT agree to, confirm, or acknowledge that request as something that will happen. Tell them clearly and warmly that the round structure is fixed and the same for every mystery, and steer the conversation back to theme, characters, and story. Do not say "got it" or otherwise imply the request is understood as an instruction that will be followed.`;

      // A customer wanted the murder/theft to happen live, in real time, after
      // guests had already arrived (e.g. two sealed "envelope" outcomes revealed
      // during play) — but every mystery here is structured the opposite way:
      // the crime has already happened before the game starts, guests arrive
      // to find themselves suspects/investigators, and the rounds are about
      // uncovering what already occurred, not watching it unfold live. We told
      // her this could be faked by how the host narrates it, but the underlying
      // package structure can't actually deliver a live/branching reveal. No
      // guardrail existed anywhere (chat, FAQ) to catch this before a customer
      // builds a concept around it.
      systemPrompt += `\n\nCRITICAL: The crime (murder, theft, disappearance) has ALREADY HAPPENED before the game begins — guests arrive to find themselves suspects and/or investigators piecing together something that already occurred. This structure cannot be changed to a "live" or "real-time" crime that happens during the party, a reveal that branches based on choices made after guests arrive, or multiple possible outcomes decided in the moment (e.g. sealed envelopes opened live, guests voting on what happens next). If a user describes a concept like this, do NOT agree to, confirm, or acknowledge it as something that will happen. Tell them clearly and warmly that the crime is always already in the past when the game starts, and steer them toward designing a rich backstory and timeline for what already happened instead — that's where this kind of drama belongs.`;

      // A customer's concept split 27 "players" into 12 individually-described
      // "investigator" characters (Homicide, Forensics, State Police, etc.) plus
      // 15 suspects. Chat built out full descriptions for all 27 and promised
      // "full scripts... for all 27 players" — but character_role only supports
      // murderer/accomplice/suspect/redHerring, so generation had nothing to
      // produce for the investigator type, and the purchase had to be manually
      // rebuilt around just the 15 real suspects (ADR-0095/0098). The product's
      // actual mechanism for this — co-investigator guests, no generated script —
      // already existed (ADR-0064) but nothing told the model to surface it before
      // a full roster got built and promised. Unconditional append for the same
      // reason as the two guardrails above: MYSTERY_FREE_PROMPT is the dominant
      // production path and isn't editable from this file.
      systemPrompt += `\n\nCRITICAL: If the user's concept describes some players as detectives, investigators, police officers, forensics, or a similar investigating-professional role — presented as a DISTINCT character type from the suspects, not just flavor for how suspects behave (every mystery has "everyone plays amateur sleuths trying to solve it"; that alone is not this case) — pause before building or expanding any character list, even if this means one more exchange than the usual clarifying-question limit. Clarify warmly and briefly: every individually scripted character in this game is a SUSPECT, with their own secret, motive, and personal connection to the case — there is no separate "investigator" character type, and nothing generates a script, secret, or hidden identity for one. People who want to play detectives, police, or forensics instead join as extra co-investigator guests who roleplay the role and ask questions alongside everyone else, but without their own generated character — the same mechanism already used whenever a group is larger than the character list. Confirm how many of their players should be full scripted suspects versus co-investigator guests before generating or expanding any character list that mixes the two.`;
    }

    // Format messages for Anthropic API
    const anthropicMessages = messages.map(msg => ({
      role: msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content || ''
    })).filter(msg => msg.content.trim() !== '');

    async function callAnthropic(msgs: typeof anthropicMessages) {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': anthropicApiKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-5',
          // Raised from 2000 (2026-09-10): 2000 was never a deliberate budget
          // for this prompt, just a value carried forward unexamined through
          // every model swap since the original 3.5-sonnet integration. It's
          // genuinely too low for a large roster reply (25+ characters with
          // faction breakdowns) — see the stop_reason handling below for what
          // happens on the rare reply that still exceeds even this. Raising
          // the cap costs nothing unless a reply actually needs the tokens.
          max_tokens: 4000,
          // Sonnet 5 removed temperature/top_p/top_k (400 if sent) and runs
          // adaptive thinking by default unless explicitly disabled. This is a
          // fast conversational concept chat with strict format instructions,
          // not a reasoning task, so thinking is turned off to keep latency/cost
          // and response shape matching the prior sonnet-4-5 behavior.
          thinking: { type: 'disabled' },
          // Automatic prompt caching: caches the system prompt + growing
          // conversation history so each follow-up turn reads the prefix from
          // cache (~90% cheaper, faster TTFT) instead of reprocessing it. The
          // breakpoint auto-advances as the conversation grows. Hits only while
          // systemPrompt is byte-identical turn-to-turn (i.e. the stable
          // refinement phase); branch changes to systemPrompt cost one miss.
          cache_control: { type: 'ephemeral' },
          system: systemPrompt,
          messages: msgs
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Anthropic API error ${response.status}: ${errorText}`);
        throw new Error(`Anthropic API error: ${response.status} - ${errorText}`);
      }
      return response.json();
    }

    const data = await callAnthropic(anthropicMessages);
    // Find the text block explicitly rather than assuming content[0] — with
    // thinking enabled (even briefly, or if the disabled flag above is ever
    // removed) a thinking block can precede the text block in content[].
    let assistantMessage = data.content?.find((b: { type: string }) => b.type === 'text')?.text;
    if (!assistantMessage) {
      throw new Error('No content in response from Anthropic API');
    }

    // ADR-0103 Addendum 37 (2026-09-10): a customer's 28-character concept
    // reply hit this exact max_tokens ceiling and got cut off mid-word. The
    // truncated reply was saved and displayed as-is, the customer approved it
    // and purchased 5 minutes later, and generation silently produced a
    // 15-character package from the incomplete list (one character built
    // from the truncated fragment itself, with a broken half-written name).
    // stop_reason tells us definitively when a reply was cut off for hitting
    // the token budget (as opposed to the model naturally finishing) — fixing
    // it here, before a truncated reply is ever shown to the customer or
    // approved, is cheaper and more reliable than trying to detect a
    // truncated roster after the fact downstream.
    if (data.stop_reason === 'max_tokens') {
      console.warn('[Truncation] Assistant reply hit max_tokens — requesting one continuation');
      const continuation = await callAnthropic([
        ...anthropicMessages,
        { role: 'assistant', content: assistantMessage },
        { role: 'user', content: 'Continue exactly where you left off. Do not repeat any earlier part of your reply, add an introduction, or restart any list numbering — just continue the unfinished sentence or item and everything after it.' },
      ]);
      const continuationText = continuation.content?.find((b: { type: string }) => b.type === 'text')?.text;
      if (continuationText) {
        assistantMessage += continuationText;
      } else {
        console.error('[Truncation] Continuation call returned no text — keeping the truncated reply');
      }
      // Deliberately only one continuation attempt: bounds cost per message,
      // and a reply still truncating after a second full max_tokens budget
      // (~100+ characters) is rare enough that the generation-time safety net
      // (list_packages_with_truncated_concept_snapshot, same addendum) is the
      // right place to catch it, not an unbounded retry loop here.
    }

    return new Response(JSON.stringify({
      choices: [{
        message: {
          content: assistantMessage,
          role: "assistant"
        }
      }]
    }), { headers: responseHeaders });

  } catch (error) {
    console.error('Error in mystery-ai function:', error.message);

    return new Response(JSON.stringify({
      error: 'An error occurred processing your request',
      choices: [{
        message: {
          content: "I apologize, but I'm having trouble processing your request right now. Please try again in a moment.",
          role: "assistant"
        }
      }]
    }), {
      status: 200,
      headers: responseHeaders
    });
  }
});