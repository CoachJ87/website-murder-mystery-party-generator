import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlusCircle } from "lucide-react";
import SignInPrompt from "@/components/SignInPrompt";
import { MysteryFilters } from "@/components/dashboard/MysteryFilters";
import MysteryList from "@/components/dashboard/MysteryList";
import { Mystery } from "@/interfaces/mystery";
import { useTranslation } from "react-i18next";

const MysteryDashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [mysteries, setMysteries] = useState<Mystery[]>([]);
  const [filteredMysteries, setFilteredMysteries] = useState<Mystery[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "lastUpdated">("newest");
  const [loading, setLoading] = useState(true);
  const [mysteryToDelete, setMysteryToDelete] = useState<string | null>(null);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserMysteries();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [mysteries, searchTerm, statusFilter, sortOrder]);

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

  const fetchUserMysteries = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      const { data: conversationsData, error: conversationsError } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at, mystery_data, display_status, is_paid, purchase_date")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (conversationsError) throw conversationsError;

      if (!conversationsData) {
        setMysteries([]);
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
          
          // Determine the true status - prioritize database fields over mystery_data
          let status: "draft" | "purchased" | "archived";
          
          if (conversation.is_paid === true || conversation.display_status === "purchased") {
            status = "purchased";
          } else if (conversation.display_status === "archived") {
            status = "archived";
          } else {
            // Fall back to mystery_data status if available, otherwise default to "draft"
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

      setMysteries(mysteriesWithMessages);
    } catch (error) {
      console.error("Error fetching mysteries:", error);
      toast.error(t("dashboard.errors.loadFailed"));
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...mysteries];

    if (searchTerm) {
      filtered = filtered.filter(
        (mystery) =>
          mystery.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (mystery.theme && mystery.theme.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((mystery) => mystery.status === statusFilter);
    }

    if (sortOrder === "newest") {
      filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    } else if (sortOrder === "oldest") {
      filtered.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    } else if (sortOrder === "lastUpdated") {
      filtered.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
    }

    setFilteredMysteries(filtered);
  };

  const handleDeleteMystery = async (id: string) => {
    try {
      if (!id) return;
      
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setMysteries(mysteries.filter(mystery => mystery.id !== id));
      toast.success(t("common.notifications.deleteSuccess", { item: t("common.labels.mystery", { count: 1 }) }));
      
    } catch (error) {
      console.error("Error deleting mystery:", error);
      toast.error(t("common.notifications.deleteFailed", { item: t("common.labels.mystery", { count: 1 }) }));
    } finally {
      setMysteryToDelete(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: "draft" | "purchased" | "archived") => {
    try {
      const mysteryToUpdate = mysteries.find(mystery => mystery.id === id);
      if (!mysteryToUpdate) return;
      
      const { error } = await supabase
        .from("conversations")
        .update({
          display_status: newStatus,
          updated_at: new Date().toISOString(),
          // Update both fields to ensure consistency
          is_paid: newStatus === "purchased",
          purchase_date: newStatus === "purchased" ? new Date().toISOString() : null,
          mystery_data: {
            ...mysteryToUpdate,
            status: newStatus
          }
        })
        .eq("id", id);
      
      if (error) throw error;
      
      setMysteries(
        mysteries.map((mystery) =>
          mystery.id === id
            ? { 
                ...mystery, 
                status: newStatus, 
                updated_at: new Date().toISOString(),
                is_purchased: newStatus === "purchased",
                purchase_date: newStatus === "purchased" ? new Date().toISOString() : undefined
              }
            : mystery
        )
      );

      const toastMessage = newStatus === 'archived' 
        ? t("common.notifications.archiveSuccess", { item: t("common.labels.mystery", { count: 1 }) })
        : t("common.notifications.updatedSuccess", { item: t("common.labels.mystery", { count: 1 }) });
      toast.success(toastMessage);

    } catch (error) {
      console.error(`Error updating mystery status:`, error);
      toast.error(t("common.notifications.updateFailed", { item: t("common.labels.mystery", { count: 1 }) }));
    }
  };

  const handleTabChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleNavigateToCreate = () => {
    // If user has existing mysteries, redirect to the most recent one
    if (mysteries && mysteries.length > 0) {
      // Find the most recently updated mystery
      const mostRecentMystery = [...mysteries].sort((a, b) => 
        new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime()
      )[0];
      
      if (mostRecentMystery && mostRecentMystery.id) {
        navigate(`/mystery/${mostRecentMystery.id}`);
        return;
      }
    }
    // If no mysteries exist, go to create page
    navigate("/mystery/create");
  };

  const handleRefresh = () => {
    fetchUserMysteries();
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">{t('mysteryDashboard.title')}</h1>
              <p className="text-muted-foreground">
                {t('mysteryDashboard.description')}
              </p>
            </div>
            <Button 
              onClick={handleNavigateToCreate}
              className="self-start md:self-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> {t('common.buttons.createNew')}
            </Button>
          </div>

          {isAuthenticated ? (
            <>
              <Tabs defaultValue="all" className="space-y-4" onValueChange={handleTabChange}>
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-1 flex-nowrap overflow-x-auto">
                    <TabsTrigger value="all">{t('mysteryDashboard.tabs.all')}</TabsTrigger>
                    <TabsTrigger value="draft">{t('mysteryDashboard.tabs.drafts')}</TabsTrigger>
                    <TabsTrigger value="purchased">{t('mysteryDashboard.tabs.purchased')}</TabsTrigger>
                    <TabsTrigger value="archived">{t('mysteryDashboard.tabs.archived')}</TabsTrigger>
                  </TabsList>
                </div>

                <MysteryFilters
                  searchTerm={searchTerm}
                  setSearchTerm={setSearchTerm}
                  statusFilter={statusFilter}
                  setStatusFilter={setStatusFilter}
                  sortOrder={sortOrder}
                  setSortOrder={setSortOrder}
                />

                <MysteryList
                  mysteries={filteredMysteries}
                  isLoading={loading}
                  onRefresh={handleRefresh}
                />
              </Tabs>
            </>
          ) : (
            <SignInPrompt 
              isOpen={true} 
              onClose={() => setShowSignInPrompt(false)} 
            />
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MysteryDashboard;
