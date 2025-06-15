import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AIInputWithLoading } from "@/components/ui/ai-input-with-loading";
import { MessageCircle, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const VercelChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [chatbotToken, setChatbotToken] = useState<string | null>(null);
  const [chatbotUrl, setChatbotUrl] = useState<string | null>(null);
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user, isAuthenticated } = useAuth();
  const { id } = useParams();
  const initialDataLoaded = useRef(false);
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Load or create conversation
  useEffect(() => {
    const loadOrCreateConversation = async () => {
      if (initialDataLoaded.current) return;
      
      try {
        // If we have an ID from URL params, load that conversation
        if (id && id !== "new") {
          // Validate if ID is a valid UUID before querying
          const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
          
          if (!uuidRegex.test(id)) {
            console.error("Invalid conversation ID format");
            toast.error(t("chatbot.toasts.invalidId"));
            return;
          }
          
          const { data: existingConversation, error: fetchError } = await supabase
            .from("conversations")
            .select("*, messages(*)")
            .eq("id", id)
            .single();
          
          if (fetchError) {
            console.error("Error fetching conversation:", fetchError);
            toast.error(t("chatbot.toasts.loadFailed"));
          } else if (existingConversation) {
            setConversationId(existingConversation.id);
            
            // If there are messages in the conversation, load them
            if (existingConversation.messages && existingConversation.messages.length > 0) {
              // Convert the messages from database format to our Message type
              const formattedMessages = existingConversation.messages.map((msg: any) => ({
                id: msg.id,
                role: msg.role,
                content: msg.content,
                timestamp: new Date(msg.created_at)
              }));
              
              setMessages(formattedMessages);
              initialDataLoaded.current = true;
              return;
            }
          }
        }
        
        // Initialize with a welcome message if no messages were loaded
        if (messages.length === 0) {
          const welcomeMessage = {
            id: "welcome",
            role: "assistant" as const,
            content: t("chatbot.welcomeMessage"),
            timestamp: new Date(),
          };
          
          setMessages([welcomeMessage]);
          
          // If user is authenticated, save this initial conversation
          if (isAuthenticated && user) {
            try {
              // First ensure the user has a profile
              const { error: profileError } = await supabase
                .from("profiles")
                .upsert({ id: user.id, updated_at: new Date().toISOString() })
                .select();
                
              if (profileError) {
                console.error("Error upserting profile:", profileError);
              }
              
              // Then create the conversation
              const { data: newConversation, error: createError } = await supabase
                .from("conversations")
                .insert({
                  user_id: user.id,
                  title: t("chatbot.newConversationTitle")
                })
                .select()
                .single();
                
              if (createError) {
                console.error("Error creating conversation:", createError);
              } else if (newConversation) {
                setConversationId(newConversation.id);
                
                // Save welcome message
                await supabase
                  .from("messages")
                  .insert({
                    conversation_id: newConversation.id,
                    role: welcomeMessage.role,
                    content: welcomeMessage.content
                  });
              }
            } catch (err) {
              console.error("Error in conversation creation:", err);
            }
          }
        }
        
        initialDataLoaded.current = true;
      } catch (error) {
        console.error("Error in loadOrCreateConversation:", error);
      }
    };

    // Generate chatbot token if authenticated
    const generateToken = async () => {
      if (!isAuthenticated || !user) return;
      
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !sessionData.session) {
          console.error("Error getting session:", sessionError);
          return;
        }

        const accessToken = sessionData.session?.access_token;
        console.log("Making request to generate chatbot token");
        
        // Use the fully qualified URL with project ID
        const response = await fetch("https://mhfikaomkmqcndqfohbp.functions.supabase.co/generate-chatbot-token", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to generate chatbot token: ${response.status} ${errorText}`);
        }

        const tokenData = await response.json();
        setChatbotToken(tokenData.token);
        setChatbotUrl(tokenData.url);
        console.log("Chatbot token generated successfully");
      } catch (error) {
        console.error("Error generating chatbot token:", error);
      }
    };

    if (isAuthenticated) {
      loadOrCreateConversation();
      generateToken();
    }
  }, [id, isAuthenticated, user, messages.length, t]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Save message to database
  const saveMessage = async (message: Message) => {
    if (!isAuthenticated || !conversationId) return;
    
    try {
      await supabase
        .from("messages")
        .insert({
          conversation_id: conversationId,
          role: message.role,
          content: message.content
        });
    } catch (error) {
      console.error("Error saving message:", error);
    }
  };

  const handleUserMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    // Save user message to database
    await saveMessage(userMessage);
    
    try {
      // Call Vercel chatbot API
      let assistantContent = "";
      
      try {
        if (!chatbotToken) {
          // Regenerate token if not available
          if (isAuthenticated) {
            const { data: sessionData } = await supabase.auth.getSession();
            const accessToken = sessionData.session?.access_token;
            
            if (accessToken) {
              const response = await fetch("https://mhfikaomkmqcndqfohbp.functions.supabase.co/generate-chatbot-token", {
                method: "GET",
                headers: {
                  "Content-Type": "application/json",
                  "Authorization": `Bearer ${accessToken}`
                }
              });

              if (response.ok) {
                const tokenData = await response.json();
                setChatbotToken(tokenData.token);
              }
            }
          }
        }
        
        // Get your Vercel API endpoint
        const vercelApiUrl = "https://my-awesome-chatbot-nine-sand.vercel.app/api/chat";
        
        const response = await fetch(vercelApiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": chatbotToken ? `Bearer ${chatbotToken}` : "",
          },
          body: JSON.stringify({
            id: conversationId || generateId(),
            messages: messages.concat(userMessage).map(msg => ({
              id: msg.id,
              role: msg.role,
              parts: [{ text: msg.content }],
            })),
            selectedChatModel: "gpt-4",
            isMurderMystery: true,
          }),
        });
        
        // If the API doesn't respond or isn't available, use fallback response
        if (!response.ok) {
          console.error("Vercel API error status:", response.status);
          const errorText = await response.text();
          console.error("Vercel API error:", errorText);
          throw new Error(`Failed to get response from Vercel API: ${response.status}`);
        }
        
        const data = await response.json();
        console.log("Vercel API response:", data);
        
        // Extract assistant response based on the API response format
        if (data.answer && data.answer.parts && data.answer.parts.length > 0) {
          assistantContent = data.answer.parts[0].text;
        } else if (data.message) {
          assistantContent = data.message;
        } else if (data.response) {
          assistantContent = data.response;
        } else {
          assistantContent = generateFallbackResponse(content, messages.length);
        }
        
        // Update conversation ID if new
        if (data.conversationId && !conversationId) {
          setConversationId(data.conversationId);
        }
        
      } catch (error) {
        console.error("Error connecting to Vercel API:", error);
        
        // Fallback response if API call fails
        assistantContent = generateFallbackResponse(content, messages.length);
        
        // Inform user of connection issue
        toast.info(t("chatbot.toasts.offlineMode"));
      }
      
      // Add assistant response
      const assistantMessage: Message = {
        id: Date.now().toString() + "-assistant",
        role: "assistant",
        content: assistantContent,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Save assistant message to database
      await saveMessage(assistantMessage);
    } catch (error) {
      console.error("Error processing message:", error);
      toast.error(t("chatbot.toasts.requestError"));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMystery = () => {
    // Save messages to localStorage as a backup
    if (conversationId) {
      localStorage.setItem(`mystery_messages_${conversationId}`, JSON.stringify(messages));
    } else {
      localStorage.setItem(`mystery_messages_${new Date().getTime()}`, JSON.stringify(messages));
    }
    
    toast.success(t("chatbot.toasts.generationSuccess"));
    navigate(`/mystery/preview/${conversationId || new Date().getTime()}`);
  };
  
  const openChatbotInNewWindow = () => {
    if (chatbotUrl) {
      window.open(chatbotUrl, '_blank', 'noopener,noreferrer');
    } else {
      toast.error(t("chatbot.toasts.urlUnavailable"));
    }
  };

  // Generate fallback responses when API is unavailable
  const generateFallbackResponse = (userMessage: string, messageCount: number) => {
    const fallbackResponses = t<string, string[]>('chatbot.fallbackResponses', { returnObjects: true });
    if (messageCount <= 1) {
      return fallbackResponses[0];
    } else if (messageCount <= 3) {
      return fallbackResponses[1];
    } else if (messageCount <= 5) {
      return fallbackResponses[2];
    } else if (messageCount <= 7) {
      return fallbackResponses[3];
    } else {
      return fallbackResponses[4];
    }
  };

  // Helper function to generate IDs
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  // Calculate dynamic height based on number of messages
  const getMessagesHeight = () => {
    const baseHeight = 400;
    const additionalHeight = Math.min(messages.length * 30, 300); // Increased max height
    return baseHeight + additionalHeight;
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className={cn("text-xl font-semibold", isMobile && "text-lg")}>{t("chatbot.title")}</h2>
        <div className="flex gap-2">
          {chatbotUrl && (
            <Button variant="outline" onClick={openChatbotInNewWindow} size={isMobile ? "sm" : "default"}>
              <ExternalLink className={cn("mr-2", isMobile ? "h-3 w-3" : "h-4 w-4")} />
              {isMobile ? t("chatbot.buttons.external") : t("chatbot.buttons.openFull")}
            </Button>
          )}
          <Button 
            onClick={handleGenerateMystery} 
            disabled={messages.length < 3}
            size={isMobile ? "sm" : "default"}
          >
            {t("chatbot.buttons.finalize")}
          </Button>
        </div>
      </div>
      
      <Card className={cn("p-4", isMobile && "p-2 border-0 shadow-none bg-transparent")}>
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-lg">{t("chatbot.creatorTitle")}</h3>
        </div>
        
        <div 
          className={cn(
            "overflow-y-auto pr-2 mb-4",
            isMobile && "mobile-full-height"
          )}
          style={{ height: isMobile ? 'calc(100vh - 180px)' : `${getMessagesHeight()}px` }}
        >
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-4 p-3 rounded-lg ${
                message.role === "user"
                  ? "bg-primary text-primary-foreground ml-auto max-w-[80%] text-right"
                  : "bg-muted max-w-[80%]"
              }`}
            >
              <p>{message.content}</p>
              <div className="text-xs opacity-70 mt-1">
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          ))}
          {loading && (
            <div className="bg-muted p-3 rounded-lg max-w-[80%] animate-pulse">
              <div className="flex space-x-2">
                <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="h-2 w-2 bg-current rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        
        <div className={cn("mt-4", isMobile && "mt-2")}>
          <AIInputWithLoading
            value={input}
            setValue={setInput}
            placeholder={t("chatbot.placeholder")}
            onSubmit={handleUserMessage}
            loadingDuration={2000}
          />
        </div>
      </Card>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <p className={cn("text-muted-foreground text-sm", isMobile && "text-xs")}>
          {t("chatbot.finalizePrompt")}
        </p>
        <Button 
          onClick={handleGenerateMystery} 
          className="self-end"
          disabled={messages.length < 3}
          size={isMobile ? "sm" : "default"}
        >
          {t("chatbot.buttons.finalizeMystery")}
        </Button>
      </div>
    </div>
  );
};

export default VercelChatbot;
