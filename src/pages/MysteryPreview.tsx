import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { Message } from "@/components/types";
import ReactMarkdown from 'react-markdown';
import { AlertTriangle, Loader2, RefreshCw } from "lucide-react";
import { generateCompletePackage, resumePackageGeneration, getPackageGenerationStatus, toggleTestMode, getTestModeEnabled } from "@/services/mysteryPackageService";
import MysteryPackageTabView from "@/components/MysteryPackageTabView";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const MysteryPreview = () => {
    const [mystery, setMystery] = useState<any | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [title, setTitle] = useState("");
    const [mysteryPreview, setMysteryPreview] = useState("");
    const [isPremiumUser, setIsPremiumUser] = useState(false);
    const [generating, setGenerating] = useState(false);
    const navigate = useNavigate();
    const { id } = useParams();
    const { user, isAuthenticated } = useAuth();
    const [testModeEnabled, setTestModeEnabled] = useState(false);
    const [resumable, setResumable] = useState(false);
    const [generationAbandoned, setGenerationAbandoned] = useState(false);
    const [generationStatus, setGenerationStatus] = useState<any | null>(null);
    const [currentContent, setCurrentContent] = useState("");
    const [activeTab, setActiveTab] = useState("host-guide");

    useEffect(() => {
        if (!id) return;
        
        setTestModeEnabled(getTestModeEnabled());
        
        const checkForAbandonedGeneration = async () => {
            try {
                const status = await getPackageGenerationStatus(id);
                if ((status.status === 'in_progress' || status.status === 'failed') && status.resumable) {
                    setResumable(true);
                    setGenerationAbandoned(true);
                    toast.info("We found an incomplete mystery generation that can be resumed");
                }
            } catch (error) {
                console.error("Error checking for abandoned generation:", error);
            }
        };

        const fetchMystery = async () => {
            try {
                setLoading(true);
                
                if (user) {
                    const { data: profile } = await supabase
                        .from("profiles")
                        .select("is_subscribed, subscription_tier")
                        .eq("id", user.id)
                        .single();
                        
                    if (profile) {
                        setIsPremiumUser(profile.is_subscribed || profile.subscription_tier === 'premium');
                    }
                }
                
                const { data: mystery, error: mysteryError } = await supabase
                    .from("conversations")
                    .select("*, messages(*)")
                    .eq("id", id)
                    .order("created_at", { ascending: true })
                    .single();
                    
                if (mysteryError) {
                    toast.error("Failed to load mystery preview");
                    console.error(mysteryError);
                    return;
                }

                if (!mystery) {
                    toast.error("Mystery not found");
                    navigate("/dashboard");
                    return;
                }
                
                setMystery(mystery);
                
                if (mystery.messages && mystery.messages.length > 0) {
                    const formattedMessages = mystery.messages.map((msg: any) => ({
                        content: msg.content,
                        is_ai: msg.role === "assistant",
                        timestamp: new Date(msg.created_at || Date.now())
                    }));
                    
                    formattedMessages.sort((a: any, b: any) => 
                        a.timestamp.getTime() - b.timestamp.getTime()
                    );
                    
                    setMessages(formattedMessages);
                    
                    const aiResponses = formattedMessages.filter((msg: Message) => msg.is_ai);
                    if (aiResponses.length > 0) {
                        const mysteryResponse = aiResponses.find(msg => 
                            msg.content.includes("PREMISE") && 
                            msg.content.includes("CHARACTER") && 
                            msg.content.includes("#")
                        ) || aiResponses[aiResponses.length - 1];
                        
                        if (mysteryResponse) {
                            setMysteryPreview(mysteryResponse.content);
                        }
                    }
                }
                
                let extractedTitle = "";
                
                if (mystery.title && mystery.title !== `${mystery.mystery_data?.theme} Mystery`) {
                    extractedTitle = mystery.title;
                } else {
                    const aiMessages = (mystery.messages || []).filter((msg: any) => msg.role === "assistant");
                    
                    if (aiMessages.length > 0) {
                        for (const msg of aiMessages) {
                            const titlePattern = /^#+\s*["']([^"']+)["']|^#+\s*([A-Z][A-Z\s]+)|^["']([^"']+)["']\s*-/m;
                            const match = msg.content.match(titlePattern);
                            
                            if (match) {
                                extractedTitle = match[1] || match[2] || match[3] || "";
                                break;
                            }
                        }
                    }
                    
                    if (!extractedTitle && mystery.mystery_data?.theme) {
                        extractedTitle = `${mystery.mystery_data.theme} Mystery`;
                    }
                }
                
                setTitle(extractedTitle || "Murder Mystery");
                
                await checkForAbandonedGeneration();
                
            } catch (error) {
                console.error("Error fetching mystery:", error);
                toast.error("Failed to load mystery data");
            } finally {
                setLoading(false);
            }
        };
        
        fetchMystery();
    }, [id, user, navigate]);

    const checkGenerationStatus = async () => {
        if (!id) return;
        try {
            const status = await getPackageGenerationStatus(id);
            setGenerationStatus(status);
            
            const { data: packageData } = await supabase
                .from("mystery_packages")
                .select("content")
                .eq("conversation_id", id)
                .single();
                
            if (packageData?.content) {
                setCurrentContent(packageData.content);
            }
            
            if (status.status === 'completed') {
                navigate(`/mystery/${id}`);
            }
        } catch (error) {
            console.error("Error checking generation status:", error);
        }
    };

    useEffect(() => {
        checkGenerationStatus();
        const interval = setInterval(checkGenerationStatus, 5000);
        return () => clearInterval(interval);
    }, [id, navigate]);

    const renderGenerationProgress = () => {
        if (!generationStatus) return null;

        return (
            <div className="space-y-4 mb-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                        <span>{generationStatus.currentStep}</span>
                        <span>{generationStatus.progress}%</span>
                    </div>
                    <Progress value={generationStatus.progress} className="h-2" />
                </div>
                <div className="flex gap-2 flex-wrap">
                    {Object.entries(generationStatus.sections || {}).map(([key, isComplete]) => (
                        <Badge 
                            key={key}
                            variant={isComplete ? "default" : "outline"}
                            className={isComplete ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" : ""}
                        >
                            {key.charAt(0).toUpperCase() + key.slice(1)} {isComplete ? "✓" : "..."}
                        </Badge>
                    ))}
                </div>
            </div>
        );
    };

    const handleGenerateClick = async () => {
        if (!isAuthenticated) {
            toast.error("Please sign in to generate a complete mystery package");
            navigate("/sign-in");
            return;
        }

        if (!id) {
            toast.error("Mystery ID is missing");
            return;
        }

        toast.info(
            <div className="space-y-2">
                <div className="font-semibold flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Please keep this tab open</span>
                </div>
                <p className="text-sm">Generation takes 5-10 minutes and requires this browser tab to remain open and active. Closing will interrupt the process.</p>
            </div>,
            { duration: 7000 }
        );

        try {
            setGenerating(true);
            
            const status = await getPackageGenerationStatus(id);
            const isResuming = status.status === 'in_progress' || status.status === 'failed';
            
            toast.info(
                <div className="space-y-2">
                    <div className="font-semibold">
                        {isResuming ? "Resuming generation..." : "Starting generation..."}
                    </div>
                    <p className="text-sm">This will take about 5-10 minutes. Please keep this browser tab open.</p>
                </div>
            );
            
            if (isResuming) {
                await resumePackageGeneration(id);
            } else {
                await generateCompletePackage(id);
            }
            
        } catch (error) {
            console.error("Error generating package:", error);
            setGenerating(false);
            toast.error("Failed to generate package. Please try again.");
        }
    };

    const handleTestModeChange = (enabled: boolean) => {
        setTestModeEnabled(enabled);
        toggleTestMode(enabled);
        
        if (enabled) {
            toast.info("Test mode enabled. This will generate shorter content for testing purposes.");
        } else {
            toast.info("Test mode disabled. Will generate full-length content.");
        }
    };

    const extractPremise = (content: string): string => {
        if (!content) return "";
        
        const premisePattern = /##\s*PREMISE\s*\n([\s\S]*?)(?=##|$)/i;
        const match = content.match(premisePattern);
        
        if (match && match[1]) {
            const paragraphs = match[1].split('\n\n');
            return paragraphs[0].trim();
        }
        
        return "";
    };

    const formatTitle = (title: string): string => {
        return title.replace(/["']/g, '').trim();
    };

    const premise = extractPremise(mysteryPreview);

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 py-12 px-4">
                    <div className="container mx-auto max-w-4xl">
                        <div className="flex justify-center">
                            <Loader2 className="h-12 w-12 animate-spin text-primary" />
                        </div>
                    </div>
                </main>
                <Footer />
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col">
            <Header />
            <main className="flex-1 py-12 px-4">
                <div className="container mx-auto max-w-4xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-bold mb-2">{formatTitle(title)}</h1>
                        <p className="text-muted-foreground">
                            Preview your murder mystery and generate the complete package.
                        </p>
                    </div>
                    
                    {generationAbandoned && (
                        <Alert variant="warning" className="mb-6">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertTitle>Incomplete Generation Found</AlertTitle>
                            <AlertDescription>
                                We found an incomplete mystery generation that was interrupted. You can resume it from where it left off.
                            </AlertDescription>
                        </Alert>
                    )}

                    {generating ? (
                        <>
                            {renderGenerationProgress()}
                            <Card>
                                <CardContent className="pt-6">
                                    <MysteryPackageTabView 
                                        packageContent={currentContent || "Generation in progress..."}
                                        mysteryTitle={title}
                                        generationStatus={generationStatus}
                                        isGenerating={true}
                                    />
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Mystery Preview</CardTitle>
                                <CardDescription>
                                    A preview of your murder mystery package
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="max-h-96 overflow-y-auto">
                                {premise ? (
                                    <div className="space-y-4">
                                        <div className="prose prose-stone dark:prose-invert">
                                            <ReactMarkdown>
                                                {premise}
                                            </ReactMarkdown>
                                            <div className="mt-2 italic text-muted-foreground">
                                                [Preview only shows the introduction. The complete mystery includes character details, clues, host instructions, and all materials needed to run your event.]
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="text-center py-12">
                                        <p className="text-muted-foreground">No preview available</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}
                    
                    <Card>
                        <CardHeader>
                            <CardTitle>
                                {generationStatus?.status === 'in_progress' ? 'Generating Your Mystery Package' : 'Generate Your Mystery Package'}
                            </CardTitle>
                            <CardDescription>
                                {generationStatus?.status === 'in_progress' 
                                    ? 'Your mystery package is being generated. Please keep this browser tab open.'
                                    : 'Start generating your custom murder mystery package with all materials included.'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-col sm:flex-row items-center gap-4">
                            <div className="flex items-center space-x-2 mb-4 sm:mb-0">
                                <Switch 
                                    id="test-mode" 
                                    checked={testModeEnabled} 
                                    onCheckedChange={setTestModeEnabled}
                                />
                                <Label htmlFor="test-mode">Test Mode (Faster, Less Content)</Label>
                            </div>
                            <Button
                                onClick={handleGenerateClick}
                                disabled={generating}
                                className="w-full sm:w-auto ml-auto"
                            >
                                {generating ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {generationStatus?.status === 'in_progress' ? "Generating..." : "Starting..."}
                                    </>
                                ) : generationAbandoned ? (
                                    <>
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Resume Generation
                                    </>
                                ) : (
                                    "Generate Package"
                                )}
                            </Button>
                        </CardContent>
                    </Card>

                    <div className="flex justify-center mt-8">
                        <Button variant="outline" onClick={() => navigate("/dashboard")}>
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default MysteryPreview;
