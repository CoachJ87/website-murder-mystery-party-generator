import { useState, useEffect } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import MysteryForm from "@/components/MysteryForm";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { getAIResponse } from "@/services/aiService";

const MysteryCreation = () => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState(null);
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();
    const isEditing = !!id;
    const { isAuthenticated, user } = useAuth();
    const isMobile = useIsMobile();

    // Load existing data if editing, or extract theme from URL if creating new
    useEffect(() => {
        console.log("=== MysteryCreation Debug ===");
        console.log("Current URL:", window.location.href);
        console.log("location.search:", location.search);
        console.log("isEditing:", isEditing);
        console.log("formData current state:", formData);
        
        if (isEditing && id) {
            console.log("Loading existing mystery");
            loadExistingMystery(id);
        } else {
            const urlParams = new URLSearchParams(location.search);
            const fullInput = urlParams.get('input');
            console.log("Full input from URL:", fullInput);
            
            if (fullInput) {
                console.log("Setting formData with full input:", fullInput);
                const newFormData = {
                    userRequest: fullInput,
                    theme: "",
                    playerCount: 6,
                    scriptType: "full",
                    additionalDetails: ""
                };
                console.log("New formData object:", newFormData);
                setFormData(newFormData);
            } else {
                console.log("No input found in URL");
            }
        }
    }, [id, location.search, isEditing]);
    
    const loadExistingMystery = async (mysteryId: string) => {
        try {
            const { data, error } = await supabase
                .from("conversations")
                .select("mystery_data, title")
                .eq("id", mysteryId)
                .single();

            if (error) {
                console.error("Error loading mystery:", error);
                toast.error("Failed to load mystery");
                return;
            }

            if (data?.mystery_data) {
                setFormData(data.mystery_data);
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Failed to load mystery");
        }
    };
        
    const getScriptTypeDisplayText = (scriptType: string) => {
          return scriptType === 'pointForm' ? 'Point Form' : 'Full Scripts';
        };
    
    const createFormattedInitialMessage = (data: any) => {
        let message = "";
        
        // Start with original request if available
        if (data.userRequest) {
            message = data.userRequest;
        } else {
            message = "I want to create a murder mystery";
        }
        
        // Add theme/setting if provided
        if (data.theme && data.theme.trim() !== "") {
            message += `. The theme/setting should be ${data.theme} for ${data.playerCount} players with ${data.scriptType} scripts`;
        } else {
            message += `. This is for ${data.playerCount} players with ${getScriptTypeDisplayText(data.scriptType)} scripts`;
        }
        
        // Add additional details if provided
        if (data.additionalDetails && data.additionalDetails.trim() !== "") {
            message += `. Additional details include: ${data.additionalDetails}`;
        }
        
        message += ".";
        return message;
    };

    const handleSave = async (data: any) => {
        console.log("handleSave called with data:", data);
        
        if (!isAuthenticated || !user) {
            toast.error("Please sign in to save your mystery");
            return;
        }
    
        setLoading(true);
        
        try {
            // Create system instruction for AI
            const systemInstruction = `You are creating a murder mystery with these details:
                - Theme: ${data.theme || 'General murder mystery'}
                - Players: ${data.playerCount}
                - Script Type: ${data.scriptType}
                ${data.userRequest ? `- Original Request: ${data.userRequest}` : ''}
                ${data.additionalDetails ? `- Additional Details: ${data.additionalDetails}` : ''}

You MUST follow this exact output format:

# "[CREATIVE TITLE]" - A MURDER MYSTERY

## PREMISE
[2-3 paragraphs setting the scene, describing the event where the murder takes place, and creating dramatic tension]

## VICTIM
**[Victim Name]** - [Vivid description of the victim, their role in the story, personality traits, and why they might have made enemies]

## CHARACTER LIST (${data.playerCount} PLAYERS)
1. **[Character 1 Name]** - [Engaging one-sentence description including profession and connection to victim]
2. **[Character 2 Name]** - [Engaging one-sentence description including profession and connection to victim]
[Continue for all ${data.playerCount} characters]

## MURDER METHOD
[Paragraph describing how the murder was committed, interesting details about the method, and what clues might be found]

After presenting the mystery concept, ask if the concept works for them and explain that they can continue to make edits and that once they are done they can go to the preview page to purchase the complete game package.`;

            // Create the formatted initial message
            const initialMessage = createFormattedInitialMessage(data);

            let conversationId = id;

            if (!isEditing) {
                // Create new conversation
                const { data: conversation, error: convError } = await supabase
                    .from("conversations")
                    .insert({
                        user_id: user.id,
                        title: `${data.theme || 'Mystery'} - ${data.playerCount} Players`,
                        mystery_data: data,
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
                // Update existing conversation
                await supabase
                    .from("conversations")
                    .update({
                        mystery_data: data,
                        system_instruction: systemInstruction,
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", conversationId);
            }

            toast.success("Mystery setup complete! Starting chat...");
            // Navigate immediately to chat with needsInitialAIResponse flag
            navigate(`/mystery/chat/${conversationId}?initial=true`);

        } catch (error) {
            console.error("Error saving mystery:", error);
            toast.error("Failed to save mystery");
        } finally {
            setLoading(false);
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
                            Fill out the form below to generate your custom murder mystery
                        </p>
                    </div>

                    <Card className={isMobile ? "border-0 shadow-none bg-transparent" : ""}>
                        <CardContent className={cn("p-6", isMobile && "p-0")}>
                            <MysteryForm
                                onSave={handleSave}
                                isSaving={loading}
                                initialData={formData}
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
