
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    console.log("Dashboard: Auth state check", { isAuthenticated, loading });
    
    // Wait until auth state is determined before redirecting
    if (!loading) {
      if (isAuthenticated) {
        console.log("Dashboard: User is authenticated, staying on dashboard");
      } else {
        console.log("Dashboard: User is not authenticated, redirecting to sign-in");
        navigate("/sign-in", { replace: true });
      }
    }
  }, [navigate, isAuthenticated, loading]);

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
      </div>
    </div>
  );
};

export default Dashboard;
