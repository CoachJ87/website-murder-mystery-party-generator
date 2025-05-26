
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Hero from "@/components/Hero";
import VercelChatbot from "@/components/VercelChatbot";
import { HomeDashboard } from "@/components/dashboard/HomeDashboard";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

const Index = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleCreateNew = () => {
    navigate("/mystery/new");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        {isAuthenticated ? (
          <HomeDashboard onCreateNew={handleCreateNew} />
        ) : (
          <div className={cn("container mx-auto", isMobile ? "px-4 py-8" : "px-4 py-12")}>
            <Hero />
            <div className="mt-12">
              <VercelChatbot />
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Index;
