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
import { MysteryList } from "@/components/dashboard/MysteryList";
import { Mystery } from "@/interfaces/mystery";

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

  const fetchUserMysteries = async () => {
    try {
      setLoading(true);
      if (!user?.id) return;

      const { data, error } = await supabase
        .from("conversations")
        .select("id, title, created_at, updated_at, mystery_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!data) {
        setMysteries([]);
        return;
      }

      const formattedMysteries: Mystery[] = data.map((item: any) => {
        const mysteryData = item.mystery_data || {};
        const theme = mysteryData.theme || 'Unknown';
        const title = item.title || `${theme} Mystery`;
        
        return {
          id: item.id,
          title: title,
          created_at: item.created_at,
          updated_at: item.updated_at || item.created_at,
          status: mysteryData.status || "draft",
          theme: theme,
          guests: mysteryData.playerCount || mysteryData.numberOfGuests,
          is_purchased: false
        };
      });

      setMysteries(formattedMysteries);
    } catch (error) {
      console.error("Error fetching mysteries:", error);
      toast.error("Failed to load your mysteries");
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
      toast.success("Mystery deleted successfully");
      
    } catch (error) {
      console.error("Error deleting mystery:", error);
      toast.error("Failed to delete mystery");
    } finally {
      setMysteryToDelete(null);
    }
  };

  const handleStatusChange = async (id: string, newStatus: "draft" | "published" | "archived") => {
    try {
      const mysteryToUpdate = mysteries.find(mystery => mystery.id === id);
      if (!mysteryToUpdate) return;
      
      const updatedMysteryData = {
        ...mysteryToUpdate,
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from("conversations")
        .update({
          mystery_data: {
            ...mysteryToUpdate,
            status: newStatus
          },
          updated_at: new Date().toISOString()
        })
        .eq("id", id);
      
      if (error) throw error;
      
      setMysteries(
        mysteries.map((mystery) =>
          mystery.id === id
            ? { ...mystery, status: newStatus, updated_at: new Date().toISOString() }
            : mystery
        )
      );

      toast.success(`Mystery ${newStatus === "archived" ? "archived" : "updated"} successfully`);
    } catch (error) {
      console.error(`Error updating mystery status:`, error);
      toast.error("Failed to update mystery");
    }
  };

  const handleTabChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleNavigateToCreate = () => {
    navigate("/mystery/create");
  };

  const handleEdit = (id: string) => {
    navigate(`/mystery/edit/${id}`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold mb-2">Mystery Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your created mysteries, start new ones, or explore sample content.
              </p>
            </div>
            <Button 
              onClick={handleNavigateToCreate}
              className="self-start md:self-auto"
            >
              <PlusCircle className="mr-2 h-4 w-4" /> Create New Mystery
            </Button>
          </div>

          {isAuthenticated ? (
            <>
              <Tabs defaultValue="all" className="space-y-4" onValueChange={handleTabChange}>
                <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                  <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-1 flex-nowrap overflow-x-auto">
                    <TabsTrigger value="all" className="flex-shrink-0">All</TabsTrigger>
                    <TabsTrigger value="draft" className="flex-shrink-0">Drafts</TabsTrigger>
                    <TabsTrigger value="published" className="flex-shrink-0">Published</TabsTrigger>
                    <TabsTrigger value="archived" className="flex-shrink-0">Archived</TabsTrigger>
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
                  onStatusChange={handleStatusChange}
                  onDelete={handleDeleteMystery}
                  onEdit={handleEdit}
                  loading={loading}
                />
              </Tabs>
            </>
          ) : (
            <SignInPrompt 
              isOpen={true} 
              onClose={() => setShowSignInPrompt(false)} 
            />
          )}

          <div className="mt-8 text-center">
            <Button variant="secondary" onClick={() => navigate("/mystery/view/sample")}>
              Generate Sample Mystery
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MysteryDashboard;
