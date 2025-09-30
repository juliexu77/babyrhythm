import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Bot, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

interface ParentingChatProps {
  activities: Activity[];
  babyName?: string;
  babyAge?: number;
}

export const ParentingChat = ({ activities, babyName, babyAge }: ParentingChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const CHAT_URL = "https://ufpavzvrtdzxwcwasaqj.supabase.co/functions/v1/parenting-chat";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Show welcome message on mount
  useEffect(() => {
    if (!hasInitialized) {
      setHasInitialized(true);
      setMessages([{
        role: "assistant",
        content: `Hi! Would you like to hear how ${babyName || "your baby"}'s day is going?`
      }]);
    }
  }, [hasInitialized, babyName]);

  const quickActions = [
    { label: "📊 Daily summary", prompt: "Give me a warm summary of how today has been going." },
    { label: "📈 Compare to expected range", prompt: "How is my baby doing compared to the expected range for their age?" },
    { label: "💤 Sleep training methods", prompt: "Tell me about different sleep training philosophies like Taking Cara Babies, Moms on Call, and Twelve Hours by Twelve Weeks." },
    { label: "🍼 Feeding patterns", prompt: "How are the feeding patterns looking today?" },
  ];

  const handleQuickAction = (prompt: string) => {
    setIsLoading(true);
    streamChat(prompt, prompt.includes("summary"));
  };

  const streamChat = async (userMessage: string, isInitial = false) => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcGF2enZydGR6eHdjd2FzYXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODk0ODMsImV4cCI6MjA3NDI2NTQ4M30.KWdhL3IiQ0YWW2Q6MBHkXOwEz41ZU7EVS_eKG0Hn600",
        },
        body: JSON.stringify({ 
          messages: [...messages, { role: "user", content: userMessage }],
          activities,
          babyName,
          babyAge,
          timezone,
          isInitial
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast({
            title: "Rate limit exceeded",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
          return;
        }
        if (resp.status === 402) {
          toast({
            title: "Service unavailable",
            description: "AI chat service requires additional credits.",
            variant: "destructive",
          });
          return;
        }
        throw new Error("Failed to start stream");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      // Add empty assistant message
      setMessages(prev => [...prev, { role: "assistant", content: "" }]);

      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") {
            streamDone = true;
            break;
          }

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return newMessages;
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Final flush
      if (textBuffer.trim()) {
        for (let raw of textBuffer.split("\n")) {
          if (!raw) continue;
          if (raw.endsWith("\r")) raw = raw.slice(0, -1);
          if (raw.startsWith(":") || raw.trim() === "") continue;
          if (!raw.startsWith("data: ")) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === "[DONE]") continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                };
                return newMessages;
              });
            }
          } catch {
            /* ignore partial leftovers */
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      // Remove the empty assistant message
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    await streamChat(userMessage);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <ScrollArea className="flex-1 p-4 pb-32" ref={scrollRef}>
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && !isLoading && (
            <div className="text-center text-muted-foreground py-12">
              <Bot className="h-16 w-16 mx-auto mb-4 opacity-40" />
              <p className="text-sm">Loading...</p>
            </div>
          )}
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                
                {/* Display photos if they are in the message */}
                {msg.role === "assistant" && msg.content.includes("📸") && activities && (
                  <div className="mt-3 space-y-2">
                    {activities
                      .filter((a: any) => {
                        const activityDate = new Date(a.logged_at);
                        const today = new Date();
                        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                        const getUserTimezoneDate = (date: Date) => {
                          return date.toLocaleDateString('en-US', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit' });
                        };
                        return getUserTimezoneDate(activityDate) === getUserTimezoneDate(today) && 
                               ((a.type === 'photo' || a.type === 'note') && a.details?.photoUrl);
                      })
                      .map((photo: any, i: number) => (
                        <img
                          key={i}
                          src={photo.details.photoUrl}
                          alt={`Photo from today ${i + 1}`}
                          className="rounded-lg max-w-full h-auto"
                        />
                      ))
                    }
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              <div className="bg-muted rounded-lg p-3">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="fixed bottom-16 left-0 right-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {messages.length > 0 && !isLoading && (
          <div className="px-4 pt-3 pb-2">
            <div className="flex flex-wrap gap-2 max-w-3xl mx-auto">
              {quickActions.map((action) => (
                <Button
                  key={action.label}
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickAction(action.prompt)}
                  disabled={isLoading}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          </div>
        )}
        
        <div className="p-4 pt-2">
          <div className="flex gap-2 max-w-3xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask helper"
              disabled={isLoading}
              className="flex-1"
            />
            <Button onClick={handleSend} disabled={isLoading || !input.trim()} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};