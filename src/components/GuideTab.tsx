import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Sprout, Send, Calendar, Activity, TrendingUp } from "lucide-react";
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
  const [showPrimaryInsight, setShowPrimaryInsight] = useState(false);
  const [showSecondaryInsight, setShowSecondaryInsight] = useState(false);
  const [showStreakInsight, setShowStreakInsight] = useState(false);
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
  
  // Get emoji for each pattern
  const getPatternEmoji = (pattern: string): string => {
    const sampleTone = getDailyTone([{ id: '', type: 'feed', logged_at: '', details: {} }], household?.baby_birthday);
    // Find the emoji from our tone calculations
    if (pattern === "Smooth Flow") return "☀️";
    if (pattern === "Building Rhythm") return "🌿";
    if (pattern === "In Sync") return "🎯";
    if (pattern === "Extra Sleepy") return "🌙";
    if (pattern === "Active Feeding") return "🍼";
    if (pattern === "Off Rhythm") return "🌧";
    return "🌿";
  };
  
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
          {/* Streak Chip */}
          {!needsBirthdaySetup && hasMinimumData && toneFrequencies.currentStreak >= 2 && (
            <div className="pt-4 space-y-3">
              <button 
                onClick={() => setShowStreakInsight(!showStreakInsight)}
                className="text-left"
              >
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors">
                  <span className="text-base">{getPatternEmoji(toneFrequencies.streakTone)}</span>
                  <span className="text-base font-medium text-accent-foreground">{toneFrequencies.streakTone} ×{toneFrequencies.currentStreak}</span>
                </div>
              </button>
              
              {showStreakInsight && (
                <p className="text-sm text-muted-foreground leading-relaxed pl-1 italic">
                  {toneFrequencies.currentStreak}-day '{toneFrequencies.streakTone}' streak — typically appears during steady growth or after routines stabilize.
                </p>
              )}
            </div>
          )}

          {/* Data Pulse */}
          {hasMinimumData && (
            <div className="p-4 bg-accent/10 rounded-lg border border-border/40">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 bg-primary rounded-sm" />
                <h3 className="text-sm font-semibold text-foreground">Data Pulse</h3>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between pb-3 border-b border-border/30">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Indicator</span>
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Change vs Last 3 Days</span>
                </div>
                
                {/* Total Sleep */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">💤</span>
                    <span className="text-sm text-foreground">Total sleep</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {(() => {
                      const now = new Date();
                      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                      const threeDaysAgo = new Date(todayStart);
                      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                      
                      const todayNaps = activities.filter(a => {
                        if (a.type !== 'nap') return false;
                        const actDate = new Date(a.logged_at);
                        const actDateStart = new Date(actDate.getFullYear(), actDate.getMonth(), actDate.getDate());
                        return actDateStart.getTime() === todayStart.getTime() && a.details?.duration;
                      });
                      
                      const lastThreeDaysNaps = activities.filter(a => {
                        if (a.type !== 'nap') return false;
                        const actDate = new Date(a.logged_at);
                        const actDateStart = new Date(actDate.getFullYear(), actDate.getMonth(), actDate.getDate());
                        return actDateStart >= threeDaysAgo && actDateStart < todayStart && a.details?.duration;
                      });
                      
                      const todayTotal = todayNaps.reduce((sum, n) => sum + (parseInt(n.details?.duration) || 0), 0);
                      const avgLast3 = lastThreeDaysNaps.length > 0 
                        ? lastThreeDaysNaps.reduce((sum, n) => sum + (parseInt(n.details?.duration) || 0), 0) / 3
                        : 0;
                      
                      const hours = Math.floor(todayTotal / 60);
                      const mins = todayTotal % 60;
                      const change = avgLast3 > 0 ? ((todayTotal - avgLast3) / avgLast3 * 100) : 0;
                      
                      return todayTotal > 0 
                        ? `${hours}h ${mins}m (${change > 0 ? '+' : ''}${change.toFixed(0)}%)`
                        : '0h 0m (—)';
                    })()}
                  </span>
                </div>
                
                {/* Feed Volume */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🍼</span>
                    <span className="text-sm text-foreground">Feed volume</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const threeDaysAgo = new Date(today);
                      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                      
                      const todayFeeds = activities.filter(a => {
                        const actDate = new Date(a.logged_at);
                        return a.type === 'feed' && actDate >= today && a.details?.quantity;
                      });
                      
                      const lastThreeDaysFeeds = activities.filter(a => {
                        const actDate = new Date(a.logged_at);
                        return a.type === 'feed' && actDate >= threeDaysAgo && actDate < today && a.details?.quantity;
                      });
                      
                      const todayTotal = todayFeeds.reduce((sum, f) => sum + (parseFloat(f.details?.quantity) || 0), 0);
                      const avgLast3 = lastThreeDaysFeeds.length > 0
                        ? lastThreeDaysFeeds.reduce((sum, f) => sum + (parseFloat(f.details?.quantity) || 0), 0) / 3
                        : 0;
                      
                      const change = avgLast3 > 0 ? ((todayTotal - avgLast3) / avgLast3 * 100) : 0;
                      
                      return `${change > 0 ? '+' : ''}${change.toFixed(0)}%`;
                    })()}
                  </span>
                </div>
                
                {/* Wake Average */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🌡️</span>
                    <span className="text-sm text-foreground">Wake average</span>
                  </div>
                  <span className="text-sm font-medium text-foreground">
                    {(() => {
                      const today = new Date();
                      today.setHours(0, 0, 0, 0);
                      const threeDaysAgo = new Date(today);
                      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
                      
                      const todayNaps = activities.filter(a => {
                        const actDate = new Date(a.logged_at);
                        return a.type === 'nap' && actDate >= today;
                      }).sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
                      
                      const lastThreeDaysNaps = activities.filter(a => {
                        const actDate = new Date(a.logged_at);
                        return a.type === 'nap' && actDate >= threeDaysAgo && actDate < today;
                      }).sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
                      
                      // Calculate wake windows (time between naps)
                      const calcAvgWake = (naps: any[]) => {
                        if (naps.length < 2) return 0;
                        let totalWake = 0;
                        for (let i = 1; i < naps.length; i++) {
                          const prevEnd = new Date(naps[i-1].logged_at).getTime() + ((naps[i-1].details?.duration || 0) * 60000);
                          const nextStart = new Date(naps[i].logged_at).getTime();
                          totalWake += (nextStart - prevEnd) / 60000; // convert to minutes
                        }
                        return totalWake / (naps.length - 1);
                      };
                      
                      const todayAvg = calcAvgWake(todayNaps);
                      const last3Avg = calcAvgWake(lastThreeDaysNaps);
                      
                      const hours = Math.floor(todayAvg / 60);
                      const mins = Math.round(todayAvg % 60);
                      const diffMins = Math.round(todayAvg - last3Avg);
                      
                      return todayAvg > 0 
                        ? `${hours}h ${mins}m (${diffMins > 0 ? '+' : ''}${diffMins} min)`
                        : 'N/A';
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* What to Know */}
          {hasMinimumData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔹</span>
                <h3 className="text-sm font-semibold text-foreground">What to Know</h3>
              </div>
              <div className="space-y-2 pl-1">
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-foreground mt-2 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Rhythm stability suggests he's adapting well to his current schedule.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-foreground mt-2 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Small appetite bump is typical after a few smooth days — it often precedes a developmental leap.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-foreground mt-2 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Expect brief restlessness midweek as the streak tapers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* What To Do */}
          {hasMinimumData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔹</span>
                <h3 className="text-sm font-semibold text-foreground">What To Do</h3>
              </div>
              <div className="space-y-2 pl-1">
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-foreground mt-2 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Keep current nap structure — no changes yet.
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-foreground mt-2 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Try one longer awake stretch before afternoon nap (~3h).
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1 h-1 rounded-full bg-foreground mt-2 flex-shrink-0" />
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Keep bedtime consistent — it's anchoring this streak.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* What's Next */}
          {hasMinimumData && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm">🔹</span>
                <h3 className="text-sm font-semibold text-foreground">What's Next</h3>
              </div>
              <div className="space-y-3 pl-1">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  Smooth Flow streaks usually shift after 5–7 days.
                  If a "Building Rhythm" tone appears next, you'll likely see nap experimentation or earlier wakings — totally normal.
                </p>
                <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg border border-border/30">
                  <span className="text-sm flex-shrink-0">🧭</span>
                  <p className="text-sm text-foreground">
                    <span className="font-medium">Prep tip:</span> have extra wind-down time ready for the transition day.
                  </p>
                </div>
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
    </div>
  );
};
