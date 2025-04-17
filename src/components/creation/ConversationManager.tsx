
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
        
        // Sort messages by timestamp to ensure proper order
        formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        setMessages(formattedMessages);
        
        // If there's form data and first message is from user, ensure it's included in the history
        if (formData && formData.additionalDetails && (!formattedMessages[0] || formattedMessages[0].is_ai)) {
          const initialUserMessage = constructInitialMessage(formData);
          if (initialUserMessage) {
            setMessages([initialUserMessage, ...formattedMessages]);
          }
        }
      } else {
        console.log("No messages found for conversation:", id);
        
        // If no messages but we have form data, construct the initial message
        if (formData) {
          const initialUserMessage = constructInitialMessage(formData);
          if (initialUserMessage) {
            setMessages([initialUserMessage]);
          }
        }
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to load conversation");
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Helper to construct the initial message from form data
  const constructInitialMessage = (data: FormValues): Message | null => {
    let initialChatMessage = `Let's create a murder mystery`;
    if (data.theme) {
      initialChatMessage += ` with a ${data.theme} theme`;
    }
    if (data.playerCount) {
      initialChatMessage += ` for ${data.playerCount} players`;
    }
    if (data.hasAccomplice !== undefined) {
      initialChatMessage += data.hasAccomplice ? `, including an accomplice` : `, without an accomplice`;
    }
    if (data.scriptType) {
      initialChatMessage += ` with ${data.scriptType} scripts`;
    }
    if (data.additionalDetails) {
      initialChatMessage += `. Additional details: ${data.additionalDetails}`;
    }
    initialChatMessage += ".";

    return {
      id: "initial-message",
      content: initialChatMessage,
      is_ai: false,
      timestamp: new Date(0), // Use oldest possible date to ensure it's first
    };
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
