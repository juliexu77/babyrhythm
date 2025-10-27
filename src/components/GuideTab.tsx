import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sprout, Send, Calendar, TrendingUp, Activity } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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

// Helper to get pattern tooltip
const getPatternTooltip = (pattern: string): string => {
  switch (pattern) {
    case "Smooth Flow":
      return "Stable naps, predictable feeds, balanced energy.";
    case "Building Rhythm":
      return "Adjusting wake windows or feeding intervals.";
    case "In Sync":
      return "Perfectly aligned with developmental expectations.";
    case "Extra Sleepy":
      return "More rest than usual, often during growth or recovery.";
    case "Active Feeding":
      return "Increased appetite and feeding frequency.";
    case "Off Rhythm":
      return "Recovering from changes like travel, teething, or illness.";
    default:
      return "Unique daily pattern reflecting current needs.";
  }
};

// Helper to get pattern insight descriptions
const getPatternInsight = (pattern: string): { title: string; description: string } => {
  switch (pattern) {
    case "Smooth Flow":
      return {
        title: "Smooth Flow",
        description: "Stable sleep patterns and consistent appetite throughout the day. This indicates a well-regulated rhythm."
      };
    case "Building Rhythm":
      return {
        title: "Building Rhythm", 
        description: "Experimenting with new wake windows as developmental changes emerge. Patterns are forming but still adjusting."
      };
    case "In Sync":
      return {
        title: "In Sync",
        description: "Perfect alignment with developmental expectations. This harmonious pattern suggests established routines."
      };
    case "Extra Sleepy":
      return {
        title: "Extra Sleepy",
        description: "More sleep than usual, often indicating growth spurts, recovery, or developmental leaps."
      };
    case "Active Feeding":
      return {
        title: "Active Feeding",
        description: "Increased appetite and feeding frequency, common during growth periods or increased activity."
      };
    case "Off Rhythm":
      return {
        title: "Off Rhythm",
        description: "Recovery after schedule changes or environmental shifts. Tomorrow often brings familiar patterns back."
      };
    default:
      return {
        title: pattern,
        description: "Unique daily pattern reflecting your baby's current needs and adjustments."
      };
  }
};

// Helper to get daily tone for rhythm tracking
const getDailyTone = (dayActivities: Activity[], babyBirthday?: string) => {
  const feeds = dayActivities.filter(a => a.type === 'feed').length;
  const naps = dayActivities.filter(a => a.type === 'nap').length;
  
  // Simplified tone detection (based on HomeTab logic)
  if (feeds >= 8 && naps >= 4) return { emoji: "🎯", text: "In Sync" };
  if (feeds >= 6 && feeds <= 8 && naps >= 3 && naps <= 4) return { emoji: "☀️", text: "Smooth Flow" };
  if (naps >= 5) return { emoji: "🌙", text: "Extra Sleepy" };
  if (feeds >= 10) return { emoji: "🍼", text: "Active Feeding" };
  if (feeds <= 4 || naps <= 1) return { emoji: "🌧", text: "Off Rhythm" };
  return { emoji: "🌿", text: "Building Rhythm" };
};

