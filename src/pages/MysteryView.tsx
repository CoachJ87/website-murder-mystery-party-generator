
// src/pages/MysteryView.tsx
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { 
  getPackageGenerationStatus, 
  GenerationStatus 
} from "@/services/mysteryPackageService";
import { useAuth } from "@/context/AuthContext";
import MysteryPackageTabView from "@/components/MysteryPackageTabView";

const MysteryView = () => {
  const [mystery, setMystery] = useState<any | null>(null);
  const [packageContent, setPackageContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus | null>(null);
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  
  // Add ref to track notification states
  const packageReadyNotified = useRef<boolean>(false);

  const checkGenerationStatus = useCallback(async () => {
    if (!id) return;
    
    try {
      const status = await getPackageGenerationStatus(id);
      setGenerationStatus(status);
      
      if (status.content) {
        setPackageContent(status.content);
      }
      
      if (status.status === 'completed') {
        const { data: packageData } = await supabase
          .from("mystery_packages")
          .select("content")
          .eq("conversation_id", id)
          .single();
          
        if (packageData) {
          setPackageContent(packageData.content);
          
          // Only show the notification if we haven't shown it before
          if (!packageReadyNotified.current) {
            toast.success("Your mystery package is ready!");
            packageReadyNotified.current = true;
          }
          
          await supabase
            .from("conversations")
            .update({
              status: "purchased",
              is_paid: true,
              is_purchased: true,
              display_status: "purchased"
            })
            .eq("id", id);
        }
      }
    } catch (error) {
      console.error("Error checking generation status:", error);
    }
  }, [id, navigate]);

  useEffect(() => {
    const fetchMystery = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const { data: conversation, error } = await supabase
          .from("conversations")
          .select("*, mystery_data, is_paid, has_complete_package, needs_package_generation")
          .eq("id", id)
          .single();

        if (error) {
          console.error("Error fetching mystery:", error);
          toast.error("Failed to load mystery");
          return;
        }

        setMystery(conversation);

        // Always check for existing package content
        const { data: packageData, error: packageError } = await supabase
          .from("mystery_packages")
          .select("content")
          .eq("conversation_id", id)
          .maybeSingle();

        if (!packageError && packageData) {
          setPackageContent(packageData.content);
        }
        
        // Always check generation status
        const status = await getPackageGenerationStatus(id);
        setGenerationStatus(status);

        // Reset notification state on new page load
        packageReadyNotified.current = false;
      } catch (error) {
        console.error("Error:", error);
        toast.error("Failed to load mystery");
      } finally {
        setLoading(false);
      }
    };

    fetchMystery();
    
    // Check status every 5 seconds while on the page
    const interval = setInterval(checkGenerationStatus, 5000);
    
    return () => clearInterval(interval);
  }, [id, navigate, checkGenerationStatus]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="text-center mt-4">Loading your mystery...</p>
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
        <div className="container mx-auto max-w-4xl">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{mystery?.title || "Mystery Package"}</CardTitle>
              <CardDescription>
                Explore your custom murder mystery or generate a new one
              </CardDescription>
            </CardHeader>
          </Card>
          
          <MysteryPackageTabView 
            packageContent={packageContent} 
            mysteryTitle={mystery?.title || "Mystery Package"} 
            generationStatus={generationStatus}
            isGenerating={generationStatus?.status === 'in_progress'}
            conversationId={id}
          />
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default MysteryView;
