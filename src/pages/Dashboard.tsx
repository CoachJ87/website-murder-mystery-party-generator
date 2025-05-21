import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";
import MysteryList from "@/components/dashboard/MysteryList";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { HomeDashboard } from "@/components/dashboard/HomeDashboard";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [mysteries, setMysteries] = useState([]);
  const [isLoadingMysteries, setIsLoadingMysteries] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Dashboard session check error:", error);
          navigate("/sign-in", { replace: true });
          return;
        }

        if (!data.session) {
          console.log("Dashboard: No active session found");
          navigate("/sign-in", { replace: true });
          return;
        }

        setUser(data.session.user);
        console.log("Dashboard: Session found for user:", data.session.user.id);
        
        // Fetch user's mysteries
        await fetchMysteries(data.session.user.id);
      } catch (error) {
        console.error("Dashboard auth check error:", error);
        navigate("/sign-in", { replace: true });
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
    
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Dashboard auth state changed:", event);
        if (event === "SIGNED_OUT") {
          navigate("/sign-in", { replace: true });
        } else if (session) {
          setUser(session.user);
          fetchMysteries(session.user.id);
        }
      }
    );

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  const fetchMysteries = async (userId: string) => {
    setIsLoadingMysteries(true);
    try {
      const { data, error } = await supabase
        .from("conversations")
        .select("*, messages!messages_conversation_id_fkey(id, content, created_at, is_ai, role)")
        .eq("user_id", userId)
        .order("updated_at", { ascending: false });
        
      if (error) {
        throw error;
      }
      
      setMysteries(data || []);
    } catch (error) {
      console.error("Error fetching mysteries:", error);
      toast.error("Failed to load your mysteries");
    } finally {
      setIsLoadingMysteries(false);
    }
  };

  const handleCreateNewMystery = () => {
    navigate("/mystery/new");
  };

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-grow container mx-auto py-8 px-4">
        {mysteries.length > 0 ? (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h1 className="text-3xl font-bold">Your Murder Mysteries</h1>
                <p className="text-muted-foreground mt-1">
                  View, edit and manage all your created mysteries
                </p>
              </div>
              <Button onClick={handleCreateNewMystery} className="sm:self-end">
                <PlusCircle className="mr-2 h-4 w-4" />
                Create New Mystery
              </Button>
            </div>
            
            {/* Mystery listing without the filter tabs */}
            <MysteryList 
              mysteries={mysteries} 
              isLoading={isLoadingMysteries}
              onRefresh={() => user && fetchMysteries(user.id)}
            />
          </div>
        ) : (
          <HomeDashboard onCreateNew={handleCreateNewMystery} />
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;
