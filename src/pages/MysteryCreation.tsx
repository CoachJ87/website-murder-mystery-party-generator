
import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import MysteryChat from "@/components/MysteryChat";
import { useAuth } from "@/context/AuthContext";
import { Message, FormValues } from "@/components/types";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const MysteryCreation = () => {
    const [loading, setLoading] = useState(true);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const [systemInstruction, setSystemInstruction] = useState<string | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [theme, setTheme] = useState<string>("Murder Mystery");
    const [shouldSkipForm, setShouldSkipForm] = useState(false);
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;
    const { isAuthenticated, user } = useAuth();
    const isMobile = useIsMobile();

    useEffect(() => {
        if (isEditing && id) {
            loadExistingConversation(id);
        } else {
            setLoading(false);
        }
    }, [id]);

    const extractTitleFromMessages = (messages: any[]) => {
        if (!messages || messages.length === 0) return null;
        const aiMessages = messages.filter(msg => {
            if (msg.role) return msg.role === 'assistant';
            return msg.is_ai === true;
        });
        
        if (aiMessages.length === 0) return null;
        const titlePatterns = [
            /"([^"]+)"\s*(?:-\s*A\s+MURDER\s+MYSTERY)?/i,
            /#\s*["']([^"']+)["']/i,
            /#\s*([A-Z][A-Z\s]+[A-Z])/,
            /title:\s*["']?([^"'\n]+)["']?/i,
        ];
        for (const message of aiMessages) {
            const content = message.content || '';
            if (content.includes("# Questions") || content.includes("## Questions") || content.toLowerCase().includes("clarification")) {
                continue;
            }
            for (const pattern of titlePatterns) {
                const match = content.match(pattern);
                if (match && match[1]) {
                    return formatTitle(match[1]);
                }
            }
        }
        return null;
    };

    const formatTitle = (title: string) => {
        let cleanTitle = title.trim().replace(/^["']|["']$/g, '');
        if (cleanTitle === cleanTitle.toUpperCase() && cleanTitle.length > 3) {
            cleanTitle = cleanTitle.toLowerCase();
        }
        return cleanTitle
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const loadExistingConversation = async (conversationId: string) => {
        try {
            setIsLoadingHistory(true);
            console.log("Loading conversation with ID:", conversationId);
            const { data, error } = await supabase
                .from("conversations")
                .select("*, messages(*), system_instruction, mystery_data")
                .eq("id", conversationId)
                .maybeSingle();

            if (error) {
                console.error("Error loading conversation:", error);
                toast.error("Failed to load conversation data");
                return;
            }

            console.log("Conversation data loaded:", data);
            
            if (data) {
                setConversationId(data.id);
                const loadedMessages = data.messages as Message[] || [];
                setMessages(loadedMessages);
                setSystemInstruction(data.system_instruction);

                // Determine if we should skip the form based on existing messages
                const hasMessages = loadedMessages.length > 0;
                setShouldSkipForm(hasMessages);

                // Extract theme from mystery_data
                let extractedTheme = "Murder Mystery";
                if (data.mystery_data && typeof data.mystery_data === 'object') {
                    extractedTheme = data.mystery_data.theme || extractedTheme;
                }
                setTheme(extractedTheme);

                if (loadedMessages.length > 0) {
                    const aiTitle = extractTitleFromMessages(loadedMessages);
                    if (aiTitle) {
                        await supabase
                            .from("conversations")
                            .update({
                                title: aiTitle,
                                updated_at: new Date().toISOString()
                            })
                            .eq("id", conversationId);
                    }
                }
            } else {
                console.log("No conversation data found");
                toast.error("This mystery doesn't exist or was deleted");
                navigate('/mystery/create', { replace: true });
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Failed to load conversation");
        } finally {
            setIsLoadingHistory(false);
            setLoading(false);
        }
    };

    const saveMessage = async (message: Message) => {
        if (!isAuthenticated || !user || !conversationId) {
            console.log("Cannot save message: missing auth or conversation ID");
            return;
        }

        try {
            console.log("Saving message to database:", message);
            const { error } = await supabase
                .from("messages")
                .insert({
                    conversation_id: conversationId,
                    content: message.content,
                    role: message.is_ai ? "assistant" : "user",
                });

            if (error) {
                console.error("Error saving message:", error);
                toast.error("Failed to save message");
            } else {
                console.log("Message saved to database:", message);
            }
        } catch (error) {
            console.error("Error saving message:", error);
        }
    };

    const handleSaveMessages = async (newMessage: Message) => {
        if (conversationId) {
            await saveMessage(newMessage);
            setMessages(prevMessages => [...prevMessages, newMessage]);

            const updatedMessages = [...messages, newMessage];
            const aiMessages = updatedMessages.filter(m => m.is_ai === true);
            const aiTitle = extractTitleFromMessages(aiMessages);
            if (aiTitle) {
                console.log("Found AI title:", aiTitle);
                await supabase
                    .from("conversations")
                    .update({
                        title: aiTitle,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", conversationId);
            }
        } else {
            toast.error("Conversation ID not found, cannot save message.");
        }
    };

    const handleGenerateMystery = async (messages: Message[]) => {
        console.log("conversationId when Generate Final Mystery clicked:", conversationId);
        if (conversationId) {
            navigate(`/mystery/preview/${conversationId}`);
        } else {
            toast.error("Please save your mystery first");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="animate-pulse flex flex-col items-center">
                        <div className="h-8 w-64 bg-secondary rounded mb-4"></div>
                        <div className="h-4 w-48 bg-muted rounded"></div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className={cn("flex-1", isMobile ? "py-4 px-2" : "py-12 px-4")}>
                <div className={cn("container mx-auto", isMobile ? "max-w-full" : "max-w-4xl")}>
                    <div className={cn("mb-8", isMobile && "mb-4")}>
                        <h1 className={cn("text-3xl font-bold mb-2", isMobile && "text-2xl mb-1")}>
                            {isEditing ? "Edit Mystery" : "Create New Mystery"}
                        </h1>
                        <p className="text-muted-foreground">
                            Chat with our AI to refine your murder mystery
                        </p>
                    </div>

                    <Card className={isMobile ? "border-0 shadow-none bg-transparent" : ""}>
                        <CardContent className={cn("p-6", isMobile && "p-0")}>
                            <MysteryChat
                                initialTheme={theme}
                                savedMysteryId={id}
                                onSave={handleSaveMessages}
                                onGenerateFinal={handleGenerateMystery}
                                initialMessages={messages}
                                isLoadingHistory={isLoadingHistory}
                                systemInstruction={systemInstruction}
                                preventDuplicateMessages={true}
                                skipForm={shouldSkipForm}
                            />
                        </CardContent>
                    </Card>

                    <div className={cn("mt-8 flex justify-center gap-4", isMobile && "mt-4")}>
                        <Button
                            variant="outline"
                            onClick={() => navigate("/dashboard")}
                            size={isMobile ? "sm" : "default"}
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default MysteryCreation;
