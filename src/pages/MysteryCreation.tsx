
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import MysteryForm from "@/components/MysteryForm";
import MysteryChat from "@/components/MysteryChat";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const MysteryCreation = () => {
  const [saving, setSaving] = useState(false);
  const [showChatUI, setShowChatUI] = useState(false);
  const [formData, setFormData] = useState<any>(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  const handleSave = async (data: any) => {
    try {
      setSaving(true);
      
      setFormData(data);
      setShowChatUI(true);
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error saving mystery:", error);
      toast.error(`Failed to ${isEditing ? "update" : "create"} mystery`);
    } finally {
      setSaving(false);
    }
  };
  
  const handleChatComplete = (messages: Message[]) => {
    toast.success(`Mystery ${isEditing ? "updated" : "created"} successfully!`);
    navigate(`/mystery/preview/${id || "new"}`);
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
                <MysteryChat
                  initialTheme={formData?.theme || ""}
                  onSave={handleChatComplete}
                  savedMysteryId={id}
                />
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
