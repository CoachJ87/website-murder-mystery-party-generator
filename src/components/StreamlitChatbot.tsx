
import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { AIInputWithLoading } from "@/components/ui/ai-input-with-loading";
import { MessageCircle } from "lucide-react";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
};

const StreamlitChatbot = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with a welcome message
    if (messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          role: "assistant",
          content: "Welcome to the Murder Mystery Creator! Describe the type of mystery you'd like to create, or ask me for suggestions.",
          timestamp: new Date(),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    
    try {
      // Call Streamlit backend API
      const response = await fetch("https://murder-mystery-chatbot-ktzf8u5kjbbusakesbyecg.streamlit.app/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: content,
          history: messages.map(msg => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      });
      
      // If the API doesn't respond or isn't available, use fallback response
      if (!response.ok) {
        throw new Error("Failed to get response from Streamlit API");
      }
      
      const data = await response.json();
      
      // Add assistant response
      const assistantMessage: Message = {
        id: Date.now().toString() + "-assistant",
        role: "assistant",
        content: data.response || "I'm thinking about your mystery... Let's develop this further. What specific theme or setting interests you?",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error connecting to Streamlit API:", error);
      
      // Fallback response if API call fails
      const fallbackMessage: Message = {
        id: Date.now().toString() + "-fallback",
        role: "assistant",
        content: "I'm thinking about your mystery... Let's develop this further. What specific theme or setting interests you?",
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, fallbackMessage]);
      
      // Optional: Inform user of connection issue
      toast.info("Using offline mode - some features may be limited");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMystery = () => {
    // Save messages to localStorage for persistence between pages
    localStorage.setItem(`mystery_messages_${new Date().getTime()}`, JSON.stringify(messages));
    toast.success("Mystery generated successfully!");
    navigate(`/mystery/preview/${new Date().getTime()}`); // Using timestamp as mock ID
  };

  return (
    <div className="flex flex-col space-y-6">
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-lg">Murder Mystery Creator</h3>
        </div>
        
        <div className="h-[400px] overflow-y-auto pr-2 mb-4">
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
        
        <div className="mt-4">
          <AIInputWithLoading
            value={input}
            setValue={setInput}
            placeholder="Type your ideas for the murder mystery..."
            onSubmit={handleUserMessage}
            loadingDuration={2000}
          />
        </div>
      </Card>

      <div className="flex flex-col md:flex-row justify-between gap-4">
        <p className="text-muted-foreground text-sm">
          When you're satisfied with your mystery, generate the preview to continue.
        </p>
        <Button 
          onClick={handleGenerateMystery} 
          className="self-end"
          disabled={messages.length < 3}
        >
          Generate Mystery Preview
        </Button>
      </div>
    </div>
  );
};

export default StreamlitChatbot;
