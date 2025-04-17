import { useState, useEffect } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { PlusCircle, Search, Calendar, Clock, Filter, Trash, Archive, Edit } from "lucide-react";
import SignInPrompt from "@/components/SignInPrompt";

interface Mystery {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  status: "draft" | "published" | "archived";
  theme?: string;
  guests?: number;
  is_purchased?: boolean;
}

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
              onClick={() => navigate("/mystery/create")}
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

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
                  <div className="flex items-center space-x-2 w-full md:w-auto">
                    <Search className="h-4 w-4 text-muted-foreground" />
                    <Input
                      className="w-full md:w-[250px]"
                      placeholder="Search by title or theme..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Label htmlFor="sort" className="whitespace-nowrap">Sort by:</Label>
                      <select
                        id="sort"
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm w-full"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest" | "lastUpdated")}
                      >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="lastUpdated">Last Updated</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2 w-full md:w-auto">
                      <Label htmlFor="status" className="whitespace-nowrap">Filter by Status:</Label>
                      <select
                        id="status"
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm w-full"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="all">All</option>
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                        <option value="archived">Archived</option>
                      </select>
                    </div>
                  </div>
                </div>

                {loading ? (
                  <div className="text-center py-8">
                    <p>Loading mysteries...</p>
                  </div>
                ) : filteredMysteries.length === 0 ? (
                  <div className="text-center py-8">
                    <p>No mysteries found. Try changing your filters or create a new mystery.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMysteries.map((mystery) => (
                      <Card key={mystery.id} className="bg-card">
                        <CardHeader>
                          <CardTitle className="flex justify-between items-start gap-2">
                            <span className="truncate">{mystery.title}</span>
                            <div>
                              {mystery.status === "draft" && <Badge variant="secondary">Draft</Badge>}
                              {mystery.status === "published" && <Badge>Published</Badge>}
                              {mystery.status === "archived" && <Badge variant="outline">Archived</Badge>}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            <Calendar className="inline-block h-4 w-4 mr-1" />
                            Created: {new Date(mystery.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            <Clock className="inline-block h-4 w-4 mr-1" />
                            Updated: {new Date(mystery.updated_at).toLocaleDateString()}
                          </p>
                          {mystery.theme && (
                            <p className="text-sm text-muted-foreground truncate">
                              Theme: {mystery.theme}
                            </p>
                          )}
                          {mystery.guests && (
                            <p className="text-sm text-muted-foreground">
                              Guests: {mystery.guests}
                            </p>
                          )}
                          
                          <div className="flex flex-wrap justify-end gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/mystery/edit/${mystery.id}`)}
                              className="flex-1 min-w-[80px]"
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            {mystery.status !== "archived" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(mystery.id, "archived")}
                                className="flex-1 min-w-[80px]"
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(mystery.id, "draft")}
                                className="flex-1 min-w-[80px]"
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Unarchive
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="destructive"
                                  className="flex-1 min-w-[80px]"
                                >
                                  <Trash className="h-4 w-4 mr-2" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete your mystery from our
                                    servers.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => {
                                      setMysteryToDelete(mystery.id);
                                      handleDeleteMystery(mystery.id);
                                    }}
                                  >
                                    Delete
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
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
