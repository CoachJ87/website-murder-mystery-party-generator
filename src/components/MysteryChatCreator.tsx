import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Header from "@/components/Header";
import { supabase } from "@/lib/supabase";
import MysteryForm from "@/components/MysteryForm";
import MysteryChat from "@/components/MysteryChat";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Message, FormValues } from "@/components/types";

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
                    // Create new conversation with individual columns
                    const { data: conversation, error: convError } = await supabase
                        .from("conversations")
                        .insert({
                            user_id: user.id,
                            title: `${data.theme || 'Mystery'} - ${data.playerCount} Players`,
                            theme: data.theme || null,
                            player_count: data.playerCount || 6,
                            script_type: data.scriptType || 'full',
                            has_accomplice: data.hasAccomplice || false,
                            additional_details: data.additionalDetails || null,
                            system_instruction: systemInstruction,
                            display_status: "draft",
                            is_completed: false
                        })
                        .select()
                        .single();

                    if (convError) {
                        console.error("Error creating conversation:", convError);
                        throw convError;
                    }
                    conversationId = conversation.id;

                    // Save initial user message
                    await supabase.from("messages").insert({
                        conversation_id: conversationId,
                        content: initialMessage,
                        role: "user",
                        is_ai: false
                    });
                } else {
                    // Update existing conversation with individual columns
                    await supabase
                        .from("conversations")
                        .update({
                            theme: data.theme || null,
                            player_count: data.playerCount || 6,
                            script_type: data.scriptType || 'full',
                            has_accomplice: data.hasAccomplice || false,
                            additional_details: data.additionalDetails || null,
                            system_instruction: systemInstruction,
                            updated_at: new Date().toISOString()
                        })
                        .eq("id", conversationId);
                }

                toast.success("Mystery setup complete! Starting chat...");
                // Navigate immediately to chat with needsInitialAIResponse flag
                navigate(`/mystery/chat/${conversationId}?initial=true`);

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

    // Create system instruction for AI
    const systemInstruction = `You are a murder mystery creator. The user has provided the necessary information. Create a complete mystery with this format:

# "[CREATIVE TITLE]" - A MURDER MYSTERY

## PREMISE
[2-3 paragraphs setting the scene, describing the event where the murder takes place, and creating dramatic tension]

## VICTIM
**[Victim Name]** - [Vivid description of the victim, their role in the story, personality traits, and why they might have made enemies]

## CHARACTER LIST (${formData?.playerCount || 6} PLAYERS)
1. **[Character 1 Name]** - [Engaging one-sentence description including profession and connection to victim]
2. **[Character 2 Name]** - [Engaging one-sentence description including profession and connection to victim]
[Continue for all ${formData?.playerCount || 6} characters]

## MURDER METHOD
[Paragraph describing how the murder was committed, interesting details about the method, and what clues might be found]

IMPORTANT: Always end your response with: "Does this ${formData?.theme || 'murder mystery'} concept work for you? We can adjust any elements you'd like to change. Once you're satisfied with the concept, you can generate the complete mystery package with detailed character guides, host instructions, and game materials."`;

    // Create formatted initial message
    const initialMessage = `Let's create a murder mystery${formData?.theme ? ` with a ${formData.theme} theme` : ''} for ${formData?.playerCount || 6} players with ${formData?.scriptType === 'pointForm' ? 'point form' : formData?.scriptType === 'both' ? 'both full and point form' : 'full'} scripts${formData?.additionalDetails ? `. Additional details: ${formData.additionalDetails}` : ''}.`;

    return (
        <div className="min-h-screen flex flex-col bg-[#F7F3E9]">
            <Header />
            <main className="flex-1">
                <div className="container mx-auto max-w-4xl px-3 sm:px-4 py-4 sm:py-8">
                    {!showChatUI && (
                        <div className={cn("mb-8", isMobile && "mb-4")}>
                            <h1 className={cn("text-3xl font-bold mb-2", isMobile && "text-2xl mb-1")}>
                                {isEditing ? "Edit Mystery" : "Create New Mystery"}
                            </h1>
                            <p className="text-muted-foreground">
                                Start your new mystery by selecting from the options below.
                            </p>
                        </div>
                    )}

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
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 p-6">
                            <MysteryForm
                                onSave={handleSave}
                                isSaving={saving}
                            />
                        </div>
                    )}

                    {!showChatUI && (
                        <div className={cn("mt-8 flex justify-center gap-4", isMobile && "mt-4")}>
                            <Button 
                                variant="outline" 
                                onClick={() => navigate("/dashboard")}
                                size={isMobile ? "sm" : "default"}
                                className="bg-white/80 hover:bg-white shadow-sm"
                            >
                                Back to Dashboard
                            </Button>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default MysteryChatCreator;