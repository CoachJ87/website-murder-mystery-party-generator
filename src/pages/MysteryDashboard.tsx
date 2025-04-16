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
        .select("id, title, created_at, updated_at, status, mystery_data, is_purchased")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Format the data to match our Mystery interface
      const formattedMysteries: Mystery[] = data.map((item) => ({
        id: item.id,
        title: item.title || "Untitled Mystery",
        created_at: item.created_at,
        updated_at: item.updated_at || item.created_at,
        status: item.status || "draft",
        theme: item.mystery_data?.theme,
        guests: item.mystery_data?.numberOfGuests,
        is_purchased: item.is_purchased || false,
      }));

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

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (mystery) =>
          mystery.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (mystery.theme && mystery.theme.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((mystery) => mystery.status === statusFilter);
    }

    // Apply sorting
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
      const { error } = await supabase
        .from("conversations")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
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

  const generateLoremIpsum = () => {
    // This is a placeholder for generating content for demo purposes
    toast.success("Sample mystery content generated");
    navigate("/mystery/view/sample");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-8 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold mb-2">Mystery Dashboard</h1>
              <p className="text-muted-foreground">
                Manage your created mysteries, start new ones, or explore sample content.
              </p>
            </div>
            <Button onClick={() => navigate("/mystery/create")}><PlusCircle className="mr-2 h-4 w-4" /> Create New Mystery</Button>
          </div>

          {isAuthenticated ? (
            <>
              <Tabs defaultValue="all" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="draft">Drafts</TabsTrigger>
                  <TabsTrigger value="published">Published</TabsTrigger>
                  <TabsTrigger value="archived">Archived</TabsTrigger>
                </TabsList>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="search">
                      <Search className="h-4 w-4 mr-2" />
                    </Label>
                    <Input
                      id="search"
                      placeholder="Search by title or theme..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>

                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="sort">Sort by:</Label>
                      <select
                        id="sort"
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as "newest" | "oldest" | "lastUpdated")}
                      >
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="lastUpdated">Last Updated</option>
                      </select>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor="status">Filter by Status:</Label>
                      <select
                        id="status"
                        className="rounded-md border border-input bg-background px-2 py-1 text-sm"
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
                  <p>Loading mysteries...</p>
                ) : filteredMysteries.length === 0 ? (
                  <p>No mysteries found.</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredMysteries.map((mystery) => (
                      <Card key={mystery.id} className="bg-card text-card-foreground">
                        <CardHeader>
                          <CardTitle className="flex justify-between items-start">
                            {mystery.title}
                            <div>
                              {mystery.status === "draft" && <Badge variant="secondary">Draft</Badge>}
                              {mystery.status === "published" && <Badge>Published</Badge>}
                              {mystery.status === "archived" && <Badge variant="outline">Archived</Badge>}
                            </div>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                          <p className="text-sm text-muted-foreground">
                            Created: <Calendar className="inline-block h-4 w-4 mr-1" />
                            {new Date(mystery.created_at).toLocaleDateString()}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            Updated: <Clock className="inline-block h-4 w-4 mr-1" />
                            {new Date(mystery.updated_at).toLocaleDateString()}
                          </p>
                          {mystery.theme && (
                            <p className="text-sm text-muted-foreground">
                              Theme: {mystery.theme}
                            </p>
                          )}
                          {mystery.guests && (
                            <p className="text-sm text-muted-foreground">
                              Guests: {mystery.guests}
                            </p>
                          )}
                          <div className="flex justify-end space-x-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => navigate(`/mystery/edit/${mystery.id}`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                            {mystery.status !== "archived" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(mystery.id, "archived")}
                              >
                                <Archive className="h-4 w-4 mr-2" />
                                Archive
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleStatusChange(mystery.id, "draft")}
                              >
                                <Edit className="h-4 w-4 mr-2" />
                                Unarchive
                              </Button>
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button size="sm" variant="destructive">
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
            <SignInPrompt />
          )}

          <div className="mt-8 text-center">
            <Button variant="secondary" onClick={generateLoremIpsum}>
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
