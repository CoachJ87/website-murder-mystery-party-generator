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
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const MysteryChatCreator = () => {
    const [saving, setSaving] = useState(false);
    const [showChatUI, setShowChatUI] = useState(false);
    const [formData, setFormData] = useState<FormValues | null>(null);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const navigate = useNavigate();
    const { id } = useParams();
    const isEditing = !!id;
    const { isAuthenticated, user } = useAuth();
    const isMobile = useIsMobile();
    const [chatMessages, setChatMessages] = useState<Message[]>([]); // To hold chat messages
    const [generating, setGenerating] = useState(false);

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
                // Ensure we're creating proper Message objects with all required properties
                setChatMessages(data.map(msg => ({
                    id: msg.id || `msg-${Date.now()}-${Math.random()}`,
                    content: msg.content,
                    is_ai: msg.is_ai,
                    role: msg.role,
                    timestamp: new Date(msg.created_at || Date.now())
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
                            status: "draft",
                            // Initialize these fields to avoid update errors later
                            has_complete_package: false,
                            needs_package_generation: false,
                            is_paid: false,
                            is_completed: false
                        })
                        .select()
                        .single();

                    if (error) {
                        console.error("Error saving mystery:", error);
                        toast.error("Failed to save mystery data");
                        return;
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
                        return;
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
            return Promise.resolve();
        }

        try {
            console.log("Saving message to database:", message);
            const { error } = await supabase
                .from("messages")
                .insert({
                    conversation_id: conversationId,
                    content: message.content,
                    is_ai: message.is_ai, // Ensure this value is correctly passed from the Message object
                    role: message.is_ai ? "assistant" : "user", // Set role based on is_ai
                });

            if (error) {
                console.error("Error saving message:", error);
                toast.error("Failed to save message");
            } else {
                console.log("Message saved successfully");
                setChatMessages(prev => [...prev, message]); // Update local chat messages
            }
            
            return Promise.resolve();
        } catch (error) {
            console.error("Error saving message:", error);
            return Promise.reject(error);
        }
    };

    const handleGenerateMystery = async (messages: Message[]) => {
        if (!conversationId) {
            toast.error("Conversation ID is missing.");
            return;
        }

        setGenerating(true);
        try {
            console.log("DEBUG (MysteryChatCreator): Generating final mystery with messages:", messages);
            
            toast.info("Preparing your mystery preview...");

            // Save a flag that the user requested the final generation
            const { error: updateError } = await supabase
                .from("conversations")
                .update({
                    generation_requested: true,
                    needs_package_generation: true, // Flag to indicate generation is needed
                    updated_at: new Date().toISOString(),
                })
                .eq("id", conversationId);
                
            if (updateError) {
                console.error("Error updating conversation record:", updateError);
                toast.error("Failed to prepare mystery preview");
                return;
            }

            // Navigate to purchase page instead of preview
            navigate(`/mystery/purchase/${conversationId}`);
        } catch (error: any) {
            console.error("Error preparing mystery generation:", error);
            toast.error("Failed to prepare mystery preview. Please try again.");
        } finally {
            setGenerating(false);
        }
    };

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
                            {showChatUI
                                ? "Chat with our AI to refine your murder mystery"
                                : "Start your new mystery by selecting from the options below."}
                        </p>
                    </div>

                    <Card className={isMobile ? "border-0 shadow-none bg-transparent" : ""}>
                        <CardContent className={cn("p-6", isMobile && "p-0")}>
                            {showChatUI ? (
                                <div className="w-full h-full">
                                    <MysteryChat
                                        initialTheme={formData?.theme || ""}
                                        initialPlayerCount={formData?.playerCount}
                                        initialHasAccomplice={formData?.hasAccomplice}
                                        initialScriptType={formData?.scriptType as 'full' | 'pointForm'}
                                        initialAdditionalDetails={formData?.additionalDetails}
                                        savedMysteryId={id}
                                        onSave={handleSaveChatMessage}
                                        onGenerateFinal={handleGenerateMystery}
                                        initialMessages={chatMessages}
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

                    <div className={cn("mt-8 flex justify-center gap-4", isMobile && "mt-4")}>
                      {showChatUI ? (
                        <Button
                          variant="outline"
                          onClick={() => navigate("/dashboard")}
                          size={isMobile ? "sm" : "default"}
                        >
                          Back to Dashboard
                        </Button>
                      ) : (
                        <Button 
                            variant="outline" 
                            onClick={() => navigate("/dashboard")}
                            size={isMobile ? "sm" : "default"}
                        >
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
