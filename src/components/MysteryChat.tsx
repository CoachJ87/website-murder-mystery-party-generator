
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAIResponse } from "@/services/aiService";
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import { Message } from "@/components/types";

interface MysteryChatProps {
    initialTheme?: string;
    savedMysteryId?: string;
    onSave?: (messages: Message[]) => void;
    initialPlayerCount?: number;
    initialHasAccomplice?: boolean;
    initialScriptType?: "full" | "pointForm";
    initialAdditionalDetails?: string;
    initialMessages?: Message[];
}

const MysteryChat = ({
    initialTheme = "",
    savedMysteryId,
    onSave,
    initialPlayerCount,
    initialHasAccomplice,
    initialScriptType,
    initialAdditionalDetails,
    initialMessages = []
}: MysteryChatProps) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [initialMessageSent, setInitialMessageSent] = useState(false);
    const messagesInitialized = useRef(false);

    // Initialize messages from props
    useEffect(() => {
        console.log("Initial messages provided:", initialMessages.length);
        if (initialMessages.length > 0 && !messagesInitialized.current) {
            console.log("Setting initial messages:", initialMessages);
            setMessages(initialMessages);
            setInitialMessageSent(true);
            messagesInitialized.current = true;
        }
    }, [initialMessages]);

    // Handle creating initial prompt if no messages exist
    useEffect(() => {
        console.log("initialHasAccomplice in Chat:", initialHasAccomplice);
        console.log("Initial messages state:", messages.length);
        console.log("initialMessageSent:", initialMessageSent);

        // Skip if we already have messages or already sent initial message
        if ((messages.length > 0 || initialMessageSent) || messagesInitialized.current) {
            console.log("Skipping initial message creation");
            return;
        }

        // Critical fix: Only send an initial message if there are no existing messages
        // and we haven't sent one already
        if (initialTheme && messages.length === 0 && !initialMessageSent) {
            console.log("Creating initial message with theme:", initialTheme);
            let initialChatMessage = `Let's create a murder mystery`;
            if (initialTheme) {
                initialChatMessage += ` with a ${initialTheme} theme`;
            }
            if (initialPlayerCount) {
                initialChatMessage += ` for ${initialPlayerCount} players`;
            }
            if (initialHasAccomplice !== undefined) {
                initialChatMessage += initialHasAccomplice ? `, including an accomplice` : `, without an accomplice`;
            }
            if (initialScriptType) {
                initialChatMessage += ` with ${initialScriptType} scripts`;
            }
            if (initialAdditionalDetails) {
                initialChatMessage += `. Additional details: ${initialAdditionalDetails}`;
            }
            initialChatMessage += ".";

            const initialMessage: Message = {
                id: Date.now().toString(),
                content: initialChatMessage,
                is_ai: false,
                timestamp: new Date(),
            };
            
            console.log("Setting initial user message:", initialMessage);
            setMessages([initialMessage]);
            setInitialMessageSent(true);
            messagesInitialized.current = true;
            
            // Critical fix: Add a small delay before calling AI to ensure state is updated
            setTimeout(() => {
                handleAIResponse(initialMessage.content);
            }, 100);
        }
    }, [initialTheme, initialPlayerCount, initialHasAccomplice, initialScriptType, initialAdditionalDetails, messages.length, initialMessageSent]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            content: input.trim(),
            is_ai: false,
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        await handleAIResponse(userMessage.content);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSubmit(event as unknown as React.FormEvent);
        }
    };

    const handleAIResponse = async (userMessage: string) => {
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

            console.log("Frontend - anthropicMessages being sent:", JSON.stringify(anthropicMessages, null, 2));

            const response = await getAIResponse(
                anthropicMessages as any,
                'free'
            );

            const aiMessage: Message = {
                id: Date.now().toString(),
                content: response,
                is_ai: true,
                timestamp: new Date(),
            };

            setMessages(prev => {
                const updatedMessages = [...prev, aiMessage];
                
                // Call onSave with the updated messages
                if (onSave) {
                    console.log("Calling onSave with updated messages:", updatedMessages.length);
                    onSave(updatedMessages);
                }
                
                return updatedMessages;
            });

        } catch (error) {
            console.error("Error getting AI response:", error);
            toast.error("Failed to get AI response");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-background/50 min-h-[400px] max-h-[500px]">
                {messages.length === 0 ? (
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
                                                h1: ({node, ...props}) => <h1 className="text-xl font-bold my-2" {...props} />,
                                                h2: ({node, ...props}) => <h2 className="text-lg font-bold my-2" {...props} />,
                                                h3: ({node, ...props}) => <h3 className="text-md font-bold my-1" {...props} />,
                                                ul: ({node, ...props}) => <ul className="list-disc ml-4 my-2" {...props} />,
                                                ol: ({node, ...props}) => <ol className="list-decimal ml-4 my-2" {...props} />,
                                                li: ({node, ...props}) => <li className="my-1" {...props} />,
                                                p: ({node, ...props}) => <p className="my-2" {...props} />,
                                                a: ({node, ...props}) => <a className="text-blue-500 underline" {...props} />,
                                                em: ({node, ...props}) => <em className="italic" {...props} />,
                                                strong: ({node, ...props}) => <strong className="font-bold" {...props} />,
                                                code: ({node, ...props}) => <code className="bg-gray-200 dark:bg-gray-700 px-1 py-0.5 rounded" {...props} />
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
                    disabled={loading}
                />
                <Button type="submit" disabled={loading || !input.trim()}>
                    {loading ? "Thinking..." : "Send"}
                </Button>
            </form>
        </div>
    );
};

export default MysteryChat;
