
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
import MysteryChat from "@/components/MysteryChat";
import StreamlitChatbot from "@/components/StreamlitChatbot";

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
  const [messages, setMessages] = useState<Message[]>([]);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  useEffect(() => {
    // Check if we're returning from preview to edit
    // In a real app, you would load the chat history from Supabase/API here
    if (isEditing) {
      setShowChatUI(true);
      // Mock loading messages if returning to edit
      // You would replace this with actual data fetching
      const loadedMessages = localStorage.getItem(`mystery_messages_${id}`);
      if (loadedMessages) {
        setMessages(JSON.parse(loadedMessages));
      } else {
        // If no messages found, initialize with a welcome message
        setMessages([
          {
            id: '1',
            role: 'assistant',
            content: `Let's continue editing your mystery. What would you like to change?`,
            timestamp: new Date()
          }
        ]);
      }
    }
  }, [id]);
  
  const handleSave = async (data: any) => {
    try {
      setSaving(true);
      
      setFormData(data);
      setShowChatUI(true);
      
      // If this is a new mystery, set initial message
      if (!isEditing && messages.length === 0) {
        setMessages([
          {
            id: Date.now().toString(),
            role: "assistant",
            content: `Let's create a murder mystery with a ${data.theme} theme! What kind of setting would you like for this mystery?`,
            timestamp: new Date()
          }
        ]);
      }
      
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error("Error saving mystery:", error);
      toast.error(`Failed to ${isEditing ? "update" : "create"} mystery`);
    } finally {
      setSaving(false);
    }
  };
  
  const handleChatComplete = (updatedMessages: Message[]) => {
    // Save chat messages to localStorage for persistence between sessions
    // In a real app, you would save this to your database
    localStorage.setItem(`mystery_messages_${id || "new"}`, JSON.stringify(updatedMessages));
    
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
