
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import MysteryForm from "@/components/MysteryForm";
import StreamlitChatbot from "@/components/StreamlitChatbot";
import { useAuth } from "@/context/AuthContext";

const MysteryCreation = () => {
  const [saving, setSaving] = useState(false);
  const [showChatUI, setShowChatUI] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { isAuthenticated } = useAuth();
  
  useEffect(() => {
    // Check if we're returning from preview to edit
    if (isEditing) {
      setShowChatUI(true);
    }
  }, [id]);
  
  const handleSave = async (data: any) => {
    try {
      setSaving(true);
      
      // Store form data
      setFormData(data);
      
      // If user is authenticated, save to database
      if (isAuthenticated) {
        let conversationId = id;
        
        // If not editing, create a new conversation
        if (!isEditing) {
          const { data: newConversation, error } = await supabase
            .from("conversations")
            .insert({
              title: data.title || `${data.theme} Mystery`,
              mystery_data: data
            })
            .select()
            .single();
          
          if (error) {
            console.error("Error saving mystery:", error);
            toast.error("Failed to save mystery data");
          } else if (newConversation) {
            conversationId = newConversation.id;
          }
        } else {
          // Update existing conversation
          const { error } = await supabase
            .from("conversations")
            .update({
              title: data.title || `${data.theme} Mystery`,
              mystery_data: data,
              updated_at: new Date().toISOString()
            })
            .eq("id", id);
          
          if (error) {
            console.error("Error updating mystery:", error);
            toast.error("Failed to update mystery data");
          }
        }
        
        // Show the chat UI and set ID in URL if we have one
        setShowChatUI(true);
        if (conversationId && conversationId !== id) {
          navigate(`/mystery/edit/${conversationId}`, { replace: true });
        }
      } else {
        // For non-authenticated users, just show chat UI
        setShowChatUI(true);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error saving mystery:", error);
      toast.error(`Failed to ${isEditing ? "update" : "create"} mystery`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-1 py-12 px-4">
        <div className="container mx-auto max-w-4xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">
              {isEditing ? "Edit Mystery" : "Create New Mystery"}
            </h1>
            <p className="text-muted-foreground">
              {showChatUI 
                ? "Chat with our AI to refine your murder mystery" 
                : "Start your new mystery by selecting from the options below."}
            </p>
          </div>
          
          <Card>
            <CardContent className="p-6">
              {showChatUI ? (
                <div className="w-full h-full">
                  <StreamlitChatbot />
                </div>
              ) : (
                <MysteryForm 
                  onSave={handleSave}
                  isSaving={saving}
                />
              )}
            </CardContent>
          </Card>
          
          <div className="mt-8 text-center">
            <Button variant="outline" onClick={() => navigate("/dashboard")}>
              Back to Dashboard
            </Button>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default MysteryCreation;
