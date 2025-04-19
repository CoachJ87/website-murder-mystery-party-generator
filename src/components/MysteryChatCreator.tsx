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
import { Wand2 } from "lucide-react";

const MysteryChatCreator = () => {
    const [saving, setSaving] = useState(false);
    const [showChatUI, setShowChatUI] = useState(false);
    const [formData, setFormData] = useState<FormValues | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;
    const { isAuthenticated, user } = useAuth();
    const [chatMessages, setChatMessages] = useState<Message[]>([]); // To hold chat messages

    useEffect(() => {
        if (isEditing) {
            setShowChatUI(true);
            setConversationId(id || null);
            loadExistingMessages(id); // Load previous messages if editing
        }
    }, [id]);

    const loadExistingMessages = async (conversationId: string) => {
        if (!conversationId) return;
        try {
            const { data, error } = await supabase
                .from("messages")
                .select("*")
                .eq("conversation_id", conversationId)
                .order("created_at", { ascending: true });

            if (error) {
                console.error("Error loading messages:", error);
                toast.error("Failed to load previous messages.");
            } else if (data) {
                setChatMessages(data.map(msg => ({
                    content: msg.content,
                    is_ai: msg.is_ai,
                    role: msg.role
                })));
            }
        } catch (error) {
            console.error("Error loading messages:", error);
            toast.error("Failed to load previous messages.");
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

                if (!isEditing) {
                    const { data: newConversation, error } = await supabase
                        .from("conversations")
                        .insert({
                            title: data.title || `${data.theme} Mystery`,
                            mystery_data: data,
                            user_id: user.id,
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

    const handleSaveChatMessage = async (message: Message) => {
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
                    is_ai: message.is_ai,
                    role: message.role,
                });

            if (error) {
                console.error("Error saving message:", error);
                toast.error("Failed to save message");
            } else {
                console.log("Message saved successfully");
                setChatMessages(prev => [...prev, message]); // Update local chat messages
            }
        } catch (error) {
            console.error("Error saving message:", error);
        }
    };

    const handleGenerateMystery = async (messages: Message[]) => {
        if (!conversationId) {
            toast.error("Conversation ID is missing.");
            return;
        }

        // **THIS IS WHERE YOU WILL CALL getAIResponse**
        console.log("DEBUG (MysteryChatCreator): Generating final mystery with messages:", messages);
        // Convert local Message format to ApiMessage format
        const apiMessages = messages.map(msg => ({
            role: msg.role || (msg.is_ai ? 'assistant' : 'user'),
            content: msg.content,
        }));

        try {
            const response = await getAIResponse(apiMessages, 'paid'); // Assuming 'paid' prompt for final generation
            console.log("DEBUG (MysteryChatCreator): AI Response received:", response);
            navigate(`/mystery/preview/${conversationId}`); // Navigate after receiving response
            // You might want to save the final response to the database here as well
        } catch (error: any) {
            console.error("Error generating mystery:", error);
            toast.error(error.message || "Failed to generate the final mystery.");
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
                            {showChatUI ? (
                                <div className="w-full h-full">
                                    <MysteryChat
                                        initialTheme={formData?.theme || ""}
                                        initialPlayerCount={formData?.playerCount}
                                        initialHasAccomplice={formData?.hasAccomplice}
                                        initialScriptType={formData?.scriptType}
                                        initialAdditionalDetails={formData?.additionalDetails}
                                        savedMysteryId={id}
                                        onSave={handleSaveChatMessage}
                                        onGenerateFinal={handleGenerateMystery} // Pass the generate function
                                        initialMessages={chatMessages} // Pass loaded messages
                                    />
                                </div>
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
                                onClick={() => {
                                    // Trigger the final generation from MysteryChat
                                    const chatComponent = document.querySelector('[data-testid="mystery-chat"]');
                                    if (chatComponent && (chatComponent as any).__reactFiber$?.child?.stateNode?.handleSendMessage) {
                                        (chatComponent as any).__reactFiber$?.child?.stateNode?.handleSendMessage("Generate the full murder mystery package.");
                                    } else {
                                        toast.error("Unable to trigger final generation.");
                                    }
                                }}
                                className="bg-[#F97316] hover:bg-[#FB923C] text-white font-semibold"
                            >
                                <Wand2 className="mr-2 h-5 w-5" /> Generate Mystery
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

export default MysteryChatCreator;
