import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import MysteryForm from "@/components/MysteryForm";
import MysteryChat from "@/components/MysteryChat";
import { useAuth } from "@/context/AuthContext";
import { Message, FormValues } from "@/components/types";

const MysteryCreation = () => {
    const [saving, setSaving] = useState(false);
    const [showChatUI, setShowChatUI] = useState(false);
    const [formData, setFormData] = useState<FormValues | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoadingHistory, setIsLoadingHistory] = useState(false);
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        if (isEditing && id) {
            console.log("useEffect [id] triggered. ID:", id);
            loadExistingConversation(id);
        }
    }, [id]);

    // Create a system message based on form data
    const createSystemMessage = (data: FormValues) => {
        let systemMsg = "This is a murder mystery creation conversation. ";
        systemMsg += "The user has ALREADY selected the following preferences, so DO NOT ask about these again: ";
        
        if (data.theme) {
            systemMsg += `Theme: ${data.theme}. `;
        }
        if (data.playerCount) {
            systemMsg += `Player count: ${data.playerCount}. `;
        }
        if (data.hasAccomplice !== undefined) {
            systemMsg += `Accomplice: ${data.hasAccomplice ? "Yes" : "No"}. `;
        }
        if (data.scriptType) {
            systemMsg += `Script type: ${data.scriptType}. `;
        }
        if (data.additionalDetails) {
            systemMsg += `Additional details: ${data.additionalDetails}. `;
        }
        
        systemMsg += "Please start directly with creating a suitable murder mystery based on these preferences without asking clarifying questions about these specified parameters. You may ask about other aspects of the mystery if needed.";
        
        return systemMsg;
    };

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
                .select("*, messages(*)")
                .eq("id", conversationId)
                .maybeSingle();

            if (error) {
                console.error("Error loading conversation:", error);
                toast.error("Failed to load conversation data");
                return;
            }

            console.log("Conversation data loaded:", data);
            
            if (data) {
                console.log("Loaded conversation data:", data);
                setShowChatUI(true);
                setConversationId(data.id);
                setMessages(data.messages as Message[] || []);

                if (data.mystery_data) {
                    setFormData(data.mystery_data as FormValues);
                }

                if (data.messages && data.messages.length > 0) {
                    const aiTitle = extractTitleFromMessages(data.messages);
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

    const handleSave = async (data: FormValues) => {
        try {
            setSaving(true);
            console.log("formData on save:", data);

            await new Promise<void>((resolve) => {
                setFormData(data);
                resolve();
            });

            if (isAuthenticated && user) {
                let newConversationId = id;

                // Create system instruction based on form data
                const systemInstruction = createSystemMessage(data);

                if (!isEditing) {
                    const { data: newConversation, error } = await supabase
                        .from("conversations")
                        .insert({
                            title: data.title || `${data.theme} Mystery`,
                            mystery_data: data,
                            user_id: user.id,
                            system_instruction: systemInstruction  // Save the system instruction
                        })
                        .select()
                        .single();

                    if (error) {
                        console.error("Error saving mystery:", error);
                        toast.error("Failed to save mystery data");
                    } else if (newConversation) {
                        newConversationId = newConversation.id;
                        setConversationId(newConversationId);
                    }
                } else {
                    const { error } = await supabase
                        .from("conversations")
                        .update({
                            title: data.title || `${data.theme} Mystery`,
                            mystery_data: data,
                            updated_at: new Date().toISOString(),
                            system_instruction: systemInstruction  // Update the system instruction
                        })
                        .eq("id", id);

                    if (error) {
                        console.error("Error updating mystery:", error);
                        toast.error("Failed to update mystery data");
                    }
                }

                setShowChatUI(true);
                if (newConversationId && newConversationId !== id) {
                    navigate(`/mystery/edit/${newConversationId}`, { replace: true });
                }
            } else {
                setShowChatUI(true);
            }

            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error("Error saving mystery:", error);
            toast.error(`Failed to ${isEditing ? "update" : "create"} mystery`);
        } finally {
            setSaving(false);
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

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 py-12 px-4">
                <div className="container mx-auto max-w-4xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">
                            {isEditing ? "Edit Mystery" : "Create New Mystery"}
                        </h1>
                        <p className="text-muted-foreground">
                            {showChatUI
                                ? "Chat with our AI to refine your murder mystery"
                                : "Start your new mystery by selecting from the options below."}
                        </p>
                    </div>

                    <Card>
                        <CardContent className="p-6">
                            {showChatUI && formData ? (
                                <MysteryChat
                                    initialTheme={formData?.theme}
                                    savedMysteryId={id}
                                    onSave={handleSaveMessages}
                                    onGenerateFinal={handleGenerateMystery}
                                    initialPlayerCount={formData?.playerCount}
                                    initialHasAccomplice={formData?.hasAccomplice}
                                    initialScriptType={formData?.scriptType as 'full' | 'pointForm'}
                                    initialAdditionalDetails={formData?.additionalDetails}
                                    initialMessages={messages}
                                    isLoadingHistory={isLoadingHistory}
                                    systemInstruction={createSystemMessage(formData)}
                                />
                            ) : (
                                <MysteryForm
                                    onSave={handleSave}
                                    isSaving={saving}
                                />
                            )}
                        </CardContent>
                    </Card>

                    <div className="mt-8 flex justify-center gap-4">
                        {showChatUI ? (
                            <Button
                                variant="outline"
                                onClick={() => navigate("/dashboard")}
                            >
                                Back to Dashboard
                            </Button>
                        ) : (
                            <Button variant="outline" onClick={() => navigate("/dashboard")}>
                                Back to Dashboard
                            </Button>
                        )}
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default MysteryCreation;
