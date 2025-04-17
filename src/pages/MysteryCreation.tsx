import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import MysteryForm from "@/components/MysteryForm";
import MysteryChat from "@/components/MysteryChat";
import { useAuth } from "@/context/AuthContext";
import { Message, FormValues } from "@/components/types";

const MysteryCreation = () => {
  const [saving, setSaving] = useState(false);
  const [showChatUI, setShowChatUI] = useState(false);
  const [formData, setFormData] = useState<FormValues | null>(null);
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = !!id;
  const { isAuthenticated, user } = useAuth();

  useEffect(() => {
    if (isEditing) {
      setShowChatUI(true);
    }
  }, [id]);

  const handleSave = async (data: FormValues) => {
    try {
      setSaving(true);

      await new Promise<void>((resolve) => {
        setFormData(data);
        resolve();
      });

      if (isAuthenticated && user) {
        let conversationId = id;

        if (!isEditing) {
          const { data: newConversation, error } = await supabase
            .from("conversations")
            .insert({
              title: data.title || `${data.theme} Mystery`,
              mystery_data: data,
              user_id: user.id,
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
          const { error } = await supabase
            .from("conversations")
            .update({
              title: data.title || `${data.theme} Mystery`,
              mystery_data: data,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);

          if (error) {
            console.error("Error updating mystery:", error);
            toast.error("Failed to update mystery data");
          }
        }

        setShowChatUI(true);
        if (conversationId && conversationId !== id) {
          navigate(`/mystery/edit/${conversationId}`, { replace: true });
        }
      } else {
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

  const handleSaveMessages = async (messages: Message[]) => {
    if (messages.length > 0) {
      const latestThemeMessage = messages.find(m => m.content.includes("theme"));
      if (latestThemeMessage) {
        const extractedTheme = latestThemeMessage.content.split("theme").pop()?.trim().replace(".", "");
        if (extractedTheme) {
          await new Promise<void>((resolve) => {
            setFormData(prevData => {
              if (prevData) {
                return { ...prevData, theme: extractedTheme };
              }
              return prevData;
            });
            resolve();
          });
        }
      }
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
                  <MysteryChat
                    initialTheme={formData?.theme || ""}
                    savedMysteryId={id}
                    onSave={handleSaveMessages}
                  />
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