export const GuideTab = ({ activities, onGoToSettings }: GuideTabProps) => {
  const { household } = useHousehold();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [insightCards, setInsightCards] = useState<InsightCard[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [showToneEvolution, setShowToneEvolution] = useState(false);
  const [showPatternInsightModal, setShowPatternInsightModal] = useState(false);
  const [selectedPattern, setSelectedPattern] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const babyName = household?.baby_name || 'Baby';
  const babyAgeInWeeks = household?.baby_birthday ? 
    Math.floor((Date.now() - new Date(household.baby_birthday).getTime()) / (1000 * 60 * 60 * 24 * 7)) : 0;
  
  // Calculate tone frequencies for the last 7 days
  const toneFrequencies = (() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      return date;
    }).reverse();
    
    const tones = last7Days.map(date => {
      const dayActivities = activities.filter(a => {
        const activityDate = new Date(a.logged_at);
        return activityDate.toDateString() === date.toDateString();
      });
      return getDailyTone(dayActivities, household?.baby_birthday);
    });
    
    const frequency = tones.reduce((acc, tone) => {
      acc[tone.text] = (acc[tone.text] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Calculate current streak (consecutive days with same tone)
    let currentStreak = 0;
    let streakTone = "";
    if (tones.length > 0) {
      const lastTone = tones[tones.length - 1].text;
      for (let i = tones.length - 1; i >= 0; i--) {
        if (tones[i].text === lastTone) {
          currentStreak++;
        } else {
          break;
        }
      }
      if (currentStreak >= 2) {
        streakTone = lastTone;
      }
    }
    
    return { frequency, tones, currentStreak, streakTone };
  })();
  
  const currentTone = toneFrequencies.tones[toneFrequencies.tones.length - 1];
  const sortedTones = Object.entries(toneFrequencies.frequency)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);
  
  // Calculate last month's data for progress comparison
  const lastMonthData = (() => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    
    const lastMonthActivities = activities.filter(a => {
      const activityDate = new Date(a.logged_at);
      return activityDate >= sixtyDaysAgo && activityDate < thirtyDaysAgo;
    });
    
    const lastMonthDays = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - 60 + i);
      date.setHours(0, 0, 0, 0);
      return date;
    });
    
    const lastMonthTones = lastMonthDays.map(date => {
      const dayActivities = lastMonthActivities.filter(a => {
        const activityDate = new Date(a.logged_at);
        return activityDate.toDateString() === date.toDateString();
      });
      return getDailyTone(dayActivities, household?.baby_birthday);
    });
    
    const frequency = lastMonthTones.reduce((acc, tone) => {
      acc[tone.text] = (acc[tone.text] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return frequency;
  })();
  
  const thisMonthSmoothFlow = toneFrequencies.frequency["Smooth Flow"] || 0;
  const lastMonthSmoothFlow = lastMonthData["Smooth Flow"] || 0;
  const smoothFlowDiff = thisMonthSmoothFlow - lastMonthSmoothFlow;

  const CHAT_URL = "https://ufpavzvrtdzxwcwasaqj.functions.supabase.co/parenting-chat";

  const needsBirthdaySetup = !babyAgeInWeeks || babyAgeInWeeks === 0;

  // Check minimum data requirements (same as prediction engine)
  const naps = activities.filter(a => a.type === 'nap');
  const feeds = activities.filter(a => a.type === 'feed');
  const hasMinimumData = naps.length >= 4 && feeds.length >= 4;

  // Debug logging
  useEffect(() => {
    console.log('🔍 GuideTab Debug:', {
      totalActivities: activities.length,
      naps: naps.length,
      feeds: feeds.length,
      hasMinimumData,
      babyName,
      babyAgeInWeeks,
      hasInitialized,
      insightCardsCount: insightCards.length
    });
  }, [activities.length, naps.length, feeds.length, hasMinimumData, babyName, babyAgeInWeeks, hasInitialized, insightCards.length]);

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

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      console.log('🔐 GuideTab: invoking parenting-chat (initial)', { hasToken: !!token, CHAT_URL });
      if (!token) throw new Error('No active session token for parenting-chat');

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      console.log('🔐 GuideTab: invoking parenting-chat (chat)', { hasToken: !!token, CHAT_URL });
      if (!token) throw new Error('No active session token for parenting-chat');

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
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

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(input);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background pb-24">
      {/* Birthday Setup Prompt */}
      {needsBirthdaySetup && (
        <div className="p-4 bg-accent/20 border-b border-border/40">
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

      {/* Progress Ribbon */}
      {!needsBirthdaySetup && hasMinimumData && (
        <div className="px-4 pt-3 pb-2 bg-accent/10 border-b border-border/40">
          <p className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">This month:</span> {thisMonthSmoothFlow} Smooth Flow days 
            {smoothFlowDiff !== 0 && (
              <span className={smoothFlowDiff > 0 ? "text-green-600 dark:text-green-400" : "text-orange-600 dark:text-orange-400"}>
                {" "}({smoothFlowDiff > 0 ? "+" : ""}{smoothFlowDiff} vs last month)
              </span>
            )}
          </p>
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
        <div ref={scrollRef} className="px-4 space-y-6">
          {/* Pattern Header */}
          {!needsBirthdaySetup && hasMinimumData && (
            <div className="pt-4 space-y-4">
              <h1 className="text-xl font-semibold text-foreground">
                {babyName}'s Current Rhythm
              </h1>
              
              <TooltipProvider>
                <div className="space-y-2">
                  {sortedTones[0] && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-muted-foreground">Primary Pattern:</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm font-medium cursor-help text-foreground">{sortedTones[0][0]} ×{sortedTones[0][1]}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{getPatternTooltip(sortedTones[0][0])}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  {sortedTones[1] && (
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm text-muted-foreground">Secondary Pattern:</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm font-medium cursor-help text-foreground">{sortedTones[1][0]} ×{sortedTones[1][1]}</span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="text-xs">{getPatternTooltip(sortedTones[1][0])}</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  )}
                  
                  {/* Streak description */}
                  {toneFrequencies.currentStreak >= 2 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {toneFrequencies.currentStreak}-day '{toneFrequencies.streakTone}' streak — typically appears during steady growth or after routines stabilize.
                    </p>
                  )}
                  
                  {/* Tone Evolution Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowToneEvolution(!showToneEvolution)}
                    className="text-xs -ml-2 mt-1"
                  >
                    {showToneEvolution ? "Hide" : "View"} pattern evolution
                    <TrendingUp className="w-3 h-3 ml-1" />
                  </Button>
                  
                  {/* Tone Evolution Visualization */}
                  {showToneEvolution && (
                    <div className="mt-2 p-3 bg-accent/10 rounded-lg border border-border/40">
                      <div className="flex items-center gap-2 mb-2">
                        {toneFrequencies.tones.map((tone, idx) => (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedPattern(tone.text);
                              setShowPatternInsightModal(true);
                            }}
                            className="flex flex-col items-center flex-1 cursor-pointer hover:bg-accent/20 rounded p-2 transition-colors"
                          >
                            <div className="text-lg mb-1">{tone.emoji}</div>
                            <div className="text-[10px] text-muted-foreground text-center leading-tight">
                              {tone.text.split(' ')[0]}
                            </div>
                          </button>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        Tap any day to learn what each pattern means
                      </p>
                    </div>
                  )}
                </div>
              </TooltipProvider>
            </div>
          )}

          {/* Pattern Summary */}
          {hasMinimumData && (
            <div className="space-y-6 border-t border-border/40 pt-6">
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Pattern Summary
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {babyName}'s been waking a bit earlier and staying engaged longer between naps — classic signs their rhythm is consolidating. These transitions can cause shorter naps for a few days while their body rebalances.
                </p>
              </div>

              {/* What This Tells Us */}
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  What This Tells Us
                </h2>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Daytime alertness is increasing as sleep cycles consolidate.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Appetite may fluctuate while energy use rises.
                    </p>
                  </div>
                </div>
              </div>

              {/* What To Watch For */}
              <div>
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  What To Watch For
                </h2>
                <div className="space-y-2">
                  <div className="flex items-start gap-2">
                    <Activity className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      If shorter naps persist beyond a week, they may be ready to adjust their routine.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <Activity className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      Look for signs of overtiredness around bedtime — an earlier start can help.
                    </p>
                  </div>
                </div>
              </div>

              {/* Encouragement Line */}
              <div className="p-4 bg-accent/10 rounded-lg border border-border/40">
                <p className="text-sm text-foreground leading-relaxed">
                  Each streak builds the foundation for the next — this one shows {babyName} is ready for more active days ahead.
                </p>
              </div>
            </div>
          )}

          {/* Trend Connection */}
          {hasMinimumData && (
            <div className="p-4 bg-accent/10 rounded-lg border border-border/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium mb-1">
                    Curious how this compares to last week?
                  </p>
                  <p className="text-xs text-muted-foreground">
                    View detailed rhythm trends and patterns over time
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="flex-shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Chat Messages */}
          {messages.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-border/40">
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
                        : "bg-accent/30"
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
                  <div className="bg-accent/30 rounded-2xl px-4 py-3">
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
        </div>
      </ScrollArea>

      {/* Chat Input */}
      <div className="border-t border-border/40 bg-background p-4">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyPress}
            placeholder="Ask about patterns, routines, or development..."
            className="min-h-[44px] max-h-32 resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={() => handleSendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-[44px] w-[44px] flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Pattern Insight Modal */}
      <Dialog open={showPatternInsightModal} onOpenChange={setShowPatternInsightModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedPattern && getPatternInsight(selectedPattern).title}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground leading-relaxed">
            {selectedPattern && getPatternInsight(selectedPattern).description}
          </p>
        </DialogContent>
      </Dialog>
    </div>
  );
};
