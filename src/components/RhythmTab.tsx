import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { 
  Sprout, Send, Calendar, Activity, TrendingUp, 
  Sun, Moon, Target, Milk, CloudRain, 
  Clock, Timer, Bed, Lightbulb, CheckSquare, 
  ArrowRight, Compass, ChevronDown
} from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getDailySentiment } from "@/utils/sentimentAnalysis";

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

interface RhythmTabProps {
  activities: Activity[];
  onGoToSettings?: () => void;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RhythmSections {
  data_pulse: {
    metrics: Array<{ name: string; change: string }>;
    note: string;
  };
  what_to_know: string[];
  what_to_do: string[];
  whats_next: string;
  prep_tip: string;
}

interface InsightCard {
  id: string;
  icon: React.ReactNode;
  title: string;
  content: string;
  questions: string[];
}

// Simple text formatter - uses React's built-in XSS protection
const formatText = (text: string) => {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map((paragraph, idx) => {
    // Parse bold text **text**
    const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
    
    // Check if this paragraph should be a list
    const isListItem = paragraph.trim().startsWith('- ');
    
    if (isListItem) {
      // Handle list items
      const listItems = paragraph.split('\n').filter(line => line.trim().startsWith('- '));
      return (
        <ul key={idx} className="list-disc pl-5 space-y-1 mb-3">
          {listItems.map((item, itemIdx) => {
            const itemText = item.replace(/^-\s*/, '');
            const itemParts = itemText.split(/(\*\*[^*]+\*\*)/g);
            return (
              <li key={itemIdx}>
                {itemParts.map((part, partIdx) => {
                  if (part.startsWith('**') && part.endsWith('**')) {
                    return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
                  }
                  return part;
                })}
              </li>
            );
          })}
        </ul>
      );
    }
    
    return (
      <div key={idx} className={idx < paragraphs.length - 1 ? "mb-3" : ""}>
        {parts.map((part, partIdx) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return <strong key={partIdx}>{part.slice(2, -2)}</strong>;
          }
          return part;
        })}
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

// Helper to get daily tone for rhythm tracking - now uses shared sentiment logic
const getDailyTone = (dayActivities: Activity[], allActivities: Activity[], babyBirthday?: string) => {
  // Calculate baby's age in months from birthday
  const babyAgeMonths = babyBirthday 
    ? Math.floor((Date.now() - new Date(babyBirthday).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
    : null;
  
  // Use the shared sentiment analysis function
  return getDailySentiment(dayActivities, allActivities, babyAgeMonths, 12); // Use noon as default hour
};

export const RhythmTab = ({ activities, onGoToSettings }: RhythmTabProps) => {
  // ===== ALL HOOKS FIRST (must be before any conditional returns) =====
  const { household, loading: householdLoading } = useHousehold();
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
  const [rhythmSections, setRhythmSections] = useState<RhythmSections | null>(null);
  const [rhythmSectionsLoading, setRhythmSectionsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ===== DERIVED VALUES (safe to calculate even if household is null) =====
  const babyName = household?.baby_name || 'Baby';
  const babyAgeInWeeks = household?.baby_birthday ? 
    Math.floor((Date.now() - new Date(household.baby_birthday).getTime()) / (1000 * 60 * 60 * 24 * 7)) : 0;
  
  // Calculate tone frequencies for the last 7 days (safe even without household)
  const toneFrequencies = (() => {
    if (!household) return { frequency: {}, tones: [], currentStreak: 0, streakTone: "" };
    
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
      return getDailyTone(dayActivities, activities, household.baby_birthday);
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
    if (pattern === "Smooth Flow") return "☀️";
    if (pattern === "Building Rhythm") return "🌿";
    if (pattern === "In Sync") return "🎯";
    if (pattern === "Extra Sleepy") return "🌙";
    if (pattern === "Active Feeding") return "🍼";
    if (pattern === "Off Rhythm") return "🌧";
    return "🌿";
  };

  // Calculate last month's data for progress comparison (safe even without household)
  const lastMonthData = (() => {
    if (!household) return {};
    
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
      return getDailyTone(dayActivities, activities, household.baby_birthday);
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

  // ===== ALL EFFECTS =====
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

  // Fetch guide sections once daily at 5am
  useEffect(() => {
    if (!hasMinimumData || !user || !household) return;
    
    const fetchGuideSections = async () => {
      setRhythmSectionsLoading(true);
      try {
        console.log('🔄 Fetching rhythm sections from edge function...');
        const { data, error } = await supabase.functions.invoke('generate-rhythm-sections');
        
        if (error) {
          console.error('❌ Error fetching guide sections:', error);
          return;
        }
        
        if (data) {
          console.log('✅ Guide sections fetched:', data);
          setRhythmSections(data);
          localStorage.setItem('rhythmSections', JSON.stringify(data));
          localStorage.setItem('rhythmSectionsLastFetch', new Date().toISOString());
        }
      } catch (err) {
        console.error('❌ Failed to fetch guide sections:', err);
      } finally {
        setRhythmSectionsLoading(false);
      }
    };

    // Check if we need to fetch
    const lastFetch = localStorage.getItem('rhythmSectionsLastFetch');
    const cached = localStorage.getItem('rhythmSections');
    const now = new Date();
    const fiveAM = new Date();
    fiveAM.setHours(5, 0, 0, 0);
    
    // Load cached data first
    if (cached && !rhythmSections) {
      try {
        const parsed = JSON.parse(cached);
        console.log('📦 Loaded cached guide sections:', parsed);
        // Check if cached data has new format with data_pulse
        if (!parsed.data_pulse) {
          console.log('⚠️ Old cache format detected, will fetch fresh data');
          localStorage.removeItem('rhythmSections');
          localStorage.removeItem('rhythmSectionsLastFetch');
        } else {
          setRhythmSections(parsed);
        }
      } catch (e) {
        console.error('Failed to parse cached rhythm sections:', e);
        localStorage.removeItem('rhythmSections');
      }
    }
    
    // Determine if we should fetch new data - only once per day at 5am
    let shouldFetch = false;
    
    if (!lastFetch) {
      // Never fetched before, fetch now if we're past 5am today
      shouldFetch = now >= fiveAM;
    } else {
      const lastFetchDate = new Date(lastFetch);
      // Check if last fetch was before today's 5am
      shouldFetch = now >= fiveAM && lastFetchDate < fiveAM;
    }
    
    if (shouldFetch && hasMinimumData) {
      console.log('🚀 Fetching fresh guide sections...');
      fetchGuideSections();
    }
  }, [hasMinimumData, user, rhythmSections, household]);

  // Load initial insight
  useEffect(() => {
    if (!hasInitialized && hasMinimumData && babyName && babyAgeInWeeks > 0 && household) {
      setHasInitialized(true);
      loadInitialInsight();
    }
  }, [hasInitialized, hasMinimumData, babyName, babyAgeInWeeks, household]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

  // ===== HANDLERS =====

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
          householdId: household.id,
          babyName,
          babyAgeInWeeks,
          babySex: household.baby_sex,
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
          householdId: household.id,
          babyName,
          babyAgeInWeeks,
          babySex: household.baby_sex,
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
      {/* Loading State */}
      {householdLoading || !household ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading guidance...</p>
          </div>
        </div>
      ) : (
        <>
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



          {/* Main Content */}
          <ScrollArea className="flex-1">
        <div ref={scrollRef} className="px-4 pt-4 space-y-6">
          {/* Streak Chip */}
          {!needsBirthdaySetup && hasMinimumData && toneFrequencies.currentStreak >= 2 && (
            <div className="space-y-3">
              <button 
                onClick={() => setShowStreakInsight(!showStreakInsight)}
                className="text-left"
              >
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/20 hover:bg-accent/30 transition-colors">
                  <span className="text-sm">{getPatternEmoji(toneFrequencies.streakTone)}</span>
                  <span className="text-sm font-medium text-accent-foreground">{toneFrequencies.streakTone}</span>
                </div>
              </button>
              
              {showStreakInsight && (
                <p className="text-sm text-muted-foreground leading-relaxed pl-1 italic">
                  {getPatternTooltip(toneFrequencies.streakTone)}
                </p>
              )}

              <p className="text-sm text-muted-foreground leading-relaxed italic">
                {toneFrequencies.currentStreak}-day &apos;{toneFrequencies.streakTone}&apos; streak — typically appears during steady growth or after routines stabilize.
              </p>
            </div>
          )}

          {/* Guide Sections Loading State */}
          {!hasMinimumData && !needsBirthdaySetup && (
            <div className="p-6 bg-accent/10 rounded-lg border border-border/40 text-center">
              <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                Track at least 4 naps and 4 feeds to see personalized guidance
              </p>
            </div>
          )}

          {/* Guide Sections Loading Indicator */}
          {hasMinimumData && rhythmSectionsLoading && !rhythmSections && (
            <div className="p-6 bg-accent/10 rounded-lg border border-border/40 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-3"></div>
              <p className="text-sm text-muted-foreground">
                Generating personalized guidance...
              </p>
            </div>
          )}

          {/* Data Pulse */}
          {hasMinimumData && rhythmSections && rhythmSections.data_pulse && (
            <div className="p-4 bg-accent/10 rounded-lg border border-border/40">
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-border/30">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-primary" />
                  <h3 className="text-xs font-medium text-foreground uppercase tracking-wider">Data Pulse</h3>
                </div>
                <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Change vs Last 5 Days</span>
              </div>
              
              <div className="space-y-2">
                
                {rhythmSections.data_pulse.metrics.length > 0 ? (
                  rhythmSections.data_pulse.metrics.map((metric, idx) => {
                    const getMetricIcon = () => {
                      if (metric.name === 'Total sleep') return <Moon className="w-4 h-4 text-primary" />;
                      if (metric.name === 'Naps') return <Bed className="w-4 h-4 text-primary" />;
                      if (metric.name === 'Feed volume') return <Milk className="w-4 h-4 text-primary" />;
                      if (metric.name === 'Wake average') return <Clock className="w-4 h-4 text-primary" />;
                      if (metric.name === 'Nap duration') return <Bed className="w-4 h-4 text-primary" />;
                      if (metric.name === 'Feed duration') return <Timer className="w-4 h-4 text-primary" />;
                      return <Activity className="w-4 h-4 text-primary" />;
                    };
                    
                    return (
                      <div key={idx} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getMetricIcon()}
                          <span className="text-sm text-foreground">{metric.name}</span>
                        </div>
                        <span className="text-sm font-medium text-foreground">
                          {metric.change}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-2">
                    No significant changes detected
                  </p>
                )}
                
                <p className="text-xs text-muted-foreground pt-2 border-t border-border/20">
                  {rhythmSections.data_pulse.note}
                </p>
              </div>
            </div>
          )}

          {/* What to Know */}
          {hasMinimumData && rhythmSections && rhythmSections.what_to_know && (
            <div className="space-y-3">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full group">
                    <div className="flex items-center gap-2">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-medium text-foreground uppercase tracking-wider">What to Know</h3>
                    </div>
                    {rhythmSections.what_to_know.length > 1 && (
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform group-data-[state=open]:rotate-180" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <div className="space-y-2 pl-1 mt-3">
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-foreground mt-2 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {rhythmSections.what_to_know[0]}
                    </p>
                  </div>
                  {rhythmSections.what_to_know.length > 1 && (
                    <CollapsibleContent>
                      {rhythmSections.what_to_know.slice(1).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 mt-2">
                          <div className="w-1 h-1 rounded-full bg-foreground mt-2 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {item}
                          </p>
                        </div>
                      ))}
                    </CollapsibleContent>
                  )}
                </div>
              </Collapsible>
            </div>
          )}

          {/* What To Do */}
          {hasMinimumData && rhythmSections && rhythmSections.what_to_do && (
            <div className="space-y-3">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center justify-between w-full group">
                    <div className="flex items-center gap-2">
                      <CheckSquare className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-medium text-foreground uppercase tracking-wider">What To Do</h3>
                    </div>
                    {rhythmSections.what_to_do.length > 1 && (
                      <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-transform group-data-[state=open]:rotate-180" />
                    )}
                  </button>
                </CollapsibleTrigger>
                <div className="space-y-2 pl-1 mt-3">
                  <div className="flex items-start gap-2">
                    <div className="w-1 h-1 rounded-full bg-foreground mt-2 flex-shrink-0" />
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {rhythmSections.what_to_do[0]}
                    </p>
                  </div>
                  {rhythmSections.what_to_do.length > 1 && (
                    <CollapsibleContent>
                      {rhythmSections.what_to_do.slice(1).map((item, idx) => (
                        <div key={idx} className="flex items-start gap-2 mt-2">
                          <div className="w-1 h-1 rounded-full bg-foreground mt-2 flex-shrink-0" />
                          <p className="text-sm text-muted-foreground leading-relaxed">
                            {item}
                          </p>
                        </div>
                      ))}
                    </CollapsibleContent>
                  )}
                </div>
              </Collapsible>
            </div>
          )}

          {/* What's Next */}
          {hasMinimumData && rhythmSections && rhythmSections.whats_next && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <ArrowRight className="w-4 h-4 text-primary" />
                <h3 className="text-xs font-medium text-foreground uppercase tracking-wider">What's Next</h3>
              </div>
              <div className="space-y-3 pl-1">
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {rhythmSections.whats_next}
                </p>
                {rhythmSections.prep_tip && (
                  <div className="flex items-start gap-2 p-3 bg-accent/10 rounded-lg border border-border/30">
                    <Compass className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-foreground">
                      <span className="font-medium">Prep tip:</span> {rhythmSections.prep_tip}
                    </p>
                  </div>
                )}
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
                      {formatText(msg.content)}
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
      <Separator className="mt-4 bg-border" />
      <div className="bg-background p-4">
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
        </>
      )}
    </div>
  );
};
