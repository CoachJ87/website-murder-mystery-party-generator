
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
import { ArrowLeft, Check, Users, Tag, CreditCard, ArrowRight } from "lucide-react";
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
            <Button onClick={handleBackToDashboard}>
              Back to Dashboard
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Get player count from mystery data
  const playerCount = mysteryData.mystery_data?.playerCount || 3;

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
            <div className="bg-[#F6E8C6] border border-[#C5B88A] rounded-lg p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    {mysteryData.title || "Murder At The Blind Tiger"}
                  </h2>
                  <p className="text-gray-600">
                    Custom murder mystery for {playerCount} players
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">Details</h3>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Players:</span>
                    <span className="text-gray-800 font-medium">{playerCount} players</span>
                  </div>
                  
                  {/* Empty spacing lines as shown in screenshot */}
                  <div className="border-b border-gray-400 mt-6 mb-4"></div>
                  <div className="border-b border-gray-400 mb-4"></div>
                </div>
              </div>
            </div>

            {/* Purchase Card */}
            <div className="bg-[#F6E8C6] border border-[#C5B88A] rounded-lg p-6">
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-2">
                    Murder Mystery Package
                  </h2>
                  <p className="text-gray-600">
                    One-time purchase, instant access
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <CreditCard className="h-8 w-8 text-orange-500" />
                  <div>
                    <div className="text-3xl font-bold text-gray-800">$4.99</div>
                    <p className="text-sm text-gray-600 mt-1">
                      Complete murder mystery package with all character materials, clues, and hosting instructions.
                    </p>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">What's included:</h3>
                  <div className="space-y-3">
                    {[
                      "Full character profiles for all suspects",
                      "Host guide with step-by-step instructions", 
                      "Printable character sheets",
                      "Evidence and clue cards",
                      "Timeline of events",
                      "Solution reveal script",
                      "PDF downloads of all materials"
                    ].map((item, index) => (
                      <div key={index} className="flex items-center gap-3">
                        <div className="flex-shrink-0 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <span className="text-sm text-gray-700">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Button 
                  onClick={handleCompletePurchase} 
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  Complete Purchase
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MysteryPreview;
