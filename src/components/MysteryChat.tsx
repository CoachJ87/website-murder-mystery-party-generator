import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Send, Loader2, RefreshCw, Copy, CheckCircle } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { Message } from "@/components/types";

interface MysteryChatProps {
  initialTheme?: string;
  initialPlayerCount?: number;
  initialHasAccomplice?: boolean;
  initialScriptType?: 'full' | 'pointForm';
  initialAdditionalDetails?: string;
  savedMysteryId?: string;
  onSave: (message: Message) => Promise<void>;
  onGenerateFinal?: (messages: Message[]) => Promise<void>;
  initialMessages?: Message[];
  isLoadingHistory?: boolean;
  systemInstruction?: string;
  preventDuplicateMessages?: boolean;
  skipForm?: boolean;
}

const formSchema = z.object({
  theme: z.string().min(2, {
    message: "Theme must be at least 2 characters.",
  }).max(50, {
    message: "Theme must not be longer than 50 characters.",
  }),
  playerCount: z.number().min(2, {
    message: "Must have at least 2 players"
  }).max(20, {
    message: "Must not have more than 20 players"
  }),
  hasAccomplice: z.boolean().default(false),
  scriptType: z.enum(['full', 'pointForm']).default('full'),
  additionalDetails: z.string().max(500).optional(),
});

