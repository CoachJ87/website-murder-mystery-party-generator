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
import { useTranslation } from "react-i18next";

const MysteryCreation = () => {
    const { t } = useTranslation();
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
                .select("theme, player_count, script_type, has_accomplice, additional_details, title")
                .eq("id", mysteryId)
                .single();

            if (error) {
                console.error("Error loading mystery:", error);
                toast.error(t("mysteryCreation.errors.loadFailed"));
                return;
            }

            if (data) {
                const formData = {
                    theme: data.theme || "",
                    playerCount: data.player_count || 6,
                    scriptType: data.script_type || "full",
                    hasAccomplice: data.has_accomplice || false,
                    additionalDetails: data.additional_details || ""
                };
                setFormData(formData);
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error(t("mysteryCreation.errors.loadFailed"));
        }
    };
        
    const getScriptTypeDisplayText = (scriptType: string) => {
        if (scriptType === 'pointForm') return 'point form';
        if (scriptType === 'both') return 'both full and point form';
        return 'full';
    };
    
        const createFormattedInitialMessage = (data: any) => {
            let message = "";
            
            // Start with original request if available
            if (data.userRequest) {
                message = data.userRequest.trim();
            } else {
                message = t("mysteryCreation.wizard.prompt.defaultStart");
            }
            
            // Add theme/setting if provided
            if (data.theme && data.theme.trim() !== "") {
                message += " " + t("mysteryCreation.wizard.prompt.withTheme", { 
                    theme: data.theme, 
                    playerCount: data.playerCount, 
                    scriptType: getScriptTypeDisplayText(data.scriptType) 
                });
            } else {
                message += " " + t("mysteryCreation.wizard.prompt.withoutTheme", { 
                    playerCount: data.playerCount, 
                    scriptType: getScriptTypeDisplayText(data.scriptType || 'full')
                });
            }
            
            // Add accomplice mechanism specification
            if (data.hasAccomplice) {
                message += ". " + t("mysteryCreation.wizard.prompt.withAccomplice");
            } else {
                message += ". " + t("mysteryCreation.wizard.prompt.withoutAccomplice");
            }
            
            // Add additional details if provided
            if (data.additionalDetails && data.additionalDetails.trim() !== "") {
                message += " " + t("mysteryCreation.wizard.prompt.additionalDetails", { 
                    details: data.additionalDetails 
                });
            }
            
            // Clean up: remove any trailing punctuation, then add exactly one period
            message = message.replace(/[.!?]+$/, '') + '.';
            
            return message;
        };

    const handleSave = async (data: any) => {
        console.log("handleSave called with data:", data);
        
        if (!isAuthenticated || !user) {
            toast.error(t("mysteryCreation.errors.signInToSave"));
            return;
        }
    
        setLoading(true);
        
        try {
            // Create the formatted initial message
            const initialMessage = createFormattedInitialMessage(data);

            let conversationId = id;

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
                        updated_at: new Date().toISOString()
                    })
                    .eq("id", conversationId);
            }

            toast.success(t("mysteryCreation.success.setupComplete"));
            // Navigate immediately to chat with needsInitialAIResponse flag
            navigate(`/mystery/chat/${conversationId}?initial=true`);

        } catch (error) {
            console.error("Error saving mystery:", error);
            toast.error(t("mysteryCreation.errors.saveFailed"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 py-4 sm:py-8 md:py-12 px-2 sm:px-4 md:px-6 lg:px-8">
                <div className="container mx-auto max-w-full sm:max-w-4xl">
                    <div className="mb-4 sm:mb-6 md:mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2">
                            {isEditing ? t("mysteryCreation.editTitle") : t("mysteryCreation.createTitle")}
                        </h1>
                        <p className="text-sm sm:text-base text-muted-foreground">
                            {t("mysteryCreation.form.description")}
                        </p>
                    </div>

                    <Card className="border-0 sm:border shadow-none sm:shadow-sm bg-transparent sm:bg-card">
                        <CardContent className="p-0 sm:p-4 md:p-6">
                            <MysteryForm
                                onSave={handleSave}
                                isSaving={loading}
                                initialData={formData}
                            />
                        </CardContent>
                    </Card>

                    <div className="mt-4 sm:mt-6 md:mt-8 flex justify-center gap-2 sm:gap-4">
                        <Button
                            variant="outline"
                            onClick={() => navigate("/dashboard")}
                            size="sm"
                            className="h-10 sm:h-auto text-sm sm:text-base px-4 sm:px-6"
                        >
                            {t("dashboard.backToDashboard")}
                        </Button>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default MysteryCreation;
