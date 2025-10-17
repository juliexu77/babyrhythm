import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, User, Send, Calendar } from "lucide-react";
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
  babyAgeInWeeks?: number;
  userName?: string;
  predictionIntent?: string;
  predictionConfidence?: string;
  onGoToSettings?: () => void;
}

interface ParsedMessage {
  content: string;
  chips: string[];
}

// Simple markdown formatter for better readability
const formatMarkdown = (text: string) => {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map((paragraph, idx) => {
    let formatted = paragraph.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    
    if (formatted.includes('<li>')) {
      formatted = '<ul class="list-disc pl-5 space-y-1">' + formatted + '</ul>';
    }
    
    return (
      <div key={idx} className={idx < paragraphs.length - 1 ? "mb-4" : ""}>
        <div dangerouslySetInnerHTML={{ __html: formatted }} />
      </div>
    );
  });
};

export const ParentingChat = ({ activities, babyName, babyAgeInWeeks, userName, predictionIntent, predictionConfidence, onGoToSettings }: ParentingChatProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [greetingMessage, setGreetingMessage] = useState<ParsedMessage>({ content: "", chips: [] });
  const [currentChips, setCurrentChips] = useState<string[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const needsBirthdaySetup = !babyAgeInWeeks || babyAgeInWeeks === 0;

  const CHAT_URL = "https://ufpavzvrtdzxwcwasaqj.supabase.co/functions/v1/parenting-chat";

  const placeholders = [
    "How's your week going so far?",
    "Anything you're curious about?",
    "What's on your mind today?",
    "Notice anything new today?",
    "What's been feeling different?"
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % placeholders.length);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, greetingMessage]);

  // Load initial greeting on mount - wait for required data
  useEffect(() => {
    if (!hasInitialized && activities.length > 0 && (babyName || babyAgeInWeeks !== undefined)) {
      setHasInitialized(true);
      setIsLoading(true);
      streamChat("", true, true);
    }
  }, [hasInitialized, activities.length, babyName, babyAgeInWeeks]);

  const parseMessageWithChips = (text: string): ParsedMessage => {
    const chipsMatch = text.match(/CHIPS:\s*(.+)$/m);
    if (chipsMatch) {
      const chipsText = chipsMatch[1];
      const chips = chipsText.split('|').map(c => c.trim()).filter(c => c.length > 0);
      const content = text.replace(/CHIPS:\s*.+$/m, '').trim();
      console.log('Parsed chips from AI:', chips);
      console.log('Content excerpt:', content.substring(0, 100) + '...');
      return { content, chips };
    }
    console.log('No chips found in AI response');
    return { content: text, chips: [] };
  };

  const handleChipClick = (chipText: string) => {
    setInput("");
    
    // Add the chip as a user message to maintain conversation continuity
    const chipMessage: Message = { role: "user", content: chipText };
    setMessages(prev => [...prev, chipMessage]);
    
    setIsLoading(true);
    streamChat(chipText, false, false);
  };

  const minutesToText = (m: number) => {
    if (m < 60) return `${m}min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    return r > 0 ? `${h}h ${r}min` : `${h}h`;
  };

  const formatDurationsInText = (text: string) => {
    return text
      .replace(/(\d+)\s*-\s*minute(?:s)?\b/gi, (_m, num) => minutesToText(parseInt(num)))
      .replace(/(\d+)\s*minutes?\b/gi, (_m, num) => minutesToText(parseInt(num)))
      .replace(/(\d+)\s*min\b/gi, (_m, num) => minutesToText(parseInt(num)));
  };

  const streamChat = async (userMessage: string, isInitial = false, isGreeting = false) => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVmcGF2enZydGR6eHdjd2FzYXFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2ODk0ODMsImV4cCI6MjA3NDI2NTQ4M30.KWdhL3IiQ0YWW2Q6MBHkXOwEz41ZU7EVS_eKG0Hn600",
        },
        body: JSON.stringify({ 
          messages: isGreeting ? [] : [...messages, { role: "user", content: userMessage }],
          activities,
          babyName,
          babyAgeInWeeks,
          userName,
          predictionIntent,
          predictionConfidence,
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

      if (!isGreeting) {
        setMessages(prev => [...prev, { role: "assistant", content: "" }]);
      }

      // For initial greeting, batch first few tokens for smoother appearance
      let initialBatchSize = isGreeting ? 50 : 0;
      let batchedTokens = "";

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
              
              // Batch initial tokens for smoother greeting appearance
              if (initialBatchSize > 0) {
                batchedTokens += content;
                initialBatchSize -= content.length;
                if (initialBatchSize > 0) {
                  continue; // Keep batching
                }
                // Flush the batch
                assistantContent = batchedTokens;
              }
              
              const display = formatDurationsInText(assistantContent);
              
              if (isGreeting) {
                const parsed = parseMessageWithChips(display);
                setGreetingMessage(parsed);
                if (parsed.chips.length > 0) {
                  setCurrentChips(parsed.chips);
                }
              } else {
                const parsed = parseMessageWithChips(display);
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: parsed.content
                  };
                  return newMessages;
                });
                if (parsed.chips.length > 0) {
                  setCurrentChips(parsed.chips);
                }
              }
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
              const display = formatDurationsInText(assistantContent);
              
              if (isGreeting) {
                const parsed = parseMessageWithChips(display);
                setGreetingMessage(parsed);
                if (parsed.chips.length > 0) {
                  setCurrentChips(parsed.chips);
                }
              } else {
                const parsed = parseMessageWithChips(display);
                setMessages(prev => {
                  const newMessages = [...prev];
                  newMessages[newMessages.length - 1] = {
                    role: "assistant",
                    content: parsed.content
                  };
                  return newMessages;
                });
                if (parsed.chips.length > 0) {
                  setCurrentChips(parsed.chips);
                }
              }
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
      if (messages.length > 0) {
        setMessages(prev => prev.slice(0, -1));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage = input.trim();
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);
    streamChat(userMessage, false, false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Birthday Setup Prompt */}
      {needsBirthdaySetup && (
        <div className="p-4 bg-gradient-to-br from-accent/50 to-accent/30 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Set your baby's birthday for personalized guidance
              </p>
              <p className="text-xs text-muted-foreground">
                The Guide provides age-appropriate insights and developmental context when we know your baby's age.
              </p>
              <Button
                size="sm"
                onClick={() => onGoToSettings?.()}
                className="mt-2"
              >
                Go to Settings
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {!hasInitialized && activities.length > 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
              <span className="text-2xl">🌿</span>
            </div>
            <p className="text-sm text-muted-foreground">Observing patterns...</p>
          </div>
        </div>
      )}

      {/* Initial Greeting - Always at top */}
      {greetingMessage.content && (
        <div className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-b border-primary/20 animate-in fade-in duration-500">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-1">
              <span className="text-xl">🌿</span>
            </div>
            <div className="flex-1 space-y-3">
              <div className="text-sm text-foreground/90 leading-relaxed">
                {formatMarkdown(greetingMessage.content)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Conversation History */}
      <ScrollArea className="flex-1 p-4">
        <div ref={scrollRef} className="space-y-4 pb-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                msg.role === "user" ? "justify-end" : ""
              }`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <div className="text-sm leading-relaxed">
                  {formatMarkdown(msg.content)}
                </div>
              </div>
              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary animate-pulse" />
              </div>
              <div className="bg-muted rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input with Contextual Chips */}
      <div className="sticky bottom-0 border-t border-border/50 bg-background/95 backdrop-blur-sm">
        {/* Chips - only show when not loading and not focused */}
        {currentChips.length > 0 && !isLoading && (
          <div className={`px-4 pt-4 pb-2 transition-all duration-300 ${inputFocused ? 'opacity-0 max-h-0 overflow-hidden' : 'opacity-100 max-h-40'}`}>
            <div className="flex flex-wrap gap-2">
              {currentChips.map((chip, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleChipClick(chip)}
                  className="text-xs animate-in fade-in slide-in-from-bottom-2"
                  style={{ animationDelay: `${idx * 50}ms` }}
                >
                  {chip.replace(/^["']|["']$/g, '')}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="p-4">
          <div className="flex gap-2 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              placeholder={placeholders[placeholderIndex]}
              disabled={isLoading}
              rows={2}
              className="flex-1 transition-all duration-200 dark:border-muted-foreground/40 dark:bg-muted/30 resize-none"
            />
            <Button
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              size="icon"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