export default function MysteryChat({
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
  systemInstruction,
  preventDuplicateMessages = false,
  skipForm = false
}: MysteryChatProps) {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(initialTheme || '');
  const [currentPlayerCount, setCurrentPlayerCount] = useState(initialPlayerCount || 4);
  const [currentHasAccomplice, setCurrentHasAccomplice] = useState(initialHasAccomplice || false);
  const [currentScriptType, setCurrentScriptType] = useState(initialScriptType || 'full');
  const [currentAdditionalDetails, setCurrentAdditionalDetails] = useState(initialAdditionalDetails || '');
  const [isCopied, setIsCopied] = useState(false);
  const [temperature, setTemperature] = useState(0.5);
  const { isAuthenticated } = useAuth();
  const isMobile = useIsMobile();
  const bottomRef = useRef<HTMLDivElement>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      theme: initialTheme || "",
      playerCount: initialPlayerCount || 4,
      hasAccomplice: initialHasAccomplice || false,
      // scriptType: initialScriptType || 'full', // Default value for scriptType
      additionalDetails: initialAdditionalDetails || "",
    },
    mode: "onChange"
  });

  useEffect(() => {
    if (initialTheme) {
      form.setValue("theme", initialTheme);
      setCurrentTheme(initialTheme);
    }
    if (initialPlayerCount) {
      form.setValue("playerCount", initialPlayerCount);
      setCurrentPlayerCount(initialPlayerCount);
    }
    if (initialHasAccomplice) {
      form.setValue("hasAccomplice", initialHasAccomplice);
      setCurrentHasAccomplice(initialHasAccomplice);
    }
    if (initialScriptType) {
      // form.setValue("scriptType", initialScriptType);
      setCurrentScriptType(initialScriptType);
    }
    if (initialAdditionalDetails) {
      form.setValue("additionalDetails", initialAdditionalDetails);
      setCurrentAdditionalDetails(initialAdditionalDetails);
    }
  }, [initialTheme, initialPlayerCount, initialHasAccomplice, initialScriptType, initialAdditionalDetails, form]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isAiTyping]);

  // Improved duplicate detection that's context-aware
  const isDuplicateMessage = (newContent: string, existingMessages: Message[]) => {
    if (!preventDuplicateMessages) return false;
    
    const trimmedContent = newContent.trim();
    if (trimmedContent.length === 0) return false;
    
    // Get the last few user messages for context
    const recentUserMessages = existingMessages
      .filter(msg => !msg.is_ai)
      .slice(-3) // Look at last 3 user messages
      .map(msg => msg.content.trim());
    
    // If this is a simple numeric answer, check if the last AI message was asking for different info
    if (/^\d+$/.test(trimmedContent)) {
      const lastAiMessage = [...existingMessages].reverse().find(msg => msg.is_ai);
      if (lastAiMessage) {
        const lastAiContent = lastAiMessage.content.toLowerCase();
        
        // Allow duplicate numbers if AI is asking for different things
        const isAskingForPlayers = lastAiContent.includes('players') || lastAiContent.includes('player count');
        const isAskingForTitle = lastAiContent.includes('title') || lastAiContent.includes('choose') || lastAiContent.includes('option');
        
        // If the AI is asking for title choice (like "3" for option 3), allow it even if user previously entered "3" for player count
        if (isAskingForTitle) {
          return false;
        }
        
        // For player count, check if this exact question was asked before
        if (isAskingForPlayers) {
          const hasAnsweredPlayersBefore = recentUserMessages.some((msg, index) => {
            if (msg === trimmedContent) {
              // Check if the previous AI message before this user message was also asking for players
              const userMessageIndex = existingMessages.findIndex(m => !m.is_ai && m.content.trim() === msg);
              if (userMessageIndex > 0) {
                const previousAiMessage = existingMessages[userMessageIndex - 1];
                if (previousAiMessage && previousAiMessage.is_ai) {
                  const prevContent = previousAiMessage.content.toLowerCase();
                  return prevContent.includes('players') || prevContent.includes('player count');
                }
              }
            }
            return false;
          });
          
          return hasAnsweredPlayersBefore;
        }
      }
      return false;
    }
    
    // For non-numeric messages, check for exact duplicates in recent messages
    const hasExactDuplicate = recentUserMessages.includes(trimmedContent);
    
    // But allow if the last AI response suggests the message wasn't understood or needs clarification
    if (hasExactDuplicate) {
      const lastAiMessage = [...existingMessages].reverse().find(msg => msg.is_ai);
      if (lastAiMessage) {
        const lastAiContent = lastAiMessage.content.toLowerCase();
        const isAskingForClarification = lastAiContent.includes('sorry') || 
                                      lastAiContent.includes('clarify') || 
                                      lastAiContent.includes('understand') ||
                                      lastAiContent.includes('could you') ||
                                      lastAiContent.includes('please');
        if (isAskingForClarification) return false;
      }
    }
    
    return hasExactDuplicate;
  };

  const handleThemeChange = (value: string) => {
    setCurrentTheme(value);
  };

  const handlePlayerCountChange = (value: number) => {
    setCurrentPlayerCount(value);
  };

  const handleHasAccompliceChange = (value: boolean) => {
    setCurrentHasAccomplice(value);
  };

  const handleScriptTypeChange = (value: 'full' | 'pointForm') => {
    setCurrentScriptType(value);
  };

  const handleAdditionalDetailsChange = (value: string) => {
    setCurrentAdditionalDetails(value);
  };

  const handleCopyClick = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(messages, null, 2));
      setIsCopied(true);
      toast.success("Messages copied to clipboard!");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
      toast.error("Failed to copy messages to clipboard.");
    }
  };

  const handleResetClick = () => {
    setMessages([]);
    toast.success("Chat has been reset!");
  };

  const createSystemMessage = (data: any) => {
    let systemMsg = "You are a helpful mystery writer. Your job is to help the user create an exciting murder mystery game.";
    systemMsg += `\nThe user wants to create a murder mystery with theme: ${data.theme}. `;
    systemMsg += `The user wants to create a murder mystery with ${data.playerCount} players. `;
    systemMsg += `The user wants to create a murder mystery with ${data.hasAccomplice ? 'an' : 'no'} accomplice. `;
    systemMsg += `The user wants to create a murder mystery with a ${data.scriptType} script. `;
    if (data.additionalDetails) {
      systemMsg += `The user wants to create a murder mystery with the following additional details: ${data.additionalDetails}. `;
    }
    return systemMsg;
  };

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return;
    
    // Check for context-aware duplicates
    if (isDuplicateMessage(content, messages)) {
      toast.error("You've already sent this message recently. Please try a different response.");
      return;
    }

    setIsTyping(false);
    setInput('');

    const userMessage: Message = {
      id: Date.now().toString(),
      content: content.trim(),
      is_ai: false,
      timestamp: new Date(),
      isAutoGenerated: false
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);

    try {
      await onSave(userMessage);
    } catch (error) {
      console.error("Error saving user message:", error);
    }

    setIsAiTyping(true);

    try {
      console.log("=== Starting AI Request ===");
      console.log("User message:", content);
      console.log("Current conversation length:", newMessages.length);
      
      const systemPrompt = systemInstruction || createSystemMessage({
        theme: currentTheme,
        playerCount: currentPlayerCount,
        hasAccomplice: currentHasAccomplice,
        scriptType: currentScriptType,
        additionalDetails: currentAdditionalDetails
      });

      console.log("System prompt being sent:", systemPrompt.substring(0, 200) + "...");

      const response = await fetch('/api/proxy-anthropic-cors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: 'https://mhfikaomkmqcndqfohbp.supabase.co/functions/v1/mystery-ai',
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZmlrYW9ta21xY25kcWZvaGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM2MTc5MTIsImV4cCI6MjA1OTE5MzkxMn0.xrGd-6SlR2UNOf_1HQJWIsKNe-rNOtPuOsYE8VrRI6w'}`
          },
          body: JSON.stringify({
            messages: newMessages.map(msg => ({
              role: msg.is_ai ? "assistant" : "user",
              content: msg.content,
              isAutoGenerated: msg.isAutoGenerated || false
            })),
            system: systemPrompt,
            promptVersion: 'free',
            requireFormatValidation: true,
            stream: false
          })
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("=== AI Response Received ===");
      console.log("Response data:", data);

      if (data.choices && data.choices[0] && data.choices[0].message) {
        const aiResponse = data.choices[0].message.content;
        console.log("AI response content:", aiResponse);

        const aiMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: aiResponse,
          is_ai: true,
          timestamp: new Date(),
          isAutoGenerated: false
        };

        const updatedMessages = [...newMessages, aiMessage];
        setMessages(updatedMessages);

        try {
          await onSave(aiMessage);
        } catch (error) {
          console.error("Error saving AI message:", error);
        }
      } else {
        throw new Error('Invalid response format from AI service');
      }
    } catch (error) {
      console.error('Error calling AI service:', error);
      toast.error("Failed to get AI response. Please try again.");
      
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I apologize, but I'm having trouble responding right now. Please try again in a moment.",
        is_ai: true,
        timestamp: new Date(),
        isAutoGenerated: false
      };

      setMessages([...newMessages, errorMessage]);
    } finally {
      setIsAiTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {!skipForm && (
        <Card className="mb-4">
          <CardHeader>
            <FormLabel className="text-lg">Mystery Settings</FormLabel>
            <CardDescription>
              Configure the basic settings for your murder mystery.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-4">
                <FormField
                  control={form.control}
                  name="theme"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Theme</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. Roaring 20s, Space Station"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleThemeChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        The overall theme or setting for your mystery.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="playerCount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Player Count</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="4"
                          {...field}
                          onChange={(e) => {
                            const value = parseInt(e.target.value);
                            if (!isNaN(value)) {
                              field.onChange(value);
                              handlePlayerCountChange(value);
                            }
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        The number of players that will be participating in the
                        mystery.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="hasAccomplice"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel>Accomplice</FormLabel>
                        <FormDescription>
                          Should the murderer have an accomplice?
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={(checked) => {
                            field.onChange(checked);
                            handleHasAccompliceChange(checked);
                          }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                {/* <FormField
                  control={form.control}
                  name="scriptType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Script Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          handleScriptTypeChange(value as 'full' | 'pointForm');
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a script type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="full">Full Script</SelectItem>
                          <SelectItem value="pointForm">Point Form</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        Choose between a full script or a point form script.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                /> */}

                <FormField
                  control={form.control}
                  name="additionalDetails"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Additional Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Any additional details you want to include?"
                          className="resize-none"
                          {...field}
                          onChange={(e) => {
                            field.onChange(e);
                            handleAdditionalDetailsChange(e.target.value);
                          }}
                        />
                      </FormControl>
                      <FormDescription>
                        Any additional details you want to include?
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </form>
            </Form>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col flex-grow overflow-hidden">
        <div className="flex-grow overflow-y-auto px-4 py-2">
          {isLoadingHistory && (
            <div className="text-center text-gray-500">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              Loading previous messages...
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "mb-2 rounded-lg px-3 py-2 w-fit max-w-[80%]",
                message.is_ai
                  ? "bg-secondary text-foreground ml-auto"
                  : "bg-primary text-primary-foreground mr-auto"
              )}
            >
              <p className="text-sm whitespace-pre-line">{message.content}</p>
              <div className="text-xs text-gray-500 mt-1">
                {message.timestamp.toLocaleTimeString()}
              </div>
            </div>
          ))}
          {isAiTyping && (
            <div className="ml-auto mb-2 rounded-lg px-3 py-2 w-fit max-w-[80%] bg-secondary text-foreground">
              <div className="flex space-x-2">
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="border-t border-muted bg-secondary/50 p-4">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Type your message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(input);
                }
              }}
              disabled={isAiTyping}
              className="flex-grow"
            />
            <Button type="submit" onClick={() => handleSendMessage(input)} disabled={isAiTyping}>
              {isAiTyping ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
              Send
            </Button>
          </div>
          <div className="flex items-center justify-between mt-2">
            <Button variant="ghost" size="sm" onClick={handleCopyClick} disabled={messages.length === 0}>
              {isCopied ? <CheckCircle className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
              {isCopied ? "Copied!" : "Copy Messages"}
            </Button>
            <Button variant="ghost" size="sm" onClick={handleResetClick} disabled={messages.length === 0}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset Chat
            </Button>
          </div>
        </div>
      </div>
      
      {onGenerateFinal && messages.length > 0 && (
        <div className="mt-2">
          <Button
            onClick={() => onGenerateFinal(messages)}
            variant="default"
            className="w-full"
          >
            Generate Final Mystery
          </Button>
        </div>
      )}
    </div>
  );
}
