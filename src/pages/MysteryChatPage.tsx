
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import MysteryChat from "@/components/MysteryChat";
import { ArrowRight } from "lucide-react";

const MysteryChatPage = () => {
  const [conversation, setConversation] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      navigate("/sign-in");
      return;
    }

    if (id) {
      loadConversation(id);
    }
  }, [id, isAuthenticated, user]);

  const loadConversation = async (conversationId: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .eq("user_id", user?.id)
        .single();

      if (error) {
        console.error("Error loading conversation:", error);
        toast.error("Failed to load conversation");
        navigate("/");
        return;
      }

      setConversation(data);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load conversation");
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handleGoToPreview = () => {
    navigate(`/mystery/preview/${id}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-2">Conversation not found</h1>
            <p className="text-muted-foreground mb-4">The conversation you're looking for doesn't exist.</p>
            <Button onClick={() => navigate("/")}>Go Home</Button>
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
        <div className={cn("container mx-auto", isMobile ? "max-w-full" : "max-w-6xl")}>
          <div className={cn("mb-8", isMobile && "mb-4")}>
            <h1 className={cn("text-3xl font-bold mb-2", isMobile && "text-2xl mb-1")}>
              Creating Your Mystery
            </h1>
            <p className="text-muted-foreground">
              Chat with our AI to refine and perfect your murder mystery
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-0">
                  <MysteryChat conversationId={id!} />
                </CardContent>
              </Card>
            </div>
            
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6">
                  <h3 className="font-semibold mb-4">Next Steps</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you're happy with your mystery concept, you can preview the full package and make your purchase.
                  </p>
                  <Button 
                    onClick={handleGoToPreview}
                    className="w-full"
                    variant="outline"
                  >
                    Go to Preview
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className={cn("mt-8 flex justify-center gap-4", isMobile && "mt-4")}>
            <Button
              variant="outline"
              onClick={() => navigate("/")}
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

export default MysteryChatPage;
