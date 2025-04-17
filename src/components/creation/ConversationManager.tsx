
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Message, FormValues } from "@/components/types";
import MysteryChat from "@/components/MysteryChat";

interface ConversationManagerProps {
  conversationId: string | null;
  formData: FormValues | null;
  onSaveMessages: (messages: Message[]) => Promise<void>;
  userId: string | undefined;
  isEditing: boolean;
}

export const ConversationManager = ({
  conversationId,
  formData,
  onSaveMessages,
  userId,
  isEditing
}: ConversationManagerProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  useEffect(() => {
    if (conversationId && !initialDataLoaded) {
      loadExistingConversation(conversationId);
      setInitialDataLoaded(true);
    }
  }, [conversationId, initialDataLoaded, isEditing]);

  const loadExistingConversation = async (id: string) => {
    try {
      console.log("Loading conversation with ID:", id);
      setIsLoadingHistory(true);
      
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading messages:", error);
        toast.error("Failed to load conversation messages");
        return;
      }

      if (data && data.length > 0) {
        console.log("Loaded messages:", data.length);
        const formattedMessages = data.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          is_ai: msg.role === "assistant",
          timestamp: new Date(msg.created_at)
        }));
        setMessages(formattedMessages);
      } else {
        console.log("No messages found for conversation:", id);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load conversation");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <div className="w-full h-full">
      <MysteryChat
        initialTheme={formData?.theme || ""}
        initialPlayerCount={formData?.playerCount}
        initialHasAccomplice={formData?.hasAccomplice}
        initialScriptType={formData?.scriptType}
        initialAdditionalDetails={formData?.additionalDetails}
        savedMysteryId={conversationId || undefined}
        onSave={onSaveMessages}
        initialMessages={messages}
        isLoadingHistory={isLoadingHistory}
      />
    </div>
  );
};
