
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
      
      const { data: conversationData, error: convError } = await supabase
        .from("conversations")
        .select("*, messages(*)")
        .eq("id", id)
        .single();

      if (convError) {
        console.error("Error loading conversation:", convError);
        toast.error("Failed to load conversation");
        return;
      }

      if (conversationData) {
        const messages = conversationData.messages || [];
        const formattedMessages = messages.map((msg: any) => ({
          id: msg.id,
          content: msg.content,
          is_ai: msg.role === "assistant",
          timestamp: new Date(msg.created_at)
        }));

        // If this is an existing conversation but no messages exist,
        // let's add the initial form data as the first message
        if (formattedMessages.length === 0 && formData) {
          const initialMessage = {
            id: 'initial-' + Date.now(),
            content: `Let's create a murder mystery with a ${formData.theme} theme` +
                    `${formData.playerCount ? ` for ${formData.playerCount} players` : ''}` +
                    `${formData.hasAccomplice !== undefined ? formData.hasAccomplice ? ' with an accomplice' : ' without an accomplice' : ''}` +
                    `${formData.scriptType ? ` with ${formData.scriptType} scripts` : ''}` +
                    `${formData.additionalDetails ? `. Additional details: ${formData.additionalDetails}` : ''}.`,
            is_ai: false,
            timestamp: new Date()
          };
          formattedMessages.push(initialMessage);
        }

        console.log("Loaded messages:", formattedMessages.length);
        setMessages(formattedMessages);
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
