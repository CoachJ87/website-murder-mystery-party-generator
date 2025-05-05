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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

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
    const isMobile = useIsMobile();

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

            if (sortedMessages.length > 0) {
                const lastMessage = sortedMessages[sortedMessages.length - 1];
                aiHasRespondedRef.current = !!lastMessage.is_ai;
                console.log("DEBUG: Last message is from AI:", !!lastMessage.is_ai);
            }

            setInitialMessageSent(true);
            messagesInitialized.current = true;
            
            // Check if we already have the initial form prompt
            const hasInitialFormPrompt = sortedMessages.some(msg => 
                !msg.is_ai && msg.content.includes(`Let's create a murder mystery`)
            );
            initialFormPromptSaved.current = hasInitialFormPrompt;
        }
    }, [initialMessages]);

    // Separate effect to handle triggering AI response for last user message
    useEffect(() => {
        if (messagesInitialized.current && messages.length > 0 && !isLoadingHistory) {
            const lastMessage = messages[messages.length - 1];
            
            // Only trigger AI response if the last message is from the user and AI hasn't responded yet
            if (!lastMessage.is_ai && !aiHasRespondedRef.current) {
                console.log("DEBUG: Last message is from user, triggering AI response");
                handleAIResponse(lastMessage.content, false); // Pass false to indicate not user-initiated
            }
        }
    }, [messages, messagesInitialized.current, isLoadingHistory]);

    useEffect(() => {
        console.log("DEBUG: Initial prompt creation effect", {
            messagesLength: messages.length,
            initialMessageSent,
            messagesInitialized: messagesInitialized.current,
            isLoadingHistory,
            theme: initialTheme,
            aiHasResponded: aiHasRespondedRef.current,
            initialMessagesLength: initialMessages.length,
            initialFormPromptSaved: initialFormPromptSaved.current
        });

        if (messages.length > 0 || initialMessageSent || messagesInitialized.current || isLoadingHistory) {
            console.log("DEBUG: Skipping initial message creation - condition failed");
            return;
        }

        if (initialTheme && initialMessages.length === 0 && !isLoadingHistory) {
            console.log("DEBUG: Creating initial message with theme:", initialTheme);
            let initialChatMessage = `Let's create a murder mystery`;
            if (initialTheme) initialChatMessage += ` with a ${initialTheme} theme`;
            if (initialPlayerCount) initialChatMessage += ` for ${initialPlayerCount} players`;
            if (initialHasAccomplice !== undefined) initialChatMessage += initialHasAccomplice ? `, including an accomplice` : `, without an accomplice`;
            if (initialScriptType) initialChatMessage += ` with ${initialScriptType} scripts`;
            if (initialAdditionalDetails) initialChatMessage += `. Additional details: ${initialAdditionalDetails}`;
            initialChatMessage += ".";

            console.log("DEBUG: Initial chat message:", initialChatMessage);

            const initialMessage: Message = {
                id: Date.now().toString(),
                content: initialChatMessage,
                is_ai: false,
                timestamp: new Date(),
            };

            console.log("DEBUG: Setting initial user message:", initialMessage);
            setMessages([initialMessage]);
            setInitialMessageSent(true);
            messagesInitialized.current = true;
            
            // Save the initial form prompt message to the database
            if (onSave && !initialFormPromptSaved.current) {
                console.log("DEBUG: Saving initial form prompt to database");
                onSave(initialMessage);
                initialFormPromptSaved.current = true;
            }
        } else if (initialMessages.length > 0 && !messagesInitialized.current) {
            console.log("DEBUG: Initial messages were provided, skipping initial prompt creation for theme");
        }
    }, [initialTheme, initialPlayerCount, initialHasAccomplice, initialScriptType, initialAdditionalDetails, messages.length, initialMessageSent, isLoadingHistory, initialMessages, onSave]);

    // Make sure form data gets saved for edit mode if not present
    useEffect(() => {
        if (isEditModeRef.current && messages.length > 0 && !initialFormPromptSaved.current && !isLoadingHistory) {
            console.log("DEBUG: Checking if we need to add the initial form prompt");
            
            // Check if we have the initial form prompt
            const hasInitialFormPrompt = messages.some(msg => 
                !msg.is_ai && msg.content.includes(`Let's create a murder mystery`)
            );
            
            if (!hasInitialFormPrompt && initialTheme) {
                console.log("DEBUG: Adding missing initial form prompt for edit mode");
                
                // Create the initial form prompt
                let initialChatMessage = `Let's create a murder mystery`;
                if (initialTheme) initialChatMessage += ` with a ${initialTheme} theme`;
                if (initialPlayerCount) initialChatMessage += ` for ${initialPlayerCount} players`;
                if (initialHasAccomplice !== undefined) initialChatMessage += initialHasAccomplice ? `, including an accomplice` : `, without an accomplice`;
                if (initialScriptType) initialChatMessage += ` with ${initialScriptType} scripts`;
                if (initialAdditionalDetails) initialChatMessage += `. Additional details: ${initialAdditionalDetails}`;
                initialChatMessage += ".";
                
                const initialMessage: Message = {
                    id: Date.now().toString(),
                    content: initialChatMessage,
                    is_ai: false,
                    timestamp: new Date(Date.now() - 1000000), // Set timestamp to earlier than other messages
                };
                
                // Save to database
                if (onSave) {
                    console.log("DEBUG: Saving missing initial form prompt to database");
                    onSave(initialMessage);
                }
                
                // Add to messages at the beginning
                setMessages(prev => [initialMessage, ...prev]);
                initialFormPromptSaved.current = true;
            } else {
                initialFormPromptSaved.current = true;
            }
        }
    }, [messages, isLoadingHistory, initialTheme, initialPlayerCount, initialHasAccomplice, initialScriptType, initialAdditionalDetails, onSave]);

    const scrollToBottom = () => {
        console.log("DEBUG: Scrolling to bottom of messages");
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        console.log("DEBUG: handleSubmit called with input:", input);
        if (!input.trim()) {
            console.log("DEBUG: Empty input, returning early from handleSubmit");
            return;
        }

        const userMessage: Message = {
            id: Date.now().toString(),
            content: input.trim(),
            is_ai: false,
            timestamp: new Date(),
        };

        console.log("DEBUG: Creating user message:", userMessage);
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setError(null);
        setHasUserEditedInSession(true); // Mark that the user has submitted a new message in this session

        if (onSave) {
            console.log("DEBUG: Calling onSave with updated messages");
            onSave(userMessage);
        }

        console.log("DEBUG: About to call handleAIResponse from handleSubmit");
        await handleAIResponse(userMessage.content, true); // Pass true to indicate user-initiated
        console.log("DEBUG: handleAIResponse call finished in handleSubmit");
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            console.log("DEBUG: Enter key pressed (without shift), submitting form");
            event.preventDefault();
            handleSubmit(event as unknown as React.FormEvent);
        }
    };

    const handleAIResponse = async (userMessage: string, isUserInitiated: boolean = false) => {
        console.log("DEBUG: handleAIResponse called with:", userMessage, "isUserInitiated:", isUserInitiated);
        try {
            setLoading(true);
            setError(null);
            toast.info("AI is thinking...");

            let anthropicMessages;
            
            // Use different context strategies based on whether this is a user-initiated message
            // in edit mode, and whether the user has edited in this session
            if (isEditModeRef.current && isUserInitiated) {
                console.log("DEBUG: Edit mode with user-initiated message, limiting conversation context");
                
                const lastAiMessageIndex = [...messages].reverse().findIndex(m => m.is_ai);
                
                if (lastAiMessageIndex >= 0) {
                    const lastAiMessage = [...messages].reverse()[lastAiMessageIndex];
                    // Include the form data summary as context at the start of each new user message
                    anthropicMessages = [
                        {
                            role: "assistant",
                            content: lastAiMessage.content
                        },
                        {
                            role: "user",
                            content: userMessage
                        }
                    ];
                    console.log("DEBUG: Using last AI response + new user message for context");
                } else {
                    anthropicMessages = [
                        {
                            role: "user",
                            content: "Let's continue our murder mystery planning. " + userMessage
                        }
                    ];
                    console.log("DEBUG: No AI messages found, using single message with context hint");
                }
            } else if (isEditModeRef.current && !isUserInitiated) {
                console.log("DEBUG: Edit mode with auto-triggered response, using last few messages for context");
                
                // For initial load in edit mode, only take the last 3-4 messages to avoid context overload
                const contextSize = 4; // Take the last 4 messages for context
                const recentMessages = messages.slice(-contextSize);
                
                anthropicMessages = recentMessages.map(m => ({
                    role: m.is_ai ? "assistant" : "user",
                    content: m.content,
                }));
                
                // Ensure the current user message is included if not already
                if (anthropicMessages.length === 0 || 
                    (anthropicMessages.length > 0 && 
                     anthropicMessages[anthropicMessages.length - 1].content !== userMessage)) {
                    anthropicMessages.push({
                        role: "user",
                        content: userMessage
                    });
                }
                
                console.log("DEBUG: Using last few messages for context in initial edit mode response");
            } else {
                // Standard approach for new mysteries - include full history
                anthropicMessages = messages.map(m => ({
                    role: m.is_ai ? "assistant" : "user",
                    content: m.content,
                }));

                const currentUserMessage = {
                    role: "user",
                    content: userMessage,
                };

                if (anthropicMessages.length === 0 || 
                    (anthropicMessages.length > 0 && 
                    anthropicMessages[anthropicMessages.length - 1].content !== userMessage)) {
                    anthropicMessages.push(currentUserMessage);
                }
                console.log("DEBUG: Using full conversation context for new mystery");
            }

            console.log("DEBUG: anthropicMessages being sent:", JSON.stringify(anthropicMessages.map((m, i) => ({
                index: i,
                role: m.role,
                contentPreview: m.content.substring(0, 30) + '...'
            })), null, 2));

            // Create a custom system instruction that emphasizes not to ask about already-provided preferences
            const customSystemInstruction = systemInstruction || createSystemMessage();
            console.log("DEBUG: System instruction exists:", !!customSystemInstruction);
            console.log("DEBUG: System instruction (first 100 chars):", customSystemInstruction.substring(0, 100) + "...");

            try {
                console.log("DEBUG: Calling getAIResponse with", {
                    messageCount: anthropicMessages.length,
                    promptVersion: 'free'
                });

                const response = await getAIResponse(
                    anthropicMessages,
                    'free',
                    customSystemInstruction
                );

                console.log("DEBUG: Received AI response:", response ? response.substring(0, 50) + "..." : "null");

                if (!response) {
                    throw new Error("Failed to get a response from AI");
                }

                if (response.includes("There was an error")) {
                    throw new Error(response);
                }

                // Check if the response is asking about already-provided information
                const responseText = response;
                const askingAboutPlayerCount = responseText.toLowerCase().includes("how many players") || 
                                              (responseText.toLowerCase().includes("player count") && responseText.includes("?"));
                const askingAboutTheme = (responseText.toLowerCase().includes("theme") || 
                                          responseText.toLowerCase().includes("setting")) && 
                                          responseText.includes("?") && responseText.toLowerCase().includes("prefer");
                const askingAboutAccomplice = responseText.toLowerCase().includes("accomplice") && responseText.includes("?");
                
                let finalResponse = response;
                
                if (askingAboutPlayerCount || askingAboutTheme || askingAboutAccomplice) {
                    console.log("DEBUG: AI asking about already provided info, creating corrected response");
                    // Create a modified response that acknowledges the preferences
                    finalResponse = `I'll create a murder mystery based on your specifications: ${initialTheme} theme${initialPlayerCount ? `, ${initialPlayerCount} players` : ''}${initialHasAccomplice !== undefined ? (initialHasAccomplice ? ', with an accomplice' : ', without an accomplice') : ''}${initialScriptType ? `, with ${initialScriptType} scripts` : ''}.

${responseText.split('\n\n').slice(1).join('\n\n')}`;
                }

                const aiMessage: Message = {
                    id: Date.now().toString(),
                    content: finalResponse,
                    is_ai: true,
                    timestamp: new Date(),
                };

                aiHasRespondedRef.current = true;

                setMessages(prev => {
                    const updatedMessages = [...prev, aiMessage];

                    if (onSave) {
                        console.log("DEBUG: Calling onSave with AI message added");
                        onSave(aiMessage);
                    }

                    return updatedMessages;
                });

                toast.success("AI response received!");
            } catch (error) {
                console.error("DEBUG: Error in getAIResponse:", error);
                setError(error instanceof Error ? error.message : "Unknown error occurred");
                toast.error("Failed to get AI response. Please try again.");

                const fallbackMessage: Message = {
                    id: Date.now().toString(),
                    content: "I'm having trouble connecting to my AI service right now. Please try again in a moment.",
                    is_ai: true,
                    timestamp: new Date(),
                };

                setMessages(prev => {
                    const updatedMessages = [...prev, fallbackMessage];

                    if (onSave) {
                        console.log("DEBUG: Calling onSave with fallback message");
                        onSave(fallbackMessage);
                    }

                    return updatedMessages;
                });
            }
        } catch (error) {
            console.error("DEBUG: Error getting AI response:", error);
            setError(error instanceof Error ? error.message : "Unknown error occurred");
            toast.error("Failed to get AI response. Please try again.");
        } finally {
            setLoading(false);
        }
        console.log("DEBUG: handleAIResponse finished");
    };

    const retryLastMessage = () => {
        const lastUserMessageIndex = [...messages].reverse().findIndex(m => !m.is_ai);
        if (lastUserMessageIndex >= 0) {
            const lastUserMessage = [...messages].reverse()[lastUserMessageIndex];
            const messagesUntilLastUser = messages.slice(0, messages.length - lastUserMessageIndex);
            setMessages(messagesUntilLastUser);
            handleAIResponse(lastUserMessage.content, true); // Treat retry as user-initiated
        }
    };

    const handleGenerateFinalClick = () => {
        console.log("DEBUG: Generate Final button clicked, sending all messages");
        if (onGenerateFinal) {
            onGenerateFinal(messages);
        } else {
            toast.error("Final generation callback not provided.");
        }
    };

    useEffect(() => {
        console.log("DEBUG: MysteryChat component mounted");
        return () => {
            console.log("DEBUG: MysteryChat component unmounted");
        };
    }, []);

    return (
        <div data-testid="mystery-chat" className={cn("flex flex-col h-full", isMobile && "h-[calc(100vh-120px)]")}>
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <h4 className="text-sm font-medium text-red-800 dark:text-red-300">Error connecting to AI service</h4>
                        <p className="text-sm text-red-700 dark:text-red-400 mt-1">{error}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-2 text-xs"
                            onClick={retryLastMessage}
                        >
                            Try Again
                        </Button>
                    </div>
                </div>
            )}

            <div 
                className={cn(
                    "flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-background/50",
                    isMobile ? "min-h-[60vh] max-h-[70vh] border-0 p-2 -mx-2" : "min-h-[400px] max-h-[500px]"
                )}
            >
                {isLoadingHistory ? (
                    <div className="flex flex-col items-center justify-center h-full">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-2 text-muted-foreground">Loading conversation history...</p>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                        <p>Start creating your murder mystery by sending your first message.</p>
                    </div>
                ) : (
                    messages.map((message) => (
                        <Card
                            key={message.id}
                            className={cn(
                                "max-w-[80%]",
                                message.is_ai ? "ml-0" : "ml-auto",
                                message.is_ai ? "bg-background" : "bg-primary text-primary-foreground",
                                isMobile && "shadow-sm border-0"
                            )}
                        >
                            <CardContent className={cn("p-4", isMobile && "p-3")}>
                                <div className={`prose prose-sm ${message.is_ai ? 'prose-stone dark:prose-invert' : 'text-primary-foreground prose-invert'} max-w-none`}>
                                    {message.content && typeof message.content === 'string' ? (
                                        <ReactMarkdown
                                            rehypePlugins={[rehypeRaw]}
                                            components={{
                                                h1: ({ node, ...props }) => <h1 className="text-xl font-bold my-2" {...props} />,
                                                h2: ({ node, ...props }) => <h2 className="text-lg font-bold my-2" {...props} />,
                                                h3: ({ node, ...props }) => <h3 className="text-md font-bold my-1" {...props} />,
                                                ul: ({ node, ...props }) => <ul className="list-disc ml-4 my-2" {...props} />,
                                                ol: ({ node, ...props }) => <ol className="list-decimal ml-4 my-2" {...props} />,
                                                li: ({ node, ...props }) => <li className="my-1" {...props} />,
                                                p: ({ node, ...props }) => <p className="my-2" {...props} />,
                                                a: ({ node, ...props }) => <a className="text-blue-500 underline" {...props} />,
                                                em: ({ node, ...props }) => <em className="italic" {...props} />,
                                                strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                                                code: ({ node, ...props }) => <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded" {...props} />
                                            }}
                                        >
                                            {message.content}
                                        </ReactMarkdown>
                                    ) : (
                                        <p>Unable to display message</p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className={cn("border-t", isMobile ? "p-2" : "p-4")}>
                <div className={cn("flex items-center", isMobile ? "space-x-2" : "space-x-4")}>
                    <Textarea
                        placeholder="Ask the AI..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="flex-1 resize-none"
                        rows={isMobile ? 2 : 3}
                    />
                    <Button type="submit" disabled={loading} className="ml-2" size={isMobile ? "sm" : "default"}>
                        {loading ? (
                            <Loader2 className={cn("animate-spin", isMobile ? "h-3 w-3" : "h-4 w-4")} />
                        ) : (
                            <Send className={cn(isMobile ? "h-3 w-3" : "h-4 w-4")} />
                        )}
                    </Button>
                </div>
            </form>

            {messages.length > 1 && !loading && (
                <div className={cn("border-t", isMobile ? "p-2" : "p-4")}>
                    <Button onClick={handleGenerateFinalClick} variant="secondary" size={isMobile ? "sm" : "default"}>
                        <Wand2 className={cn("mr-2", isMobile ? "h-3 w-3" : "h-4 w-4")} /> 
                        Generate Final Mystery
                    </Button>
                </div>
            )}
        </div>
    );
};

export default MysteryChat;
