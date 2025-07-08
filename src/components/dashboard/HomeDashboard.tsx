
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
import { useTranslation } from "react-i18next";

interface HomeDashboardProps {
  onCreateNew: () => void;
}

export const HomeDashboard = ({ onCreateNew }: HomeDashboardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [allMysteries, setAllMysteries] = useState<Mystery[]>([]);
  const [displayedMysteries, setDisplayedMysteries] = useState<Mystery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [hasMorePages, setHasMorePages] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const pageSize = 6;
  const { t } = useTranslation();

  // Handle search term changes
  useEffect(() => {
    if (searchTerm.trim()) {
      setIsSearching(true);
      // Reset to first page when search term changes
      setPage(1);
      // Apply search filter to all loaded mysteries
      applySearchFilter(searchTerm.trim().toLowerCase());
    } else {
      setIsSearching(false);
      // Reset to first page and show all mysteries with pagination
      setPage(1);
      updateDisplayedMysteries(allMysteries, 1);
    }
  }, [searchTerm]);

  // Fetch mysteries when user changes or when reset is needed
  useEffect(() => {
    if (user?.id) {
      fetchMysteries(1, true);
    }
  }, [user?.id]);

  // Apply search filter to all loaded mysteries
  const applySearchFilter = (searchLower: string) => {
    if (allMysteries.length === 0) return;
    
    const filtered = allMysteries.filter(mystery => {
      // Search in all relevant fields
      const searchableFields = [
        mystery.title?.toLowerCase() || '',
        mystery.ai_title?.toLowerCase() || '',
        mystery.theme?.toLowerCase() || '',
        mystery.mystery_data?.theme?.toLowerCase() || '',
        mystery.mystery_data?.additionalDetails?.toLowerCase() || '',
        mystery.mystery_data?.scriptType?.toLowerCase() || ''
      ];
      
      // Check if any field includes the search term
      return searchableFields.some(field => field.includes(searchLower));
    });
    
    updateDisplayedMysteries(filtered, 1);
  };

  // Update displayed mysteries with pagination
  const updateDisplayedMysteries = (mysteries: Mystery[], pageNum: number) => {
    const start = (pageNum - 1) * pageSize;
    const end = start + pageSize;
    const paginated = mysteries.slice(0, end);
    
    setDisplayedMysteries(paginated);
    setHasMorePages(end < mysteries.length);
  };

  const fetchMysteries = async (pageNumber: number, reset: boolean = false) => {
    try {
      setLoading(true);
      if (!user?.id) return;

      // Build base query
      let query = supabase
        .from("conversations")
        .select("id, title, created_at, updated_at, theme, player_count, script_type, has_accomplice, additional_details, status, display_status, is_paid, purchase_date, is_completed, needs_package_generation")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
      
      // If not searching, apply pagination on the server
      if (!isSearching) {
        query = query.range((pageNumber - 1) * pageSize, pageNumber * pageSize - 1);
      }
      
      const { data: conversationsData, error: conversationsError } = await query;

      if (conversationsError) {
        console.error("Error fetching conversations:", conversationsError);
        throw conversationsError;
      }

      if (!conversationsData) {
        setAllMysteries([]);
        setDisplayedMysteries([]);
        setHasMorePages(false);
        return;
      }

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
            const theme = conversation.theme || 'Mystery';
            
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
                    // Update database to prevent future checks
                    await supabase
                      .from("conversations")
                      .update({ needs_package_generation: false })
                      .eq("id", conversation.id);
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
              status = conversation.status || "draft";
            }
            
            const mystery: Mystery = {
              id: conversation.id,
              title: title,
              created_at: conversation.created_at,
              updated_at: conversation.updated_at || conversation.created_at,
              status: status,
              display_status: status,
              mystery_data: {
                theme: conversation.theme,
                playerCount: conversation.player_count,
                scriptType: conversation.script_type,
                hasAccomplice: conversation.has_accomplice,
                additionalDetails: conversation.additional_details,
                status: status
              },
              theme: theme,
              guests: conversation.player_count || 6,
              is_purchased: conversation.is_paid === true || conversation.display_status === "purchased",
              is_completed: conversation.is_completed || false,
              ai_title: aiTitle,
              purchase_date: conversation.purchase_date,
              needs_package_generation: conversation.needs_package_generation || false
            };
            
            return mystery;
          } catch (error) {
            console.error(`Error processing conversation ${conversation.id}:`, error);
            // Return a basic mystery object to prevent complete failure
            const mystery: Mystery = {
              id: conversation.id,
              title: conversation.title || "Mystery",
              created_at: conversation.created_at,
              updated_at: conversation.updated_at || conversation.created_at,
              status: "draft",
              display_status: "draft",
              mystery_data: {
                theme: conversation.theme || "Mystery",
                playerCount: conversation.player_count || 6,
                scriptType: conversation.script_type || "full",
                hasAccomplice: conversation.has_accomplice || false,
                additionalDetails: conversation.additional_details || ""
              },
              theme: conversation.theme || "Mystery",
              guests: conversation.player_count || 6,
              is_purchased: false,
              is_completed: false,
              ai_title: null,
              purchase_date: null,
              needs_package_generation: false
            };
            
            return mystery;
          }
        })
      );

      // Filter out any null results
      let validMysteries = mysteriesWithMessages.filter(Boolean);
      
      // Apply search filter if search term exists
      if (searchTerm.trim()) {
        const searchLower = searchTerm.trim().toLowerCase();
        validMysteries = validMysteries.filter(mystery => {
          // Search in all relevant fields
          const searchableFields = [
            mystery.title?.toLowerCase() || '',
            mystery.ai_title?.toLowerCase() || '',
            mystery.theme?.toLowerCase() || '',
            mystery.mystery_data?.theme?.toLowerCase() || '',
            mystery.mystery_data?.additionalDetails?.toLowerCase() || '',
            mystery.mystery_data?.scriptType?.toLowerCase() || ''
          ];
          
          // Check if any field includes the search term
          return searchableFields.some(field => field.includes(searchLower));
        });
      }
      
      // Sort by status (generating first, then by update time)
      validMysteries = validMysteries.sort((a, b) => {
        // Prioritize generating mysteries
        if (a.status === "generating" && b.status !== "generating") return -1;
        if (b.status === "generating" && a.status !== "generating") return 1;
        
        // Then sort by updated date
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      });

      // Update allMysteries with the full list
      const updatedMysteries = reset ? validMysteries : [...allMysteries, ...validMysteries];
      setAllMysteries(updatedMysteries);
      
      if (isSearching) {
        // If searching, apply search filter to the updated list
        applySearchFilter(searchTerm.trim().toLowerCase());
      } else {
        // Otherwise, update displayed mysteries with pagination
        updateDisplayedMysteries(updatedMysteries, pageNumber);
      }
      
      setPage(pageNumber);
    } catch (error) {
      console.error("Error fetching mysteries:", error);
      toast.error(t('homeDashboard.errors.loadFailed') as string);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (!loading) {
      if (isSearching) {
        // When searching and loading more, show more of the filtered results
        const nextPage = page + 1;
        updateDisplayedMysteries(
          allMysteries.filter(mystery => {
            const searchLower = searchTerm.trim().toLowerCase();
            const searchableFields = [
              mystery.title?.toLowerCase() || '',
              mystery.ai_title?.toLowerCase() || '',
              mystery.theme?.toLowerCase() || '',
              mystery.mystery_data?.theme?.toLowerCase() || '',
              mystery.mystery_data?.additionalDetails?.toLowerCase() || '',
              mystery.mystery_data?.scriptType?.toLowerCase() || ''
            ];
            return searchableFields.some(field => field.includes(searchLower));
          }),
          nextPage
        );
        setPage(nextPage);
      } else if (hasMorePages) {
        // When not searching, fetch next page from server
        fetchMysteries(page + 1, false);
      }
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
      
      const mysteryLabel = t('common.labels.mystery', { count: 1, defaultValue: 'mystery' });
      toast.success(t('common.notifications.archiveSuccess', { item: mysteryLabel, defaultValue: '{{item}} archived successfully' }));
      fetchMysteries(1, true);
    } catch (error) {
      console.error("Error archiving mystery:", error);
      const mysteryLabel = t('common.labels.mystery', { count: 1, defaultValue: 'mystery' });
      toast.error(t('common.notifications.archiveFailed', { item: mysteryLabel, defaultValue: 'Failed to archive {{item}}' }));
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
      
      const mysteryLabel = t('common.labels.mystery', { count: 1, defaultValue: 'mystery' });
      toast.success(t('common.notifications.deleteSuccess', { item: mysteryLabel, defaultValue: '{{item}} deleted successfully' }));
      fetchMysteries(1, true);
    } catch (error) {
      console.error("Error deleting mystery:", error);
      const mysteryLabel = t('common.labels.mystery', { count: 1, defaultValue: 'mystery' });
      toast.error(t('common.notifications.deleteFailed', { item: mysteryLabel, defaultValue: 'Failed to delete {{item}}' }));
    }
  };

  const handleMysteryUpdated = () => {
    fetchMysteries(1, true);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // If clearing search, reset to show all mysteries with pagination
    if (!value.trim()) {
      setPage(1);
      updateDisplayedMysteries(allMysteries, 1);
    }
  };

  return (
    <div className="py-12 px-4 bg-card/30">
      <div className="container mx-auto max-w-5xl">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">{t('homeDashboard.title', { defaultValue: 'My Mysteries' })}</h2>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-grow">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder={t('homeDashboard.searchPlaceholder', { defaultValue: 'Search mysteries...' })}
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        </div>

        {loading && displayedMysteries.length === 0 ? (
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
        ) : displayedMysteries.length === 0 ? (
          <div className="text-center py-12 bg-muted/20 rounded-lg">
            <p className="text-xl font-medium mb-2">{t('homeDashboard.empty.title', { defaultValue: 'No mysteries found' })}</p>
            <p className="text-muted-foreground mb-4">
              {t('homeDashboard.empty.description', { defaultValue: 'Create your first mystery to get started' })}
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {displayedMysteries.map((mystery) => (
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
                  {loading 
                    ? t('homeDashboard.loading', { defaultValue: 'Loading...' }) 
                    : t('homeDashboard.loadMore', { defaultValue: 'Load More' })}
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
