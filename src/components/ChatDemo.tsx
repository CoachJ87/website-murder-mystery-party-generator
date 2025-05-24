
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import { supabase } from "@/lib/supabase";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const initialMessages: Message[] = [
  {
    id: "1",
    role: "assistant",
    content: "Hello! I'm your AI development assistant. Let me help you create a murder mystery. How many players do you want for your murder mystery?",
    timestamp: new Date(),
  },
];

const ChatDemo = () => {
  const { isAuthenticated, isPublic, setIsPublic } = useAuth();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      console.log("Calling mystery-ai function with messages:", [...messages, userMessage]);
      
      // Call the mystery-ai edge function
      const { data, error } = await supabase.functions.invoke('mystery-ai', {
        body: {
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }
      });

      console.log("Supabase function response:", { data, error });

      if (error) {
        console.error("Supabase function error:", error);
        throw new Error(`Function call failed: ${error.message}`);
      }

      let responseContent = "I'm having trouble responding right now. Please try again.";
      
      if (data?.choices?.[0]?.message?.content) {
        responseContent = data.choices[0].message.content;
      } else if (data?.error) {
        console.error("API error in response:", data.error);
        responseContent = "I'm experiencing some technical difficulties. How many players do you want for your murder mystery?";
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: responseContent,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error in handleSendMessage:", error);
      
      // Fallback response
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "I'm having trouble connecting right now. How many players do you want for your murder mystery?",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 bg-card rounded-xl shadow-lg border overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">Murder Mystery Creator</h2>
        <div className="flex items-center space-x-2">
          <Switch 
            id="public-mode" 
            checked={isPublic}
            onCheckedChange={setIsPublic}
            disabled={!isAuthenticated}
          />
          <Label htmlFor="public-mode">
            {isPublic ? "Public" : "Private"}
          </Label>
        </div>
      </div>
      
      <div className="h-[400px] overflow-y-auto p-4 flex flex-col space-y-4 bg-secondary/30">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={message.role === "user" ? "user-bubble" : "assistant-bubble"}
          >
            <p>{message.content}</p>
            <div className="text-xs opacity-70 mt-1">
              {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="assistant-bubble">
            <div className="flex space-x-2">
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSendMessage} className="p-4 border-t flex items-center space-x-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          disabled={isLoading || (!isAuthenticated && !isPublic)}
          className="flex-1"
        />
        <Button type="submit" disabled={isLoading || (!isAuthenticated && !isPublic)}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
      
      {!isAuthenticated && !isPublic && (
        <div className="p-2 bg-muted text-center text-sm">
          <span>Please <Button variant="link" asChild className="p-0 h-auto font-semibold"><Link to="/sign-in">sign in</Link></Button> to use private mode</span>
        </div>
      )}
    </div>
  );
};

export default ChatDemo;
