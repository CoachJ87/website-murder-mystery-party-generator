
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Eye, Edit } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Mystery } from "@/interfaces/mystery";

export const HomeDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recentMysteries, setRecentMysteries] = useState<Mystery[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchRecentMysteries();
    }
  }, [user?.id]);

  const extractTitleFromMessages = (messages: any[]) => {
    if (!messages || messages.length === 0) return null;
    
    const filteredMessages = messages.filter(message => {
      const content = (message.content || "").toLowerCase();
      return !(
        content.includes("initial questions") || 
        content.includes("clarification") || 
        content.includes("# questions") || 
        content.includes("## questions")
      );
    });
    
    const titlePattern = /#\s*["']?([^"'\n#]+)["']?(?:\s*-\s*A MURDER MYSTERY)?/i;
    const alternativeTitlePattern = /title:\s*["']?([^"'\n]+)["']?/i;
    const quotedTitlePattern = /"([^"]+)"\s*(?:-\s*A\s+MURDER\s+MYSTERY)?/i;
    
    for (const message of filteredMessages) {
      if (message.role === 'assistant' || message.is_ai) {
        const content = message.content || '';
        
        const titleMatch = content.match(titlePattern);
        if (titleMatch && titleMatch[1]) {
          return formatTitle(titleMatch[1]);
        }
        
        const quotedMatch = content.match(quotedTitlePattern);
        if (quotedMatch && quotedMatch[1]) {
          return formatTitle(quotedMatch[1]);
        }
        
        const altMatch = content.match(alternativeTitlePattern);
        if (altMatch && altMatch[1]) {
          return formatTitle(altMatch[1]);
        }
      }
    }
    
    return null;
  };
  
  const formatTitle = (title: string) => {
    return title
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const fetchRecentMysteries = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at, mystery_data, display_status, is_paid, purchase_date")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(6);

      if (conversationsError) throw conversationsError;

      if (!conversationsData) {
        setRecentMysteries([]);
        return;
      }

      const mysteriesWithMessages = await Promise.all(
        conversationsData.map(async (conversation: any) => {
          const { data: messagesData } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", conversation.id)
            .order("created_at", { ascending: true });
          
          const aiTitle = extractTitleFromMessages(messagesData || []);
          const mysteryData = conversation.mystery_data || {};
          const theme = mysteryData.theme || 'Unknown';
          
          const title = aiTitle || conversation.title || `${theme} Mystery`;
          
          // Determine the true status
          let status: "draft" | "purchased" | "archived";
          
          if (conversation.is_paid === true || conversation.display_status === "purchased") {
            status = "purchased";
          } else if (conversation.display_status === "archived") {
            status = "archived";
          } else {
            status = mysteryData.status || "draft";
          }
          
          return {
            id: conversation.id,
            title: title,
            created_at: conversation.created_at,
            updated_at: conversation.updated_at || conversation.created_at,
            status: status,
            theme: theme,
            guests: mysteryData.playerCount || mysteryData.numberOfGuests,
            is_purchased: conversation.is_paid === true || conversation.display_status === "purchased",
            ai_title: aiTitle,
            purchase_date: conversation.purchase_date
          };
        })
      );

      setRecentMysteries(mysteriesWithMessages);
    } catch (error) {
      console.error("Error fetching mysteries:", error);
      toast.error("Failed to load your mysteries");
    } finally {
      setLoading(false);
    }
  };

  const handleViewAll = () => {
    navigate("/dashboard");
  };

  const handleViewMystery = (mystery: Mystery) => {
    if (mystery.is_purchased || mystery.status === "purchased") {
      navigate(`/mystery/${mystery.id}`);
    } else {
      navigate(`/mystery/edit/${mystery.id}`);
    }
  };

  return (
    <div className="py-12 px-4 bg-card/30">
      <div className="container mx-auto max-w-5xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">Your Recent Mysteries</h2>
          <Button variant="outline" onClick={handleViewAll}>
            View All
          </Button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="opacity-70 animate-pulse">
                <CardHeader>
                  <CardTitle className="h-6 bg-muted rounded"></CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-4 bg-muted rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : recentMysteries.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <p className="text-xl font-medium mb-2">You haven't created any mysteries yet</p>
            <p className="text-muted-foreground mb-4">
              Use the input box above to start creating your first murder mystery!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {recentMysteries.map((mystery) => (
              <Card 
                key={mystery.id}
                className={`${mystery.is_purchased ? "border-primary border-2" : ""} cursor-pointer hover:shadow-md transition-shadow`}
                onClick={() => handleViewMystery(mystery)}
              >
                <CardHeader>
                  <CardTitle className="flex justify-between items-start gap-2">
                    <span className="truncate">{mystery.title}</span>
                    {mystery.is_purchased ? (
                      <span className="text-xs px-2 py-1 bg-primary text-white rounded-full">Purchased</span>
                    ) : (
                      <span className="text-xs px-2 py-1 bg-secondary text-secondary-foreground rounded-full">Draft</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-2">
                    Last updated: {new Date(mystery.updated_at).toLocaleDateString()}
                  </p>
                  {mystery.theme && (
                    <p className="text-sm text-muted-foreground truncate mb-4">
                      Theme: {mystery.theme}
                    </p>
                  )}
                  <Button 
                    size="sm" 
                    variant={mystery.is_purchased ? "default" : "secondary"}
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewMystery(mystery);
                    }}
                  >
                    {mystery.is_purchased ? (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        View Mystery
                      </>
                    ) : (
                      <>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Mystery
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
