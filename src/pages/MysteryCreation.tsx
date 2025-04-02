
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import MysteryCreator from "@/components/MysteryCreator";
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const MysteryCreation = () => {
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  
  // Handle saving mystery
  const handleSave = async (messages: Message[]) => {
    try {
      setSaving(true);
      
      // Calculate a title based on the messages
      let title = "Untitled Mystery";
      const firstUserMessage = messages.find(m => m.role === "user");
      if (firstUserMessage) {
        const words = firstUserMessage.content.split(" ").slice(0, 4).join(" ");
        title = words + "...";
      }
      
      // In a real app, save to Supabase
      // const { data, error } = await supabase.from('mysteries').upsert({
      //   id: id || undefined,
      //   title,
      //   messages: JSON.stringify(messages),
      //   updated_at: new Date().toISOString(),
      //   created_at: id ? undefined : new Date().toISOString(),
      //   status: 'draft'
      // });
      
      // Simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast.success(`Mystery ${isEditing ? "updated" : "created"} successfully!`);
      
      // Redirect to dashboard after creating or to the preview page if enough messages
      if (messages.length >= 10) {
        navigate(`/mystery/preview/${id || "new"}`);
      } else if (!isEditing) {
        navigate("/dashboard");
      }
    } catch (error) {
      console.error("Error saving mystery:", error);
      toast.error(`Failed to ${isEditing ? "update" : "create"} mystery`);
    } finally {
      setSaving(false);
    }
  };

  // Get available themes
  const getRandomThemes = () => {
    const themes = [
      "1920s Speakeasy", "Hollywood Murder", "Castle Mystery", "Sci-Fi Mystery",
      "Art Gallery", "Luxury Train", "Mountain Resort"
    ];
    return themes[Math.floor(Math.random() * themes.length)];
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
              Use the AI to craft your perfect murder mystery. Start by selecting a theme or typing a prompt.
            </p>
          </div>
          
          <Card>
            <CardContent className="p-6">
              <MysteryCreator 
                onSave={handleSave}
                savedMysteryId={id}
                initialTheme={getRandomThemes()}
              />
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
