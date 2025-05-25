import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
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
    const { id } = useParams();
    const isEditing = !!id;
    const { isAuthenticated, user } = useAuth();
    const isMobile = useIsMobile();

    // Load existing data if editing
    useEffect(() => {
        if (isEditing && id) {
            loadExistingMystery(id);
        }
    }, [id]);

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

    const handleSave = async (data: any) => {
        if (!isAuthenticated || !user) {
            toast.error("Please sign in to save your mystery");
            return;
        }

        setLoading(true);
        try {
            // Create system instruction for AI
            const systemInstruction = `You are creating a murder mystery with these details:
- Theme: ${data.theme}
- Players: ${data.playerCount}
- Script Type: ${data.scriptType}
- Has Accomplice: ${data.hasAccomplice}
${data.additionalDetails ? `- Additional Details: ${data.additionalDetails}` : ''}

Create a complete mystery following the exact format from your training.`;

            // Create the initial user message
            const initialMessage = `Create a ${data.theme} murder mystery for ${data.playerCount} players with ${data.scriptType} scripts${data.hasAccomplice ? ' including an accomplice mechanism' : ''}.${data.additionalDetails ? ` Additional requirements: ${data.additionalDetails}` : ''}`;

            let conversationId = id;

            if (!isEditing) {
                // Create new conversation
                const { data: conversation, error: convError } = await supabase
                    .from("conversations")
                    .insert({
                        user_id: user.id,
                        title: `${data.theme} Mystery`,
                        mystery_data: data,
                        system_instruction: systemInstruction,
                        is_completed: false,
                        is_paid: false
                    })
                    .select()
                    .single();

                if (convError) {
                    throw convError;
                }
                conversationId = conversation.id;

                // Save initial user message
                await supabase.from("messages").insert({
                    conversation_id: conversationId,
                    content: initialMessage,
                    role: "user"
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

            // Generate AI response
            try {
                const aiResponse = await getAIResponse(
                    [{ role: "user", content: initialMessage }],
                    'free',
                    systemInstruction
                );

                // Save AI response
                await supabase.from("messages").insert({
                    conversation_id: conversationId,
                    content: aiResponse,
                    role: "assistant"
                });

                toast.success("Mystery generated successfully!");
                navigate(`/mystery/preview/${conversationId}`);
            } catch (aiError) {
                console.error("AI generation error:", aiError);
                toast.success("Mystery saved! Generating preview...");
                navigate(`/mystery/preview/${conversationId}`);
            }

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
