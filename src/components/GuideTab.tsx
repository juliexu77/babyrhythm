import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Sprout, Send, MoreVertical, Calendar, BookOpen, Heart, Droplet, Baby, TrendingUp, Activity } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

interface GuideTabProps {
  activities: Activity[];
  onGoToSettings?: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface InsightCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: string;
  questions: string[];
}

// Simple markdown formatter
const formatMarkdown = (text: string) => {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map((paragraph, idx) => {
    let formatted = paragraph.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/^- (.+)$/gm, '<li>$1</li>');
    
    if (formatted.includes('<li>')) {
      formatted = '<ul class="list-disc pl-5 space-y-1">' + formatted + '</ul>';
    }
    
    return (
      <div key={idx} className={idx < paragraphs.length - 1 ? "mb-3" : ""}>
        <div dangerouslySetInnerHTML={{ __html: formatted }} />
      </div>
    );
  });
};

export const GuideTab = ({ activities, onGoToSettings }: GuideTabProps) => {
  const { household } = useHousehold();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [insightCards, setInsightCards] = useState<InsightCard[]>([]);
  const [selectedSentiment, setSelectedSentiment] = useState<string | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const babyName = household?.baby_name || 'Baby';
  const babyAgeInWeeks = household?.baby_birthday ? 
    Math.floor((Date.now() - new Date(household.baby_birthday).getTime()) / (1000 * 60 * 60 * 24 * 7)) : 0;

  const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parenting-chat`;

  const needsBirthdaySetup = !babyAgeInWeeks || babyAgeInWeeks === 0;

  const topicCategories = [
    { name: "Sleep", icon: <BookOpen className="w-4 h-4" /> },
    { name: "Feeding", icon: <Droplet className="w-4 h-4" /> },
    { name: "Development", icon: <Baby className="w-4 h-4" /> },
    { name: "Health", icon: <Heart className="w-4 h-4" /> },
    { name: "Activities", icon: <Activity className="w-4 h-4" /> },
  ];

  const sentimentOptions = ["Curious", "Surprised", "Worried"];

  // Check minimum data requirements (same as prediction engine)
  const naps = activities.filter(a => a.type === 'nap');
  const feeds = activities.filter(a => a.type === 'feed');
  const hasMinimumData = naps.length >= 4 && feeds.length >= 4;

  // Load initial insight
  useEffect(() => {
    if (!hasInitialized && hasMinimumData && babyName && babyAgeInWeeks > 0) {
      setHasInitialized(true);
      loadInitialInsight();
    }
  }, [hasInitialized, hasMinimumData, babyName, babyAgeInWeeks]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  const loadInitialInsight = async () => {
    setIsLoading(true);
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const recentActivities = activities.filter(a => 
        new Date(a.logged_at) >= twoWeeksAgo
      );

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [],
          activities: recentActivities,
          householdId: household?.id,
          babyName,
          babyAgeInWeeks,
          babySex: household?.baby_sex,
          timezone,
          isInitial: true
        }),
      });

      if (!resp.ok) throw new Error("Failed to load insight");
      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let content = "";

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
            const chunk = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (chunk) content += chunk;
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      // Parse the insight into a card
      const insightCard: InsightCard = {
        id: "daily-insight",
        icon: <Sprout className="w-5 h-5 text-primary" />,
        title: "About Today's Activities",
        content: content.trim(),
        questions: [
          "Why did the pattern change?",
          "Is this normal for their age?",
          "How long until adjustment?",
          "Will this affect night sleep?",
          "When should I be concerned?"
        ]
      };

      setInsightCards([insightCard]);
    } catch (error) {
      console.error("Error loading insight:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async (message: string) => {
    if (!message.trim() || isLoading) return;

    const userMsg: Message = { role: "user", content: message };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const recentActivities = activities.filter(a => 
        new Date(a.logged_at) >= twoWeeksAgo
      );

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ 
          messages: [...messages, userMsg],
          activities: recentActivities,
          householdId: household?.id,
          babyName,
          babyAgeInWeeks,
          babySex: household?.baby_sex,
          timezone,
          isInitial: false
        }),
      });

      if (!resp.ok) {
        if (resp.status === 429) {
          toast({
            title: "Rate limit exceeded",
            description: "Please try again in a moment.",
            variant: "destructive",
          });
          setMessages(prev => prev.slice(0, -1));
          return;
        }
        throw new Error("Failed to send message");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      let assistantContent = "";

      const assistantMsg: Message = { role: "assistant", content: "" };
      setMessages(prev => [...prev, assistantMsg]);

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
                  content: assistantContent
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
    } catch (error) {
      console.error("Chat error:", error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuestionClick = (question: string) => {
    handleSendMessage(question);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Birthday Setup Prompt */}
      {needsBirthdaySetup && (
        <div className="p-4 bg-accent/30 border-b border-border">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Set your baby's birthday for personalized guidance</p>
              <p className="text-xs text-muted-foreground">
                The Guide provides age-appropriate insights when we know your baby's age.
              </p>
              <Button
                size="sm"
                variant="default"
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
      {isLoading && insightCards.length === 0 && (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
              <Sprout className="w-6 h-6 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">Analyzing patterns...</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <ScrollArea className="flex-1">
        <div ref={scrollRef} className="px-4 py-6 space-y-8">
          {/* Welcome Section */}
          <div className="space-y-2">
            <h1 className="text-xl font-semibold">👋 Welcome to your Guide</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              This is where {babyName}'s daily patterns turn into understanding.
            </p>
            <p className="text-sm text-muted-foreground">As you track, you'll see:</p>
            <ul className="text-sm text-muted-foreground space-y-1 ml-4">
              <li>• Changes explained</li>
              <li>• Age-based guidance</li>
              <li>• Learnings from the digital village</li>
            </ul>
          </div>

          {/* Connected Insights Section */}
          {hasMinimumData && insightCards.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold">📊 Connected Insights</h2>
              <div className="space-y-3">
                {insightCards.map((card) => (
                  <div key={card.id} className="p-4 bg-muted/30 rounded-lg space-y-2">
                    <div className="text-sm leading-relaxed">
                      {formatMarkdown(card.content)}
                    </div>
                    <Button
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-xs text-primary"
                      onClick={() => handleSendMessage(`Tell me more about ${card.title.toLowerCase()}`)}
                    >
                      Learn more →
                    </Button>
                  </div>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                View all insights
              </Button>
            </div>
          )}

          {/* Explore Topics Section */}
          <div className="space-y-4">
            <h2 className="text-base font-semibold">📚 Explore Topics</h2>
            <div className="grid grid-cols-3 gap-2">
              {topicCategories.map((topic) => (
                <Button
                  key={topic.name}
                  variant="outline"
                  size="sm"
                  className="h-auto py-3 flex flex-col items-center gap-1"
                  onClick={() => handleSendMessage(`Tell me about ${topic.name.toLowerCase()} for ${babyName}`)}
                >
                  {topic.icon}
                  <span className="text-xs">{topic.name}</span>
                </Button>
              ))}
              <Button
                variant="outline"
                size="sm"
                className="h-auto py-3 flex flex-col items-center gap-1"
              >
                <MoreVertical className="w-4 h-4" />
                <span className="text-xs">More...</span>
              </Button>
            </div>
          </div>

          {/* Chat Messages */}
          {messages.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border/30">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Sprout className="w-4 h-4 text-primary" />
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
                </div>
              ))}

              {/* Loading Indicator */}
              {isLoading && (
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Sprout className="w-4 h-4 text-primary animate-pulse" />
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
          )}

          {/* Footer */}
          <div className="pt-4 text-center">
            <p className="text-xs text-muted-foreground">
              ✨ The more you track, the smarter your Guide becomes.
            </p>
          </div>
        </div>
      </ScrollArea>

      {/* Ask Anything Section */}
      <div className="border-t border-border/30 bg-background">
        <div className="px-4 pt-3 pb-1">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            💬 Ask me anything about {babyName}
          </h3>
        </div>
        <div className="px-4 pb-[calc(max(env(safe-area-inset-bottom),16px))]">
          <div className="relative flex gap-3 items-end">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Why is he waking earlier? or When do babies drop to two naps?"
              disabled={isLoading}
              rows={1}
              className="flex-1 min-h-[48px] max-h-36 resize-none rounded-2xl border-border/40 bg-muted/50 px-4 py-3 text-[16px] leading-6"
            />
            <Button
              onClick={() => handleSendMessage(input)}
              disabled={isLoading || !input.trim()}
              size="icon"
              className="flex-shrink-0 h-12 w-12 rounded-2xl"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};
