
import { useState, useRef, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";
import { supabase } from "@/lib/supabase";
import { getAIResponse } from "@/services/aiService";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type MysteryChatProps = {
  initialTheme?: string;
  onSave: (messages: Message[]) => void;
  savedMysteryId?: string;
};

const MysteryChat = ({ 
  initialTheme = "",
  onSave,
  savedMysteryId,
}: MysteryChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 200,
  });
  
  // Fetch initial mystery data and prompts
  useEffect(() => {
    const fetchMysteryData = async () => {
      if (savedMysteryId) {
        const { data, error } = await supabase
          .from("conversations")
          .select("mystery_data")
          .eq("id", savedMysteryId)
          .single();
        
        if (!error && data && data.mystery_data) {
          // Safely access the mystery data with type checking
          const mysteryData = typeof data.mystery_data === 'object' ? data.mystery_data : {};
          
          // Use optional chaining and nullish coalescing for safe access
          const formattedPrompt = `I want to create a murder mystery with these details:
- Theme: ${(mysteryData as any)?.theme || initialTheme || 'Mystery Theme'}
- Number of players: ${(mysteryData as any)?.playerCount || 8}
- Include an accomplice: ${(mysteryData as any)?.hasAccomplice ? 'Yes' : 'No'}
- Script style: ${(mysteryData as any)?.scriptType === 'full' ? 'Full scripts' : 'Point form summaries'}
${(mysteryData as any)?.additionalDetails ? `- Additional details: ${(mysteryData as any).additionalDetails}` : ''}

Help me develop this murder mystery. What setting would work well with this theme?`;
          
          setInitialPrompt(formattedPrompt);
        }
      }
    };
    
    // Also fetch the free prompt from the database
    const fetchFreePrompt = async () => {
      const { data, error } = await supabase
        .from("prompts")
        .select("content")
        .eq("name", "murder_mystery_free")
        .single();
        
      if (error) {
        console.error("Error fetching free prompt:", error);
      }
      
      if (data && data.content) {
        console.log("Using prompt from database:", data.content.substring(0, 50) + "...");
      }
    };
    
    fetchMysteryData();
    fetchFreePrompt();
  }, [savedMysteryId, initialTheme]);

  // Initialize chat with form data
  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: initialPrompt,
        timestamp: new Date(),
      };
      
      setMessages([userMessage]);
      
      // Immediately get AI response to the initial prompt
      handleAnthropicRequest(initialPrompt);
    }
  }, [initialPrompt]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Function to call the Edge Function via aiService
  const handleAnthropicRequest = async (userInput: string) => {
    setLoading(true);
    
    try {
      // Get existing messages for context
      const contextMessages = messages.map(msg => ({
        is_ai: msg.role === "assistant",
        content: msg.content
      }));
      
      // Add the current user input
      const allMessages = [...contextMessages, { is_ai: false, content: userInput }];
      
      // Use the aiService to call the Edge Function
      const promptVersion = isAuthenticated ? "paid" : "free";
      const aiResponseText = await getAIResponse(allMessages, promptVersion);
      
      // Add the AI response to the messages
      const aiResponse: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: aiResponseText,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Save to database if authenticated and have a conversation ID
      if (isAuthenticated && savedMysteryId && user) {
        await saveMessageToDatabase({
          conversation_id: savedMysteryId,
          content: aiResponseText,
          is_ai: true,
          role: "assistant"
        });
      }
    } catch (error) {
      console.error("Error with AI request:", error);
      toast.error("Failed to get response from AI. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const saveMessageToDatabase = async (messageData: any) => {
    try {
      const { error } = await supabase
        .from("messages")
        .insert(messageData);
        
      if (error) {
        console.error("Error saving message to database:", error);
      }
    } catch (error) {
      console.error("Error in saveMessageToDatabase:", error);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    
    // Save user message to database if authenticated
    if (isAuthenticated && savedMysteryId && user) {
      await saveMessageToDatabase({
        conversation_id: savedMysteryId,
        content: input,
        is_ai: false,
        role: "user"
      });
    }
    
    const currentInput = input;
    setInput("");
    adjustHeight(true);
    
    // Get AI response
    await handleAnthropicRequest(currentInput);
  };

  const handleGenerateMystery = () => {
    if (messages.length < 3) {
      toast.warning("Please chat a bit more to develop your mystery further.");
      return;
    }
    
    onSave(messages);
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Mystery Creator AI</h2>
        <Badge variant="outline">
          {isAuthenticated ? "Premium" : "Free Preview"}
        </Badge>
      </div>
      
      {/* Messages container */}
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-background/50 min-h-[400px] max-h-[500px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>Start creating your murder mystery by sending your first message.</p>
          </div>
        ) : (
          messages.map((message) => (
            <Card key={message.id} className={`max-w-[80%] ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto"}`}>
              <CardContent className="p-4">
                <p>{message.content}</p>
                <div className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Input area */}
      <div className="relative">
        <Textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            adjustHeight();
          }}
          placeholder="Type your message..."
          className="resize-none pr-12"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          disabled={loading}
        />
        <Button
          size="icon"
          className="absolute right-2 bottom-2"
          onClick={handleSubmit}
          disabled={!input.trim() || loading}
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      <div className="mt-4 flex justify-end">
        <Button onClick={handleGenerateMystery} disabled={messages.length < 3}>
          Generate Mystery
        </Button>
      </div>
    </div>
  );
};

export default MysteryChat;
