
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
  const { isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 200,
  });
  
  useEffect(() => {
    scrollToBottom();
    if (initialTheme && messages.length === 0) {
      // Initialize chat with AI greeting based on theme
      const initialMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Let's create a murder mystery with a ${initialTheme} theme! What kind of setting would you like for this mystery?`,
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
    }
  }, [initialTheme]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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
    setInput("");
    adjustHeight(true);
    setLoading(true);
    
    try {
      // In a real implementation, this would call your AI service
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: generateMockResponse(input, messages.length, initialTheme),
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error generating response:", error);
      toast.error("Failed to generate response. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMystery = () => {
    if (messages.length < 3) {
      toast.warning("Please chat a bit more to develop your mystery further.");
      return;
    }
    
    onSave(messages);
  };

  // Mock AI response generation - in a real app, this would be your AI service
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
      return "Your murder mystery is starting to take great shape! Would you like to generate the full mystery package now, or continue developing more details?";
    } else {
      return "I understand. Let's continue refining your mystery. " + userMessage.split(" ").slice(0, 3).join(" ") + " is an interesting direction. Can you elaborate more on what you're looking for?";
    }
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
