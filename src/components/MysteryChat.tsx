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

const formatMessageContent = (content: string) => {
  let formattedContent = content
    .replace(/^# (.*$)/gm, '<h1 class="text-2xl font-bold my-4">$1</h1>')
    .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold my-3">$2</h2>')
    .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold my-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/- \[ \] (.*$)/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" disabled class="form-checkbox h-4 w-4" /><span>$1</span></div>')
    .replace(/- \[x\] (.*$)/gm, '<div class="flex items-center gap-2 my-1"><input type="checkbox" checked disabled class="form-checkbox h-4 w-4" /><span>$1</span></div>');

  const lines = formattedContent.split('\n');
  let inOrderedList = false;
  let listItems: string[] = [];

  const processedLines = lines.map((line, index) => {
    const listItemMatch = line.match(/^(\d+)\. (.*$)/);

    if (listItemMatch) {
      if (!inOrderedList) {
        inOrderedList = true;
        listItems = [];
      }
      listItems.push(listItemMatch[2]);
      return null;
    } else if (inOrderedList) {
      const listHtml = `<ol class="list-decimal list-inside my-2 pl-2">${listItems.map(item => `<li class="my-1">${item}</li>`).join('')}</ol>`;
      inOrderedList = false;
      return listHtml + line;
    } else {
      return line;
    }
  });

  if (inOrderedList) {
    processedLines.push(`<ol class="list-decimal list-inside my-2 pl-2">${listItems.map(item => `<li class="my-1">${item}</li>`).join('')}</ol>`);
  }

  return processedLines
    .filter(line => line !== null)
    .join('<br class="my-1" />');
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
  const [isInitialized, setIsInitialized] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 56,
    maxHeight: 200,
  });

  useEffect(() => {
    const fetchMysteryData = async () => {
      if (savedMysteryId) {
        try {
          const { data: existingMessages, error: messagesError } = await supabase
            .from("messages")
            .select("*")
            .eq("conversation_id", savedMysteryId)
            .order("created_at", { ascending: true });

          if (!messagesError && existingMessages && existingMessages.length > 0) {
            console.log("Found existing messages:", existingMessages.length);

            const formattedMessages: Message[] = existingMessages.map(msg => ({
              id: msg.id,
              role: msg.is_ai ? "assistant" : "user",
              content: msg.content,
              timestamp: new Date(msg.created_at)
            }));

            setMessages(formattedMessages);
            setIsInitialized(true);
            return;
          }

          const { data, error } = await supabase
            .from("conversations")
            .select("mystery_data")
            .eq("id", savedMysteryId)
            .single();

          if (!error && data && data.mystery_data) {
            const mysteryData = typeof data.mystery_data === 'object' ? data.mystery_data : {};

            const formattedPrompt = `I want to create a murder mystery with these details:
- Theme: ${(mysteryData as any)?.theme || initialTheme || 'Mystery Theme'}
- Number of players: ${(mysteryData as any)?.playerCount || 8}
- Include an accomplice: ${(mysteryData as any)?.hasAccomplice ? 'Yes' : 'No'}
- Script style: ${(mysteryData as any)?.scriptType === 'full' ? 'Full scripts' : 'Point form summaries'}
${(mysteryData as any)?.additionalDetails ? `- Additional details: ${(mysteryData as any).additionalDetails}` : ''}

Help me develop this murder mystery.`;

            setInitialPrompt(formattedPrompt);
          }
        } catch (error) {
          console.error("Error fetching mystery data:", error);
        }
      }
    };

    const fetchFreePrompt = async () => {
      console.log("Attempting to fetch free prompt from database...");

      const { data, error } = await supabase
        .from("prompts")
        .select("content")
        .eq("name", "murder_mystery_free")
        .single();

      if (error) {
        console.error("Error fetching free prompt:", error);
        console.error("Error details:", JSON.stringify(error));
        return;
      }

      if (data && data.content) {
        console.log("Successfully fetched free prompt from database!");
        console.log("Prompt preview:", data.content.substring(0, 100) + "...");
        console.log("Prompt length:", data.content.length);
      } else {
        console.error("No prompt data found in the database");
      }
    };

    fetchMysteryData();
    fetchFreePrompt();
  }, [savedMysteryId, initialTheme]);

  useEffect(() => {
    if (initialPrompt && messages.length === 0 && !isInitialized) {
      const userMessage: Message = {
        id: Date.now().toString(),
        role: "user",
        content: initialPrompt,
        timestamp: new Date(),
      };

      setMessages([userMessage]);

      handleAnthropicRequest(initialPrompt);
      setIsInitialized(true);
    }
  }, [initialPrompt, messages.length, isInitialized]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleAnthropicRequest = async (userInput: string) => {
    setLoading(true);

    try {
      const contextMessages = messages.map(msg => ({
        is_ai: msg.role === "assistant",
        content: msg.content
      }));

      const allMessages = [...contextMessages, { is_ai: false, content: userInput }];

      const promptVersion = isAuthenticated ? "paid" : "free";

      console.log(`Using ${promptVersion} prompt version for request`);

      const aiResponseText = await getAIResponse(allMessages, promptVersion);

      const aiResponse: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: aiResponseText,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);

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

      <div className="flex-1 overflow-y-auto mb-4 space-y-4 p-4 border rounded-lg bg-background/50 min-h-[400px] max-h-[500px]">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <p>Start creating your murder mystery by sending your first message.</p>
          </div>
        ) : (
          messages.map((message) => (
            <Card key={message.id} className={`max-w-[80%] ${message.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "mr-auto"}`}>
              <CardContent className="p-4">
                <div 
                  dangerouslySetInnerHTML={{ 
                    __html: formatMessageContent(message.content) 
                  }}
                  className="prose prose-sm dark:prose-invert max-w-none"
                />
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
