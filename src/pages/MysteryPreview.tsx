
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { ArrowLeft, MessageCircle, Edit } from "lucide-react";
import ReactMarkdown from 'react-markdown';

const MysteryPreview = () => {
    const [mysteryData, setMysteryData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [lastMessage, setLastMessage] = useState<string>("");
    const navigate = useNavigate();
    const { id } = useParams();
    const { isAuthenticated } = useAuth();
    const isMobile = useIsMobile();

    useEffect(() => {
        if (id) {
            loadMysteryData();
        }
    }, [id]);

    const loadMysteryData = async () => {
        try {
            setLoading(true);
            
            const { data, error } = await supabase
                .from("conversations")
                .select(`
                    *,
                    messages (
                        id,
                        content,
                        role,
                        created_at
                    )
                `)
                .eq("id", id)
                .single();

            if (error) {
                console.error("Error loading mystery data:", error);
                toast.error("Failed to load mystery");
                return;
            }

            if (data) {
                setMysteryData(data);
                
                // Get the last AI message to display as preview
                const aiMessages = data.messages
                    ?.filter((msg: any) => msg.role === "assistant")
                    ?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                
                if (aiMessages && aiMessages.length > 0) {
                    setLastMessage(aiMessages[0].content);
                }
            }
        } catch (error) {
            console.error("Error:", error);
            toast.error("Failed to load mystery");
        } finally {
            setLoading(false);
        }
    };

    const handleContinueChat = () => {
        navigate(`/mystery/chat/${id}`);
    };

    const handleEdit = () => {
        navigate(`/mystery/chat/${id}`);
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading mystery preview...</p>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    if (!mysteryData) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">Mystery Not Found</h2>
                        <p className="text-muted-foreground mb-4">The mystery you're looking for doesn't exist.</p>
                        <Button onClick={() => navigate("/dashboard")}>
                            Back to Dashboard
                        </Button>
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
                        <div className="flex items-center gap-4 mb-4">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => navigate("/dashboard")}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Dashboard
                            </Button>
                        </div>
                        
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className={cn("text-3xl font-bold mb-2", isMobile && "text-2xl mb-1")}>
                                    {mysteryData.title}
                                </h1>
                                <div className="flex items-center gap-2 mb-2">
                                    <Badge variant="outline">
                                        {mysteryData.display_status || "Draft"}
                                    </Badge>
                                    {mysteryData.mystery_data?.playerCount && (
                                        <Badge variant="secondary">
                                            {mysteryData.mystery_data.playerCount} Players
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            
                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleEdit}
                                >
                                    <Edit className="h-4 w-4 mr-2" />
                                    Edit
                                </Button>
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-6">
                        {/* Mystery Settings */}
                        {mysteryData.mystery_data && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Mystery Settings</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {mysteryData.mystery_data.theme && (
                                        <div>
                                            <h4 className="font-medium mb-1">Theme</h4>
                                            <p className="text-muted-foreground">{mysteryData.mystery_data.theme}</p>
                                        </div>
                                    )}
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <h4 className="font-medium mb-1">Players</h4>
                                            <p className="text-muted-foreground">{mysteryData.mystery_data.playerCount}</p>
                                        </div>
                                        <div>
                                            <h4 className="font-medium mb-1">Script Type</h4>
                                            <p className="text-muted-foreground">
                                                {mysteryData.mystery_data.scriptType === 'full' ? 'Full Scripts' : 'Point Form'}
                                            </p>
                                        </div>
                                    </div>
                                    
                                    {mysteryData.mystery_data.additionalDetails && (
                                        <div>
                                            <h4 className="font-medium mb-1">Additional Details</h4>
                                            <p className="text-muted-foreground">{mysteryData.mystery_data.additionalDetails}</p>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        {/* Latest AI Response */}
                        {lastMessage && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Latest Mystery Concept</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>
                                            {lastMessage}
                                        </ReactMarkdown>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Button
                                onClick={handleContinueChat}
                                size="lg"
                                className="flex-1 sm:flex-none"
                            >
                                <MessageCircle className="h-4 w-4 mr-2" />
                                Continue Chat
                            </Button>
                        </div>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default MysteryPreview;
