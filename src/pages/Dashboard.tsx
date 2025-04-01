
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ChatDemo from "@/components/ChatDemo";
import { Button } from "@/components/ui/button";
import { PlusCircle, MessageSquare, Settings, FileText } from "lucide-react";

const Dashboard = () => {
  const { isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/sign-in");
    }
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  const recentProjects = [
    { id: 1, name: "Landing Page Project", date: "2 days ago", messages: 24 },
    { id: 2, name: "E-commerce Dashboard", date: "Last week", messages: 56 },
    { id: 3, name: "Personal Portfolio", date: "2 weeks ago", messages: 18 },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
            <h1 className="text-3xl font-bold mb-4 md:mb-0">Dashboard</h1>
            <Button className="flex items-center">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Project
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="md:col-span-2">
              <div className="bg-card rounded-xl border shadow-sm p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4">Recent Projects</h2>
                
                <div className="space-y-4">
                  {recentProjects.map((project) => (
                    <div key={project.id} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted transition-colors cursor-pointer">
                      <div>
                        <h3 className="font-medium">{project.name}</h3>
                        <p className="text-sm text-muted-foreground">Last edited {project.date}</p>
                      </div>
                      <div className="flex items-center space-x-1 text-muted-foreground">
                        <MessageSquare className="h-4 w-4" />
                        <span className="text-sm">{project.messages}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <ChatDemo />
            </div>
            
            <div className="space-y-6">
              <div className="bg-card rounded-xl border shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
                <div className="space-y-2">
                  <Button variant="outline" className="w-full justify-start">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Project
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <FileText className="mr-2 h-4 w-4" />
                    Browse Templates
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Account Settings
                  </Button>
                </div>
              </div>
              
              <div className="bg-card rounded-xl border shadow-sm p-6">
                <h2 className="text-xl font-semibold mb-4">Project Statistics</h2>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Active Projects</span>
                      <span className="text-sm font-medium">3/5</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary rounded-full h-2" style={{ width: "60%" }}></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="text-sm font-medium">Messages Used</span>
                      <span className="text-sm font-medium">150/500</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div className="bg-primary rounded-full h-2" style={{ width: "30%" }}></div>
                    </div>
                  </div>
                  
                  <div className="pt-2">
                    <Button variant="link" className="p-0 h-auto text-sm">
                      Upgrade to Pro
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default Dashboard;
