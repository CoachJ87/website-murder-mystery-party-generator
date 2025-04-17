
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { getAIResponse } from "@/services/aiService";
import ReactMarkdown from 'react-markdown';
import { Message } from "@/components/types";

interface MysteryChatProps {
  initialTheme?: string;
  savedMysteryId?: string;
  onSave?: (messages: Message[]) => void;
}

const MysteryChat = ({ initialTheme = "", savedMysteryId, onSave }: MysteryChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // If we have an initial theme, start the conversation with it
    if (initialTheme) {
      const initialMessage: Message = {
        id: Date.now().toString(),
        content: `Let's create a murder mystery with a ${initialTheme} theme.`,
        is_ai: false,
        timestamp: new Date(),
      };
      setMessages([initialMessage]);
      handleAIResponse(initialMessage.content);
    }
  }, [initialTheme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input.trim(),
      is_ai: false,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    await handleAIResponse(userMessage.content);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event as unknown as React.FormEvent);
    }
  };

  const handleAIResponse = async (userMessage: string) => {
    try {
      setLoading(true);

      // Include the new user message in the messages array
      const newUserMessage: Message = {
        id: Date.now().toString(),
        content: userMessage,
        is_ai: false,
        timestamp: new Date()
      };
      
      const updatedMessages = [...messages, newUserMessage];

      // Fix the mapping to include all required Message properties
      const anthropicMessages = updatedMessages.map(m => ({
        role: m.is_ai ? "assistant" : "user",
        content: m.content,
      }));

      console.log("Frontend - anthropicMessages being sent:", JSON.stringify(anthropicMessages, null, 2));

      const response = await getAIResponse(
        anthropicMessages as any,
        'free'
      );

      const aiMessage: Message = {
        id: Date.now().toString(),
        content: response,
        is_ai: true,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiMessage]);
      
      if (onSave) {
        // We need to make sure we're saving actual Message objects
        onSave([...updatedMessages, aiMessage]);
      }
    } catch (error) {
      console.error("Error getting AI response:", error);
      toast.error("Failed to get AI response");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-background/50 min-h-[400px] max-h-[500px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>Start creating your murder mystery by sending your first message.</p>
          </div>
        ) : (
          messages.map((message) => (
            <Card
              key={message.id}
              className={`max-w-[80%] ${message.is_ai ? 'ml-0' : 'ml-auto'} ${
                message.is_ai ? 'bg-background' : 'bg-primary text-primary-foreground'
              }`}
            >
              <CardContent className="p-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                <div className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </CardContent>
            </Card>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type your message here..."
          className="flex-1 min-h-[80px]"
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? "Thinking..." : "Send"}
        </Button>
      </form>
    </div>
  );
};

export default MysteryChat;
