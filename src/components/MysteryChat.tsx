import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { MessageCircle, Wand2 } from "lucide-react";
import { AIInputWithLoading } from "@/components/ui/ai-input-with-loading";
import { Message } from "@/components/types";

interface MysteryChatProps {
  initialTheme: string;
  initialPlayerCount?: number;
  initialHasAccomplice?: boolean;
  initialScriptType?: string;
  initialAdditionalDetails?: string;
  savedMysteryId?: string;
  onSave: (message: Message) => Promise<void>;
  onGenerateFinal?: () => void;
  initialMessages?: Message[];
  isLoadingHistory?: boolean;
  systemInstruction?: string;
}

const MysteryChat = ({
  initialTheme,
  initialPlayerCount,
  initialHasAccomplice,
  initialScriptType,
  initialAdditionalDetails,
  savedMysteryId,
  onSave,
  onGenerateFinal,
  initialMessages = [],
  isLoadingHistory = false,
  systemInstruction = ""
}) => {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState("");
  const navigate = useNavigate();

  const handleUserMessage = useCallback(async (content: string) => {
    if (!content.trim()) return;

    const newMessage: Message = {
      id: Date.now().toString(),
      content: content,
      is_ai: false,
      timestamp: new Date(),
    };

    setMessages((prevMessages) => [...prevMessages, newMessage]);
    setInput("");
    setLoading(true);

    try {
      await onSave(newMessage);

      // Simulate AI response (replace with actual AI logic)
      setTimeout(() => {
        const aiResponse = generateAIResponse(content);
        const aiMessage: Message = {
          id: Date.now().toString() + "-ai",
          content: aiResponse,
          is_ai: true,
          timestamp: new Date(),
        };

        setMessages((prevMessages) => [...prevMessages, aiMessage]);
        onSave(aiMessage).then(() => setLoading(false));
      }, 1500);
    } catch (error) {
      console.error("Error saving message:", error);
      toast.error("Failed to save message");
      setLoading(false);
    }
  }, [onSave]);

  const handleGenerateFinal = () => {
    if (onGenerateFinal) {
      onGenerateFinal();
    } else {
      toast.error("Finalize function not provided.");
    }
  };

  const generateAIResponse = (userMessage: string) => {
    // Replace with actual AI response logic
    return `AI response to: "${userMessage}"`;
  };

  return (
    <div className="flex flex-col space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Create Your Murder Mystery</h2>
        <div className="flex gap-2">
          <Button onClick={handleGenerateFinal} disabled={messages.length < 3}>
            <Wand2 className="h-4 w-4 mr-2" />
            Generate Final Mystery
          </Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>

      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4 border-b pb-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-lg">Murder Mystery Creator</h3>
        </div>

        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`p-3 rounded-md ${message.is_ai ? "bg-muted" : "bg-primary text-primary-foreground"
                }`}
            >
              <p>{message.content}</p>
            </div>
          ))}
          {isLoadingHistory && <p>Loading previous messages...</p>}
          {loading && <p>Loading...</p>}
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
    </div>
  );
};

export default MysteryChat;
