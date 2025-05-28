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
import { extractTitleFromMessages } from "@/utils/titleExtraction";
import { getPackageGenerationStatus } from "@/services/mysteryPackageService";

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

  const fetchMysteries = async (pageNumber: number, reset: boolean = false) => {
    try {
      setLoading(true);
      if (!user?.id) return;

      let query = supabase
        .from("conversations")
        .select("id, title, created_at, updated_at, mystery_data, display_status, is_paid, purchase_date, is_completed, needs_package_generation")
        .eq("user_id", user.id);

      // Apply search filter if provided
      if (searchTerm.trim()) {
        query = query.or(`title.ilike.%${searchTerm.trim()}%,mystery_data->>theme.ilike.%${searchTerm.trim()}%`);
      }

      // Pagination
      query = query.order("updated_at", { ascending: false })
        .range((pageNumber - 1) * pageSize, pageNumber * pageSize - 1);

      const { data: conversationsData, error: conversationsError } = await query;

      if (conversationsError) {
        console.error("Error fetching conversations:", conversationsError);
        throw conversationsError;
      }

      if (!conversationsData) {
        setMysteries([]);
        setHasMorePages(false);
        return;
      }

      // Check if we have more pages
      setHasMorePages(conversationsData.length === pageSize);

      const mysteriesWithMessages = await Promise.all(
        conversationsData.map(async (conversation: any) => {
          try {
            // Fetch messages for this conversation
            const { data: messagesData, error: messagesError } = await supabase
              .from("messages")
              .select("*")
              .eq("conversation_id", conversation.id)
              .order("created_at", { ascending: true });
            
            if (messagesError) {
              console.error(`Error fetching messages for conversation ${conversation.id}:`, messagesError);
              // Continue with empty messages array rather than failing completely
            }
            
            const aiTitle = extractTitleFromMessages(messagesData || []);
            const mysteryData = conversation.mystery_data || {};
            const theme = mysteryData.theme || 'Mystery';
            
            const title = aiTitle || conversation.title || `${theme} Mystery`;
            
            // Determine the true status with generation state consideration
            let status: "draft" | "purchased" | "archived" | "generating";
            
            if (conversation.needs_package_generation && conversation.is_paid) {
              // Check if currently generating
              try {
                const generationStatus = await getPackageGenerationStatus(conversation.id);
                if (generationStatus.status === 'in_progress') {
                  status = "generating";
                } else if (generationStatus.status === 'completed') {
                  status = "purchased";
                } else {
                  status = "purchased"; // Default to purchased if paid but status unclear
                }
              } catch (error) {
                console.error(`Error checking generation status for ${conversation.id}:`, error);
                // Default to purchased if we can't check generation status
                status = "purchased";
              }
            } else if (conversation.is_paid === true || conversation.display_status === "purchased") {
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
              purchase_date: conversation.purchase_date,
              needs_package_generation: conversation.needs_package_generation || false
            };
          } catch (error) {
            console.error(`Error processing conversation ${conversation.id}:`, error);
            // Return a basic mystery object to prevent complete failure
            return {
              id: conversation.id,
              title: conversation.title || "Mystery",
              created_at: conversation.created_at,
              updated_at: conversation.updated_at || conversation.created_at,
              status: "draft" as const,
              display_status: "draft",
              mystery_data: conversation.mystery_data || {},
              theme: "Mystery",
              guests: 6,
              is_purchased: false,
              is_completed: false,
              ai_title: null,
              purchase_date: null,
              needs_package_generation: false
            };
          }
        })
      );

      // Filter out any null results and sort by status (generating first, then by update time)
      const validMysteries = mysteriesWithMessages.filter(Boolean).sort((a, b) => {
        // Prioritize generating mysteries
        if (a.status === "generating" && b.status !== "generating") return -1;
        if (b.status === "generating" && a.status !== "generating") return 1;
        
        // Then sort by updated date
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      // If resetting (e.g., new search), replace mysteries completely
      if (reset) {
        setMysteries(validMysteries);
        setPage(pageNumber);
      } else {
        // Otherwise append to existing list
        setMysteries(prev => [...prev, ...validMysteries]);
        setPage(pageNumber);
      }
    } catch (error) {
      console.error("Error fetching mysteries:", error);
      toast.error("Failed to load some mysteries. Please refresh the page.");
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
    
    if (mystery?.is_purchased || mystery?.status === "purchased" || mystery?.status === "generating") {
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
                    display_status: mystery.status, // Use the computed status
                    created_at: mystery.created_at,
                    is_completed: Boolean(mystery.is_completed)
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
