
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Check, FileText, Search, MoreVertical } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type Mystery = {
  id: string;
  title: string;
  theme: string;
  status: "draft" | "purchased";
  created_at: string;
  updated_at: string;
};

const MysteryDashboard = () => {
  const [mysteries, setMysteries] = useState<Mystery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "purchased">("all");
  const navigate = useNavigate();

  useEffect(() => {
    loadMysteries();
  }, []);

  const loadMysteries = async () => {
    try {
      setLoading(true);
      
      // In a real app, this would fetch from Supabase
      // const { data, error } = await supabase
      //   .from('mysteries')
      //   .select('*')
      //   .order('updated_at', { ascending: false });
      
      // For demo, use mock data - updating to only have "purchased" and "draft" status
      await new Promise(resolve => setTimeout(resolve, 1000));
      const mockMysteries: Mystery[] = [
        {
          id: "1",
          title: "Murder at the Speakeasy",
          theme: "1920s Speakeasy",
          status: "purchased",
          created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "2",
          title: "Hollywood Homicide",
          theme: "Hollywood Murder",
          status: "draft", // Changed from "completed" to "draft"
          created_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        },
        {
          id: "3",
          title: "Space Station Sabotage",
          theme: "Sci-Fi Mystery",
          status: "draft",
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        }
      ];
      
      setMysteries(mockMysteries);
    } catch (error) {
      console.error("Error loading mysteries:", error);
      toast.error("Failed to load your mysteries");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate("/mystery/create");
  };

  const handleEdit = (id: string) => {
    navigate(`/mystery/edit/${id}`);
  };

  const handleView = (id: string) => {
    navigate(`/mystery/${id}`);
  };

  const handlePurchase = (id: string) => {
    navigate(`/mystery/preview/${id}`);
  };

  const handleDelete = async (id: string) => {
    try {
      // In a real app, delete from Supabase
      // await supabase.from('mysteries').delete().eq('id', id);
      
      toast.success("Mystery deleted successfully");
      setMysteries(prev => prev.filter(mystery => mystery.id !== id));
    } catch (error) {
      console.error("Error deleting mystery:", error);
      toast.error("Failed to delete mystery");
    }
  };

  const filteredMysteries = mysteries
    .filter(mystery => 
      mystery.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      mystery.theme.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(mystery => filter === "all" || mystery.status === filter);

  const getStatusIcon = (status: "draft" | "purchased") => {
    switch (status) {
      case "draft":
        return <Clock className="h-4 w-4 text-muted-foreground" />;
      case "purchased":
        return <Check className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusBadge = (status: "draft" | "purchased") => {
    switch (status) {
      case "draft":
        return <Badge variant="outline">Draft</Badge>;
      case "purchased":
        return <Badge variant="default">Purchased</Badge>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold">Your Mysteries</h1>
              <p className="text-muted-foreground">Create, manage, and access your murder mysteries</p>
            </div>
            
            <Button onClick={handleCreateNew} className="shrink-0">
              <Plus className="h-4 w-4 mr-2" />
              Create New Mystery
            </Button>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search mysteries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
              >
                All
              </Button>
              <Button 
                variant={filter === "draft" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("draft")}
              >
                Drafts
              </Button>
              <Button 
                variant={filter === "purchased" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("purchased")}
              >
                Purchased
              </Button>
            </div>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : filteredMysteries.length === 0 ? (
            <div className="text-center py-12 border rounded-lg bg-card">
              <h3 className="text-lg font-medium mb-2">No mysteries found</h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery || filter !== "all"
                  ? "Try adjusting your search or filter"
                  : "Create your first murder mystery to get started"}
              </p>
              {!searchQuery && filter === "all" && (
                <Button onClick={handleCreateNew}>Create New Mystery</Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMysteries.map((mystery) => (
                <Card key={mystery.id} className="flex flex-col h-full">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <CardTitle 
                          className="line-clamp-2 mb-1" 
                          title={mystery.title}
                        >
                          {mystery.title}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {mystery.theme}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2 shrink-0">
                        {getStatusBadge(mystery.status)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="-mr-2">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(mystery.id)}>
                              Edit
                            </DropdownMenuItem>
                            {mystery.status === "purchased" && (
                              <DropdownMenuItem onClick={() => handleView(mystery.id)}>
                                View
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              onClick={() => handleDelete(mystery.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      {getStatusIcon(mystery.status)}
                      <span>
                        {mystery.status === "draft"
                          ? "Last edited "
                          : mystery.status === "purchased"
                          ? "Purchased "
                          : ""}
                        {new Date(mystery.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="mt-auto pt-4 flex flex-col gap-2">
                    {mystery.status === "draft" ? (
                      <>
                        <Button 
                          className="w-full" 
                          onClick={() => handleEdit(mystery.id)}
                        >
                          Continue Editing
                        </Button>
                        <Button 
                          className="w-full"
                          variant="outline"
                          onClick={() => handlePurchase(mystery.id)}
                        >
                          Purchase ($4.99)
                        </Button>
                      </>
                    ) : (
                      <Button 
                        className="w-full" 
                        variant="outline"
                        onClick={() => handleView(mystery.id)}
                      >
                        View Materials
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MysteryDashboard;
