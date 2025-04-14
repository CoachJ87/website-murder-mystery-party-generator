
import { useState, useRef, useEffect } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useAutoResizeTextarea } from "@/components/hooks/use-auto-resize-textarea";
import SignInPrompt from "@/components/SignInPrompt";
import { supabase } from "@/lib/supabase";
import { getAIResponse } from "@/services/aiService";

const MAX_FREE_MESSAGES = 5;

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

type MysteryCreatorProps = {
  initialMessages?: Message[];
  onSave: (messages: Message[]) => void;
  savedMysteryId?: string;
  initialTheme?: string;
};

const MysteryCreator = ({ 
  initialMessages = [], 
  onSave,
  savedMysteryId,
  initialTheme = "",
}: MysteryCreatorProps) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [selectedTheme, setSelectedTheme] = useState(initialTheme);
  const [loading, setLoading] = useState(false);
  const [showSignInPrompt, setShowSignInPrompt] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { isAuthenticated, user } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 200,
  });
  const initialLoadComplete = useRef(false);

  const getDailyCredits = () => {
    const today = new Date().toISOString().split('T')[0];
    const storedData = localStorage.getItem('dailyCredits');
    
    if (!storedData) {
      return { date: today, remaining: MAX_FREE_MESSAGES };
    }
    
    const data = JSON.parse(storedData);
    if (data.date !== today) {
      return { date: today, remaining: MAX_FREE_MESSAGES };
    }
    
    return data;
  };

  const saveDailyCredits = (remaining: number) => {
    const today = new Date().toISOString().split('T')[0];
    localStorage.setItem('dailyCredits', JSON.stringify({
      date: today,
      remaining
    }));
  };
  
  const [remainingCredits, setRemainingCredits] = useState(getDailyCredits().remaining);
  
  useEffect(() => {
    const credits = getDailyCredits();
    setRemainingCredits(credits.remaining);
  }, []);

  const canSendMessage = isAuthenticated || remainingCredits > 0;

  useEffect(() => {
    const loadOrCreateConversation = async () => {
      if (!isAuthenticated || !user || !savedMysteryId || initialLoadComplete.current) return;
      
      try {
        const { data: existingConversation, error: fetchError } = await supabase
          .from("conversations")
          .select("*, messages(*)")
          .eq("mystery_id", savedMysteryId)
          .maybeSingle();
          
        if (fetchError && fetchError.code !== 'PGRST116') {
          console.error("Error fetching conversation:", fetchError);
          return;
        }
        
        if (existingConversation) {
          setConversationId(existingConversation.id);
          
          if (existingConversation.messages && existingConversation.messages.length > 0) {
            const formattedMessages = existingConversation.messages
              .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
              .map((msg: any) => ({
                id: msg.id,
                role: msg.is_ai ? "assistant" as const : "user" as const,
                content: msg.content,
                timestamp: new Date(msg.created_at)
              }));
              
            setMessages(formattedMessages);
          }
        } else if (savedMysteryId) {
          const { data: newConversation, error: createError } = await supabase
            .from("conversations")
            .insert({ 
              mystery_id: savedMysteryId,
              prompt_version: "free",
              user_id: user.id,
              is_completed: false
            })
            .select()
            .single();
            
          if (createError) {
            console.error("Error creating conversation:", createError);
            return;
          }
          
          setConversationId(newConversation.id);
        }
        
        initialLoadComplete.current = true;
      } catch (error) {
        console.error("Error loading conversation:", error);
      }
    };
    
    loadOrCreateConversation();
  }, [isAuthenticated, user, savedMysteryId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const decrementCredits = () => {
    if (!isAuthenticated) {
      const newCredits = remainingCredits - 1;
      setRemainingCredits(newCredits);
      saveDailyCredits(newCredits);
    }
  };

  const handleSubmit = async () => {
    if (!input.trim() || loading) return;
    
    if (!isAuthenticated && !canSendMessage) {
      setShowSignInPrompt(true);
      return;
    }
    
    if (!canSendMessage) {
      toast.error("You've used all your daily credits. Sign in or purchase to continue.");
      return;
    }
    
    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };
    
    setMessages(prev => [...prev, newUserMessage]);
    setInput("");
    adjustHeight(true);
    setLoading(true);
    
    try {
      if (isAuthenticated && conversationId) {
        await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            content: newUserMessage.content,
            is_ai: false,
            role: "user"
          });
      }
      
      const messagesForAI = messages.concat(newUserMessage).map(msg => ({
        is_ai: msg.role === "assistant",
        content: msg.content
      }));
      
      let aiResponseContent;
      try {
        aiResponseContent = await getAIResponse(messagesForAI, "free");
      } catch (error) {
        console.error("Error calling AI service:", error);
        aiResponseContent = generateMockResponse(input, messages.length, selectedTheme);
      }
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: aiResponseContent,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      if (isAuthenticated && conversationId) {
        await supabase
          .from("messages")
          .insert({
            conversation_id: conversationId,
            content: aiResponse.content,
            is_ai: true,
            role: "assistant"
          });
      }
      
      decrementCredits();
      
      onSave([...messages, newUserMessage, aiResponse]);
      
    } catch (error) {
      console.error("Error generating response:", error);
      toast.error("Failed to generate response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleThemeSelect = (theme: string) => {
    setSelectedTheme(theme);
    if (messages.length === 0) {
      setInput(`I want to create a murder mystery with a ${theme} theme.`);
      adjustHeight();
    }
  };

  const generateMockResponse = (userMessage: string, messageCount: number, theme: string) => {
    if (messageCount === 0) {
      return `Great choice! Let's develop a murder mystery with a ${theme || "intriguing"} theme. What's the setting or time period you'd like for this mystery?`;
    } else if (messageCount === 2) {
      return "That sounds perfect. Now, let's think about the victim. Who would be an interesting character to center the mystery around?";
    } else if (messageCount === 4) {
      return "Excellent! Now we need some suspects. Could you describe 2-3 potential suspects with interesting motives?";
    } else if (messageCount === 6) {
      return "Those are compelling suspects! Let's create a key piece of evidence that will be crucial to solving the mystery. What could it be?";
    } else if (messageCount === 8) {
      return "Your murder mystery is starting to take shape! To continue developing with more characters, plot twists, and detailed materials, please purchase the full package for $4.99.";
    } else {
      return "I understand. Let's continue developing your mystery. " + userMessage.split(" ").slice(0, 3).join(" ") + " is an interesting direction. Can you elaborate more on what you're looking for?";
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Mystery Creator</h2>
        <Badge variant={remainingCredits > 2 ? "default" : "destructive"}>
          {isAuthenticated ? "Premium" : `${remainingCredits}/${MAX_FREE_MESSAGES} daily credits`}
        </Badge>
      </div>
      
      {messages.length === 0 && (
        <div className="mb-6">
          <p className="text-muted-foreground mb-3">Select a theme to get started:</p>
          <div className="flex flex-wrap gap-2">
            {["1920s Speakeasy", "Hollywood Murder", "Castle Mystery", "Sci-Fi Mystery", "Art Gallery"].map((theme) => (
              <Button
                key={theme}
                variant={selectedTheme === theme ? "default" : "outline"}
                size="sm"
                onClick={() => handleThemeSelect(theme)}
              >
                {theme}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-background/50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>Start creating your murder mystery by selecting a theme and sending your first message.</p>
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
          disabled={loading || !canSendMessage}
        />
        <Button
          size="icon"
          className="absolute right-2 bottom-2"
          onClick={handleSubmit}
          disabled={!input.trim() || loading || !canSendMessage}
        >
          {loading ? (
            <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ArrowRight className="h-4 w-4" />
          )}
        </Button>
      </div>
      
      {!canSendMessage && !isAuthenticated && (
        <p className="text-destructive text-sm mt-2">
          You've used all your daily credits. Sign in or purchase to continue.
        </p>
      )}
      
      <div className="mt-4 flex justify-end">
        <Button onClick={() => onSave(messages)}>
          Generate Mystery
        </Button>
      </div>

      <SignInPrompt 
        isOpen={showSignInPrompt} 
        onClose={() => setShowSignInPrompt(false)} 
      />
    </div>
  );
};

export default MysteryCreator;
