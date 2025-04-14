
// src/pages/MysteryDashboard.tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Clock, Check, Search, MoreVertical, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { generateCompletePackage } from "@/services/mysteryPackageService";

type Mystery = {
  id: string;
  title: string;
  theme: string;
  has_purchased: boolean;
  is_generating?: boolean;
  created_at: string;
  updated_at: string;
  purchase_date?: string;
};

const MysteryDashboard = () => {
  const [mysteries, setMysteries] = useState<Mystery[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "draft" | "purchased">("all");
  const [generatingId, setGeneratingId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated && user) {
      loadMysteries();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const loadMysteries = async () => {
    try {
      setLoading(true);
      
      // Fetch from Supabase - fix for database schema
      // Looking at the database, we need to query conversations, not profiles
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });
        
      if (error) {
        console.error("Error fetching mysteries:", error);
        toast.error("Failed to load your mysteries");
        return;
      }
      
      // Convert the conversations data to the Mystery type
      const formattedMysteries = data?.map(convo => {
        // Safely extract theme from mystery_data
        const mysteryData = typeof convo.mystery_data === 'object' ? convo.mystery_data : {};
        
        return {
          id: convo.id,
          title: convo.title || 'Untitled Mystery',
          theme: (mysteryData as any)?.theme || 'Mystery Theme',
          has_purchased: convo.is_paid || false,
          created_at: convo.created_at,
          updated_at: convo.updated_at,
          purchase_date: convo.updated_at // Using updated_at as purchase_date for now
        };
      }) || [];
      
      setMysteries(formattedMysteries);
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
      // Update to use conversations table instead of profiles
      const { error } = await supabase
        .from("conversations")
        .delete()
        .eq("id", id);
        
      if (error) {
        console.error("Error deleting mystery:", error);
        toast.error("Failed to delete mystery");
        return;
      }
      
      toast.success("Mystery deleted successfully");
      setMysteries(prev => prev.filter(mystery => mystery.id !== id));
    } catch (error) {
      console.error("Error deleting mystery:", error);
      toast.error("Failed to delete mystery");
    }
  };

  const handlePostPurchase = async (id: string) => {
    try {
      // First update the mystery status
      setGeneratingId(id);
      
      // Update the mystery as purchased
      const { error: updateError } = await supabase
        .from("conversations")
        .update({ 
          is_paid: true,
          purchase_date: new Date().toISOString()
        })
        .eq("id", id);
        
      if (updateError) {
        console.error("Error updating purchase status:", updateError);
        toast.error("Failed to update purchase status");
        return;
      }
      
      // Update local state
      setMysteries(prev => 
        prev.map(mystery => 
          mystery.id === id ? { ...mystery, has_purchased: true, is_generating: true } : mystery
        )
      );
      
      toast.success("Purchase successful! Generating your complete package...");
      
      // Generate the complete package
      try {
        await generateCompletePackage(id);
        
        // Update local state again to remove generating flag
        setMysteries(prev => 
          prev.map(mystery => 
            mystery.id === id ? { ...mystery, is_generating: false } : mystery
          )
        );
        
        toast.success("Your mystery package is ready!");
      } catch (genError) {
        console.error("Error generating package:", genError);
        toast.error("Failed to generate your package. You can try again from the dashboard.");
        
        // Update local state to remove generating flag but keep purchased status
        setMysteries(prev => 
          prev.map(mystery => 
            mystery.id === id ? { ...mystery, is_generating: false } : mystery
          )
        );
      }
    } catch (error) {
      console.error("Error processing purchase:", error);
      toast.error("Failed to process purchase");
    } finally {
      setGeneratingId(null);
    }
  };

  const simulatePurchase = async (id: string) => {
    // In a real application, this would be triggered by a webhook from Stripe
    // For testing, we'll call it directly
    await handlePostPurchase(id);
  };

  const filteredMysteries = mysteries
    .filter(mystery => 
      mystery.title?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      mystery.theme?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .filter(mystery => {
      if (filter === "all") return true;
      if (filter === "draft") return !mystery.has_purchased;
      if (filter === "purchased") return mystery.has_purchased;
      return true;
    });

  const getStatusIcon = (mystery: Mystery) => {
    if (mystery.is_generating) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    
    return mystery.has_purchased 
      ? <Check className="h-4 w-4 text-green-500" />
      : <Clock className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusBadge = (mystery: Mystery) => {
    if (mystery.is_generating) {
      return <Badge variant="outline" className="animate-pulse">Generating</Badge>;
    }
    
    return mystery.has_purchased
      ? <Badge variant="default">Purchased</Badge>
      : <Badge variant="outline">Draft</Badge>;
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center py-12 border rounded-lg bg-card">
              <h3 className="text-xl font-medium mb-2">Sign in to view your mysteries</h3>
              <p className="text-muted-foreground mb-6">
                You need to sign in to create and manage your murder mystery games
              </p>
              <Button onClick={() => navigate("/sign-in")}>Sign In</Button>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    );
  }

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
            
            <Button onClick={() => navigate("/mystery/create")} className="shrink-0">
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
                <Button onClick={() => navigate("/mystery/create")}>Create New Mystery</Button>
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
                          title={mystery.title || "Untitled Mystery"}
                        >
                          {mystery.title || "Untitled Mystery"}
                        </CardTitle>
                        <div className="text-sm text-muted-foreground">
                          {mystery.theme || "Mystery Theme"}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 ml-2 shrink-0">
                        {getStatusBadge(mystery)}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="-mr-2">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {!mystery.has_purchased && (
                              <DropdownMenuItem onClick={() => handleEdit(mystery.id)}>
                                Edit
                              </DropdownMenuItem>
                            )}
                            {mystery.has_purchased && (
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
                      {getStatusIcon(mystery)}
                      <span>
                        {mystery.has_purchased
                          ? mystery.is_generating 
                            ? "Generating package..."
                            : "Purchased " + new Date(mystery.purchase_date || mystery.updated_at).toLocaleDateString()
                          : "Last edited " + new Date(mystery.updated_at).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                  
                  <CardFooter className="mt-auto pt-4 flex flex-col gap-2">
                    {mystery.is_generating ? (
                      <Button 
                        className="w-full"
                        disabled
                      >
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </Button>
                    ) : mystery.has_purchased ? (
                      <Button 
                        className="w-full" 
                        onClick={() => handleView(mystery.id)}
                      >
                        View Materials
                      </Button>
                    ) : (
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
                        {/* For testing only - remove in production */}
                        <Button 
                          className="w-full mt-2"
                          variant="outline"
                          size="sm"
                          onClick={() => simulatePurchase(mystery.id)}
                        >
                          Simulate Purchase (Dev Only)
                        </Button>
                      </>
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
