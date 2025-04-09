
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

const Dashboard = () => {
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();

  useEffect(() => {
    if (!loading && isAuthenticated) {
      // Redirect to the MysteryDashboard
      // We're using replace:true to avoid creating browser history entries
      navigate("/dashboard", { replace: true });
    }
  }, [navigate, isAuthenticated, loading]);

  return (
    <div className="h-screen w-full flex items-center justify-center">
      <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
    </div>
  );
};

export default Dashboard;
