import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAIResponse } from "@/services/aiService";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Message } from "@/components/types";
import { Loader2 } from "lucide-react";

interface MysteryChatProps {
    initialTheme?: string;
    savedMysteryId?: string;
    onSave?: (messages: Message[]) => void;
    initialPlayerCount?: number;
    initialHasAccomplice?: boolean;
    initialScriptType?: "full" | "pointForm";
    initialAdditionalDetails?: string;
    initialMessages?: Message[];
    isLoadingHistory?: boolean;
}

const MysteryChat = ({
    initialTheme = "",
    savedMysteryId,
    onSave,
    initialPlayerCount,
    initialHasAccomplice,
    initialScriptType,
    initialAdditionalDetails,
    initialMessages = [],
    isLoadingHistory = false
}: MysteryChatProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [initialMessageSent, setInitialMessageSent] = useState(false);
    const messagesInitialized = useRef(false);
    const aiHasRespondedRef = useRef(false);

    console.log("DEBUG: MysteryChat rendering with props:", {
        initialTheme,
        savedMysteryId,
        initialPlayerCount,
        initialHasAccomplice,
        initialScriptType,
        initialAdditionalDetails,
        initialMessagesCount: initialMessages.length,
        isLoadingHistory
    });

    useEffect(() => {
        console.log("DEBUG: Initializing messages effect", {
            initialMessagesLength: initialMessages.length,
            messagesInitialized: messagesInitialized.current,
            currentMessagesLength: messages.length
        });

        if (initialMessages.length > 0 && !messagesInitialized.current) {
            console.log("DEBUG: Setting initial messages from props");
            console.log("DEBUG: Initial messages content:", initialMessages.map(m => ({
                is_ai: m.is_ai,
                content_preview: m.content.substring(0, 30) + '...'
            })));

            setMessages(initialMessages);

            if (initialMessages.length > 0) {
                const lastMessage = initialMessages[initialMessages.length - 1];
                aiHasRespondedRef.current = !!lastMessage.is_ai;
                console.log("DEBUG: Last message is from AI:", !!lastMessage.is_ai);
            }

            setInitialMessageSent(true);
            messagesInitialized.current = true;
        }
    }, [initialMessages]);

    useEffect(() => {
        console.log("DEBUG: Initial prompt creation effect", {
            messagesLength: messages.length,
            initialMessageSent,
            messagesInitialized: messagesInitialized.current,
            isLoadingHistory,
            theme: initialTheme,
            aiHasResponded: aiHasRespondedRef.current,
            initialMessagesLength: initialMessages.length
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

            if (!aiHasRespondedRef.current) {
                console.log("DEBUG: About to call handleAIResponse with initial message");
                handleAIResponse(initialMessage.content);
            } else {
                console.log("DEBUG: Skipping AI response for initial message - AI has already responded");
            }
        } else if (initialMessages.length > 0 && !messagesInitialized.current) {
            console.log("DEBUG: Initial messages were provided, skipping initial prompt creation for theme");
            setMessages(initialMessages);
            if (initialMessages.length > 0) {
                const lastMessage = initialMessages[initialMessages.length - 1];
                aiHasRespondedRef.current = !!lastMessage.is_ai;
                console.log("DEBUG: Last message is from AI:", !!lastMessage.is_ai);
            }
            setInitialMessageSent(true);
            messagesInitialized.current = true;
        }
    }, [initialTheme, initialPlayerCount, initialHasAccomplice, initialScriptType, initialAdditionalDetails, messages.length, initialMessageSent, isLoadingHistory, initialMessages]);

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

        if (onSave) {
            console.log("DEBUG: Calling onSave with updated messages");
            onSave(updatedMessages);
        }

        console.log("DEBUG: About to call handleAIResponse from handleSubmit");
        await handleAIResponse(userMessage.content);
        console.log("DEBUG: handleAIResponse call finished in handleSubmit");
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            console.log("DEBUG: Enter key pressed (without shift), submitting form");
            event.preventDefault();
            handleSubmit(event as unknown as React.FormEvent);
        }
    };

    const handleAIResponse = async (userMessage: string) => {
        console.log("DEBUG: handleAIResponse called with:", userMessage);
        try {
            setLoading(true);

            const anthropicMessages = messages.map(m => ({
                role: m.is_ai ? "assistant" : "user",
                content: m.content,
            }));

            anthropicMessages.push({
                role: "user",
                content: userMessage,
            });

            console.log("DEBUG: anthropicMessages being sent:", JSON.stringify(anthropicMessages, null, 2));

            try {
                console.log("DEBUG: Calling getAIResponse with", {
                    messageCount: anthropicMessages.length,
                    promptVersion: 'free'
                });

                const response = await getAIResponse(
                    anthropicMessages,
                    'free'
                );

                console.log("DEBUG: Received AI response:", response ? response.substring(0, 50) + "..." : "null");

                const aiMessage: Message = {
                    id: Date.now().toString(),
                    content: response,
                    is_ai: true,
                    timestamp: new Date(),
                };

                aiHasRespondedRef.current = true;

                setMessages(prev => {
                    const updatedMessages = [...prev, aiMessage];

                    if (onSave) {
                        console.log("DEBUG: Calling onSave with AI message added");
                        onSave(updatedMessages);
                    }

                    return updatedMessages;
                });
            } catch (error) {
                console.error("DEBUG: Error in getAIResponse:", error);
                // Provide a fallback response when the API call fails
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
                        onSave(updatedMessages);
                    }

                    return updatedMessages;
                });

                toast.error("Failed to get AI response. Please try again.");
            }
        } catch (error) {
            console.error("DEBUG: Error getting AI response:", error);
            toast.error("Failed to get AI response. Please try again.");
        } finally {
            setLoading(false);
        }
        console.log("DEBUG: handleAIResponse finished");
    };

    // Verify render tree
    useEffect(() => {
        console.log("DEBUG: MysteryChat component mounted");
        return () => {
            console.log("DEBUG: MysteryChat component unmounted");
        };
    }, []);

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-background/50 min-h-[400px] max-h-[500px]">
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
                            className={`max-w-[80%] ${message.is_ai ? 'ml-0' : 'ml-auto'} ${
                                message.is_ai ? 'bg-background' : 'bg-primary text-primary-foreground'
                            }`}
                        >
                            <CardContent className="p-4">
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
                                <div className="text-xs opacity-70 mt-2">
                                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
                <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message here..."
                    className="flex-1 min-h-[80px]"
                    disabled={loading || isLoadingHistory}
                />
                <Button
                    type="submit"
                    disabled={loading || isLoadingHistory || !input.trim()}
                    onClick={() => console.log("DEBUG: Send button clicked")}
                >
                    {loading ? "Thinking..." : "Send"}
                </Button>
            </form>
        </div>
    );
};

export default MysteryChat;
