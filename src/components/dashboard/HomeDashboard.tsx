
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { Mystery } from "@/interfaces/mystery";
import { Search, ArrowDown } from "lucide-react";
import HomeMysteryCard from "./HomeMysteryCard";

interface HomeDashboardProps {
  onCreateNew: () => void;
}

export const HomeDashboard = ({ onCreateNew }: HomeDashboardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mysteries, setMysteries] = useState<Mystery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const pageSize = 6;

  useEffect(() => {
    if (user?.id) {
      fetchMysteries(1, true);
    }
  }, [user?.id, searchTerm]);

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

  const fetchMysteries = async (pageNumber: number, reset: boolean = false) => {
    try {
      setLoading(true);
      if (!user?.id) return;

      let query = supabase
        .from("conversations")
        .select("id, title, created_at, updated_at, mystery_data, display_status, is_paid, purchase_date")
        .eq("user_id", user.id);

      // Apply search filter if provided
      if (searchTerm.trim()) {
        query = query.or(`title.ilike.%${searchTerm.trim()}%,mystery_data->>theme.ilike.%${searchTerm.trim()}%`);
      }

      // Pagination
      query = query.order("updated_at", { ascending: false })
        .range((pageNumber - 1) * pageSize, pageNumber * pageSize - 1);

      const { data: conversationsData, error: conversationsError } = await query;

      if (conversationsError) throw conversationsError;

      if (!conversationsData) {
        setMysteries([]);
        setHasMorePages(false);
        return;
      }

      // Check if we have more pages
      setHasMorePages(conversationsData.length === pageSize);

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
            display_status: status,
            mystery_data: mysteryData,
            theme: theme,
            guests: mysteryData.playerCount || mysteryData.numberOfGuests || mysteryData.guests,
            is_purchased: conversation.is_paid === true || conversation.display_status === "purchased",
            is_completed: conversation.is_completed || false,
            ai_title: aiTitle,
            purchase_date: conversation.purchase_date
          };
        })
      );

      // If resetting (e.g., new search), replace mysteries completely
      if (reset) {
        setMysteries(mysteriesWithMessages);
        setPage(pageNumber);
      } else {
        // Otherwise append to existing list
        setMysteries(prev => [...prev, ...mysteriesWithMessages]);
        setPage(pageNumber);
      }
    } catch (error) {
      console.error("Error fetching mysteries:", error);
      toast.error("Failed to load your mysteries");
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (hasMorePages && !loading) {
      fetchMysteries(page + 1, false);
    }
  };

  const handleViewMystery = (mysteryId: string) => {
    const mystery = mysteries.find(m => m.id === mysteryId);
    
    if (mystery?.is_purchased || mystery?.status === "purchased") {
      navigate(`/mystery/${mysteryId}`);
    } else {
      navigate(`/mystery/edit/${mysteryId}`);
    }
  };

  const handleEditMystery = (mysteryId: string) => {
    navigate(`/mystery/edit/${mysteryId}`);
  };

  const handleArchiveMystery = async (mysteryId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .update({ display_status: "archived" })
        .eq("id", mysteryId);
      
      if (error) {
        throw error;
      }
      
      toast.success("Mystery archived");
      fetchMysteries(1, true);
    } catch (error) {
      console.error("Error archiving mystery:", error);
      toast.error("Failed to archive mystery");
    }
  };

  const handleDeleteMystery = async (mysteryId: string) => {
    try {
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", mysteryId);
      
      if (error) {
        throw error;
      }
      
      toast.success("Mystery deleted");
      fetchMysteries(1, true);
    } catch (error) {
      console.error("Error deleting mystery:", error);
      toast.error("Failed to delete mystery");
    }
  };

  const handleMysteryUpdated = () => {
    fetchMysteries(1, true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="py-12 px-4 bg-card/30">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Your Mysteries</h2>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Search mysteries..."
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        </div>

        {loading && mysteries.length === 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 py-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="opacity-70 animate-pulse h-56">
                <CardHeader className="h-16">
                  <div className="h-6 bg-muted rounded"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-4 bg-muted rounded mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-4"></div>
                  <div className="h-10 bg-muted rounded mt-auto"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : mysteries.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <p className="text-xl font-medium mb-2">You haven't created any mysteries yet</p>
            <p className="text-muted-foreground mb-4">
              Use the input box above to start creating your first murder mystery!
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mysteries.map((mystery) => (
                <HomeMysteryCard 
                  key={mystery.id} 
                  mystery={{
                    id: mystery.id,
                    title: mystery.title,
                    mystery_data: mystery.mystery_data || {},
                    display_status: mystery.display_status || mystery.status,
                    created_at: mystery.created_at,
                    is_completed: mystery.is_completed || false
                  }}
                  onView={handleViewMystery}
                  onEdit={handleEditMystery}
                  onArchive={handleArchiveMystery}
                  onDelete={handleDeleteMystery}
                />
              ))}
            </div>
            
            {hasMorePages && (
              <div className="mt-8 text-center">
                <Button 
                  onClick={handleLoadMore} 
                  variant="outline" 
                  disabled={loading}
                >
                  {loading ? "Loading..." : "Load More"}
                  {!loading && <ArrowDown className="ml-2 h-4 w-4" />}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
