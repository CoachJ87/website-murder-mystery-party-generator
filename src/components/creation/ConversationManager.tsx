import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { Message, FormValues } from "@/components/types";
import MysteryChat from "@/components/MysteryChat";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface ConversationManagerProps {
  conversationId: string | null;
  formData: FormValues | null;
  onSaveMessages: (message: Message) => Promise<void>;
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
  const [systemInstruction, setSystemInstruction] = useState<string | null>(null);
  const isMobile = useIsMobile();

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
        .from("conversations")
        .select("*, messages(*), system_instruction")
        .eq("id", id)
        .order("created_at", { ascending: true })
        .single();

      if (error) {
        console.error("Error loading messages:", error);
        toast.error("Failed to load conversation messages");
        return;
      }

      if (data) {
        console.log("Loaded messages:", data.messages?.length || 0);
        console.log("System instruction loaded:", !!data.system_instruction);
        
        if (data.system_instruction) {
          setSystemInstruction(data.system_instruction);
        }
        
        const formattedMessages = (data.messages || []).map((msg: any) => ({
          id: msg.id || `msg-${Date.now()}-${Math.random()}`,
          content: msg.content,
          is_ai: msg.role === "assistant",
          timestamp: new Date(msg.created_at || Date.now())
        }));
        
        formattedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        
        // Check if there's already an initial message about creating a mystery with a theme
        const hasInitialFormPrompt = formattedMessages.some(msg => 
          !msg.is_ai && msg.content.includes(`Let's create a murder mystery`)
        );
        
        setMessages(formattedMessages);
        
        if (formData && formData.additionalDetails && !hasInitialFormPrompt && 
            (!formattedMessages[0] || formattedMessages[0].is_ai)) {
          const initialUserMessage = constructInitialMessage(formData);
          if (initialUserMessage) {
            setMessages([initialUserMessage, ...formattedMessages]);
          }
        }
      } else {
        console.log("No messages found for conversation:", id);
        
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

  const constructInitialMessage = (data: FormValues): Message | null => {
    // Simplify the initial message to only include the theme
    let initialChatMessage = `Let's create a murder mystery`;
    if (data.theme) {
      initialChatMessage += ` with a ${data.theme} theme`;
    }
    // Remove other details to force the AI to ask for them
    initialChatMessage += ". Please guide me through creating this mystery step by step.";

    return {
      id: "initial-message",
      content: initialChatMessage,
      is_ai: false,
      timestamp: new Date(0),
    };
  };

  const handleSaveMessage = (message: Message) => {
    // Fix: Use onSaveMessages instead of onSave
    return onSaveMessages(message);
  };

  const createSystemMessage = (data: FormValues) => {
    // Start with a clear directive about one question at a time and MUST ask for player count first
    let systemMsg = "🚨 CRITICAL INSTRUCTION: You MUST ask ONLY ONE QUESTION at a time. After each user response, address only that response before moving to the next question. NEVER batch multiple questions or proceed without user input. 🚨\n\n";
    
    // Make player count request the absolute priority for first message
    systemMsg += "🚨 FIRST QUESTION REQUIRED: Your VERY FIRST question must be to ask how many players the user needs for their murder mystery. This is mandatory before proceeding with ANY other questions or content generation. 🚨\n\n";
    
    systemMsg += "This is a murder mystery creation conversation. ";
    
    // Only provide basic information about the theme as context
    if (data.theme) {
      systemMsg += `The user wants to create a murder mystery with theme: ${data.theme}. `;
    }
    
    systemMsg += "IMPORTANT: You must collect all necessary details from the user one step at a time. First, ask for the number of players needed. Then ask if an accomplice is needed. Only after collecting these details should you start developing characters and the mystery scenario.\n\n";
    
    // Include the full output format directly in the system message
    systemMsg += `\n\nYou MUST follow this exact output format for ALL your responses:

## OUTPUT FORMAT
Present your mystery preview in an engaging, dramatic format that will excite the user. Include:

# "[CREATIVE TITLE]" - A [THEME] MURDER MYSTERY

## PREMISE
[2-3 paragraphs setting the scene, describing the event where the murder takes place, and creating dramatic tension]

## VICTIM
**[Victim Name]** - [Vivid description of the victim, their role in the story, personality traits, and why they might have made enemies]

## CHARACTER LIST ([PLAYER COUNT] PLAYERS)
1. **[Character 1 Name]** - [Engaging one-sentence description including profession and connection to victim]
2. **[Character 2 Name]** - [Engaging one-sentence description including profession and connection to victim]
[Continue for all characters]

## MURDER METHOD
[Paragraph describing how the murder was committed, interesting details about the method, and what clues might be found]

[After presenting the mystery concept, ask if the concept works for them and explain that they can continue to make edits and that once they are done they can press the 'Generate Mystery' button where they can create a complete game package with detailed character guides, host instructions, and game materials if they choose to purchase.]`;

    // Add stronger instruction about player count again at the end
    systemMsg += "\n\n🚨 REMINDER: Your FIRST question to the user MUST be to ask how many players they need for their mystery. DO NOT generate ANY mystery content without knowing the player count. 🚨";
    
    return systemMsg;
  };

  return (
    <div className={cn(
      "w-full h-full", 
      isMobile && "h-[calc(100vh-90px)] mobile-borderless"
    )}>
      <MysteryChat
        initialTheme={formData?.theme || ""}
        initialPlayerCount={formData?.playerCount}
        initialHasAccomplice={formData?.hasAccomplice}
        initialScriptType={formData?.scriptType as 'full' | 'pointForm'}
        initialAdditionalDetails={formData?.additionalDetails}
        savedMysteryId={conversationId || undefined}
        onSave={handleSaveMessage}
        initialMessages={messages}
        isLoadingHistory={isLoadingHistory}
        systemInstruction={createSystemMessage(formData || {})}
        preventDuplicateMessages={false}
      />
    </div>
  );
};

export default ConversationManager;
