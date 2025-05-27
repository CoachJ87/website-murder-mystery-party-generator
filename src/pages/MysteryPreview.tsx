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
import { ArrowLeft, Check, Users, Tag } from "lucide-react";
import ReactMarkdown from 'react-markdown';
const MysteryPreview = () => {
  const [mysteryData, setMysteryData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastMessage, setLastMessage] = useState<string>("");
  const navigate = useNavigate();
  const {
    id
  } = useParams();
  const {
    isAuthenticated
  } = useAuth();
  const isMobile = useIsMobile();
  useEffect(() => {
    if (id) {
      loadMysteryData();
    }
  }, [id]);
  const loadMysteryData = async () => {
    try {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from("conversations").select(`
                    *,
                    messages (
                        id,
                        content,
                        role,
                        created_at
                    )
                `).eq("id", id).single();
      if (error) {
        console.error("Error loading mystery data:", error);
        toast.error("Failed to load mystery");
        return;
      }
      if (data) {
        setMysteryData(data);

        // Get the last AI message to display as preview
        const aiMessages = data.messages?.filter((msg: any) => msg.role === "assistant")?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
  const handleCompletePurchase = () => {
    navigate(`/mystery/purchase/${id}`);
  };
  const handleBackToDashboard = () => {
    navigate("/dashboard");
  };
  if (loading) {
    return <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-muted-foreground">Loading mystery preview...</p>
                    </div>
                </main>
                <Footer />
            </div>;
  }
  if (!mysteryData) {
    return <div className="min-h-screen flex flex-col">
                <Header />
                <main className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold mb-2">Mystery Not Found</h2>
                        <p className="text-muted-foreground mb-4">The mystery you're looking for doesn't exist.</p>
                        <Button onClick={handleBackToDashboard}>
                            Back to Dashboard
                        </Button>
                    </div>
                </main>
                <Footer />
            </div>;
  }

  // Extract brief teaser from the last AI message
  const briefTeaser = lastMessage.split('\n\n')[0] || lastMessage.substring(0, 200) + "...";
  return <div className="min-h-screen flex flex-col">
            <Header />
            <main className={cn("flex-1", isMobile ? "py-4 px-4" : "py-12 px-4")}>
                <div className={cn("container mx-auto", isMobile ? "max-w-full" : "max-w-6xl")}>
                    {/* Back Button */}
                    <div className="mb-6">
                        <Button variant="outline" size="sm" onClick={handleBackToDashboard}>
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Back to Dashboard
                        </Button>
                    </div>

                    {/* Page Header */}
                    <div className="text-center mb-8">
                        <h1 className={cn("text-4xl font-bold mb-2", isMobile && "text-3xl")}>
                            Complete Your Purchase
                        </h1>
                        <p className="text-lg text-muted-foreground">
                            Get full access to your murder mystery package
                        </p>
                    </div>

                    {/* Responsive Grid Layout */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
                        {/* Mystery Preview Card */}
                        <Card className="h-fit">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between">
                                    {mysteryData.title}
                                </CardTitle>
                                <div className="flex items-center gap-2">
                                    
                                    
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Brief Teaser */}
                                <div>
                                    <h4 className="font-medium mb-2">Story Preview</h4>
                                    <p className="text-sm text-muted-foreground leading-relaxed">
                                        {briefTeaser}
                                    </p>
                                </div>
                                
                                {/* Purchase Note */}
                                <div className="p-3 bg-muted rounded-lg">
                                    <p className="text-sm font-medium text-center">
                                        Purchase to unlock complete mystery package
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Purchase Card */}
                        <Card className="h-fit">
                            <CardHeader className="text-center">
                                <div className="text-5xl font-bold text-primary mb-2">$4.99</div>
                                <p className="text-muted-foreground">One-time purchase, instant access</p>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <Separator />
                                
                                {/* What's Included */}
                                <div>
                                    <h4 className="font-semibold mb-4">What's included:</h4>
                                    <div className="space-y-3">
                                        {["Character profiles", "Host guide", "Printable sheets", "Evidence cards", "Timeline", "Solution script", "PDF downloads"].map((item, index) => <div key={index} className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-5 h-5 bg-green-100 rounded-full flex items-center justify-center">
                                                    <Check className="h-3 w-3 text-green-600" />
                                                </div>
                                                <span className="text-sm">{item}</span>
                                            </div>)}
                                    </div>
                                </div>

                                <Separator />

                                {/* Purchase Button */}
                                <Button onClick={handleCompletePurchase} size="lg" className={cn("bg-primary hover:bg-primary/90", isMobile ? "w-full" : "w-full")}>
                                    Complete Purchase
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </main>
            <Footer />
        </div>;
};
export default MysteryPreview;