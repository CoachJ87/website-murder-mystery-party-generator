
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Send } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

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
    content: "Hello! I'm your AI development assistant. What would you like to build today?",
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

    // Simulate AI response after a delay
    setTimeout(() => {
      let response = "";
      
      if (input.toLowerCase().includes("app") || input.toLowerCase().includes("website")) {
        response = "I can help you build that! Let's start by defining the key features you want in your application.";
      } else if (input.toLowerCase().includes("button") || input.toLowerCase().includes("component")) {
        response = "I can create UI components for you. Would you like to see some sample code for this component?";
      } else if (input.toLowerCase().includes("help") || input.toLowerCase().includes("how")) {
        response = "To get started, just describe what you want to build. I'll help you design and code it step by step.";
      } else {
        response = "I understand. Let me help you implement that. Would you like me to explain how this would work or show you some sample code?";
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="w-full max-w-4xl mx-auto my-8 bg-card rounded-xl shadow-lg border overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-xl font-semibold">AI Chat</h2>
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
