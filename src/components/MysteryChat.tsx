import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAIResponse } from "@/services/aiService";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Message } from "@/components/types";
import { Loader2, AlertCircle, Send, Wand2 } from "lucide-react";

interface MysteryChatProps {
    initialTheme?: string;
    savedMysteryId?: string;
    onSave?: (message: Message) => void;
    onGenerateFinal?: (messages: Message[]) => void;
    initialPlayerCount?: number;
    initialHasAccomplice?: boolean;
    initialScriptType?: "full" | "pointForm";
    initialAdditionalDetails?: string;
    initialMessages?: Message[];
    isLoadingHistory?: boolean;
    systemInstruction?: string;
}

const MysteryChat = ({
    initialTheme = "",
    savedMysteryId,
    onSave,
    onGenerateFinal,
    initialPlayerCount,
    initialHasAccomplice,
    initialScriptType,
    initialAdditionalDetails,
    initialMessages = [],
    isLoadingHistory = false,
    systemInstruction = ""
}: MysteryChatProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [initialMessageSent, setInitialMessageSent] = useState(false);
    const messagesInitialized = useRef(false);
    const aiHasRespondedRef = useRef(false);
    const [error, setError] = useState<string | null>(null);
    const isEditModeRef = useRef(!!savedMysteryId);
    const [hasUserEditedInSession, setHasUserEditedInSession] = useState(false);
    const initialFormPromptSaved = useRef(false);

    console.log("DEBUG: MysteryChat rendering with props:", {
        initialTheme,
        savedMysteryId,
        initialPlayerCount,
        initialHasAccomplice,
        initialScriptType,
        initialAdditionalDetails,
        initialMessagesCount: initialMessages.length,
        isLoadingHistory,
        hasSystemInstruction: !!systemInstruction
    });

    // Create a strong system message function that emphasizes not asking about already provided info
    const createSystemMessage = () => {
        let systemMsg = "This is a murder mystery creation conversation. ";
        systemMsg += "The user has ALREADY selected the following preferences, so DO NOT ask about these again: ";
        
        if (initialTheme) {
            systemMsg += `Theme: ${initialTheme}. `;
        }
        if (initialPlayerCount) {
            systemMsg += `Player count: ${initialPlayerCount}. `;
        }
        if (initialHasAccomplice !== undefined) {
            systemMsg += `Accomplice: ${initialHasAccomplice ? "Yes" : "No"}. `;
        }
        if (initialScriptType) {
            systemMsg += `Script type: ${initialScriptType}. `;
        }
        if (initialAdditionalDetails) {
            systemMsg += `Additional details: ${initialAdditionalDetails}. `;
        }
        
        systemMsg += "Please start directly with creating a suitable murder mystery based on these preferences without asking clarifying questions about these specified parameters. You may ask about other aspects of the mystery if needed.";
        
        return systemMsg;
    };

    useEffect(() => {
        console.log("DEBUG: Initializing messages effect", {
            initialMessagesLength: initialMessages.length,
            messagesInitialized: messagesInitialized.current,
            currentMessagesLength: messages.length
        });

        if (initialMessages.length > 0 && !messagesInitialized.current) {
            // Add message content analysis to detect incorrect is_ai flags
            console.log("DEBUG: Analyzing message contents for correct is_ai flags");
            
            let userMessageCount = 0;
            let aiMessageCount = 0;
            
            // First pass - count current message types
            initialMessages.forEach(msg => {
                if (msg.is_ai) {
                    aiMessageCount++;
                } else {
                    userMessageCount++;
                }
            });
            
            console.log(`DEBUG: Initial analysis - User: ${userMessageCount}, AI: ${aiMessageCount}`);
            
            // If almost all messages are marked as user, something is wrong
            const needsDeepAnalysis = userMessageCount > 1 && aiMessageCount === 0;
            
            const correctedMessages = initialMessages.map((msg, index) => {
                // Enhanced heuristic to detect AI messages
                const looksLikeAI = 
                    // Contains markdown headings
                    msg.content.includes("# ") || 
                    msg.content.includes("## ") || 
                    // Contains typical AI phrasings
                    msg.content.includes("Thank you for sharing") ||
                    msg.content.includes("I'd be happy to") ||
                    msg.content.includes("Here's a murder mystery") ||
                    // Content has structural elements typical of AI responses
                    (msg.content.includes("CHARACTER") && msg.content.includes("LIST")) ||
                    msg.content.includes("PREMISE") ||
                    msg.content.includes("VICTIM") ||
                    // Content is long and formatted
                    (msg.content.length > 200 && 
                     (msg.content.includes("**") || // Bold markdown
                      (msg.content.match(/\d\./g) || []).length > 2)); // Numbered lists
                
                // Apply more aggressive correction if we detected an issue with all messages
                const shouldCorrect = needsDeepAnalysis ? 
                    // In deep analysis mode, assume even-indexed messages in conversation are from AI
                    // after the first message (which is typically the user's initial prompt)
                    (index > 0 && index % 2 === 1) || looksLikeAI : 
                    // Normal mode - just check content heuristics
                    looksLikeAI;
                
                if (!msg.is_ai && shouldCorrect) {
                    console.warn(`DEBUG: Message ${index} is marked as user but looks like AI content - correcting flag`);
                    // Return a new message object with corrected flag
                    return { ...msg, is_ai: true };
                }
                
                // If needsDeepAnalysis is true and it's an even index message after the first,
                // make sure it's marked as user message
                if (needsDeepAnalysis && msg.is_ai && index > 0 && index % 2 === 0) {
                    console.warn(`DEBUG: Message ${index} is marked as AI but should be user content - correcting flag`);
                    return { ...msg, is_ai: false };
                }
                
                return msg;
            });

            console.log("DEBUG: Setting initial messages from props");
            console.log("DEBUG: Initial messages content:", correctedMessages.map(m => ({
                is_ai: m.is_ai,
                content_preview: m.content.substring(0, 30) + '...'
            })));

            // Re-count after correction
            let correctedUserCount = 0;
            let correctedAiCount = 0;
            
            correctedMessages.forEach(msg => {
                if (msg.is_ai) {
                    correctedAiCount++;
                } else {
                    correctedUserCount++;
                }
            });
            
            console.log(`DEBUG: After correction - User: ${correctedUserCount}, AI: ${correctedAiCount}`);

            // Sort messages by timestamp to ensure correct order
            const sortedMessages = [...correctedMessages].sort((a, b) => {
                const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
                const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
                return timeA - timeB;
            });

            console.log("DEBUG: Sorted messages by timestamp");
            
            setMessages(sortedMessages);
