
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { toast } from "sonner";

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);

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
        }
      }
    );

    // Clean up subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <h1 className="text-3xl font-bold mb-4">Welcome to your Dashboard</h1>
        <p className="mb-4">You have successfully signed in!</p>
        {user && (
          <div className="text-left p-4 bg-slate-100 rounded-lg">
            <p><strong>Email:</strong> {user.email}</p>
            <p><strong>User ID:</strong> {user.id}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
