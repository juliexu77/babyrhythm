import { useState, useRef, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Separator } from "@/components/ui/separator";
import { 
  Send, Calendar, Activity, TrendingUp, 
  Sun, Moon, Target, Milk, CloudRain, 
  Clock, Timer, Bed, Lightbulb, CheckSquare, 
  ArrowRight, Compass, ChevronDown
} from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { supabase } from "@/integrations/supabase/client";
import { getDailySentiment } from "@/utils/sentimentAnalysis";
import { generateAdaptiveSchedule, type AdaptiveSchedule, type AISchedulePrediction } from "@/utils/adaptiveScheduleGenerator";
import { ScheduleTimeline } from "@/components/guide/ScheduleTimeline";
import { useSmartReminders } from "@/hooks/useSmartReminders";
import { useMissedActivityDetection } from "@/hooks/useMissedActivityDetection";
import { MissedActivityPrompt } from "@/components/MissedActivityPrompt";
import { HeroInsightCard } from "@/components/guide/HeroInsightCard";
import { WhyThisMattersCard } from "@/components/guide/WhyThisMattersCard";
import { TodayAtGlance } from "@/components/guide/TodayAtGlance";
import { UnifiedInsightCard } from "@/components/guide/UnifiedInsightCard";

import { isNightSleep, isDaytimeNap } from "@/utils/napClassification";


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

export const GuideTab = ({ activities, onGoToSettings }: GuideTabProps) => {
  // ===== ALL HOOKS FIRST (must be before any conditional returns) =====
  const { household, loading: householdLoading } = useHousehold();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [insightCards, setInsightCards] = useState<InsightCard[]>([]);
  const [hasInitialized, setHasInitialized] = useState(false);
  const [rhythmInsights, setRhythmInsights] = useState<{
    heroInsight: string;
    whatToDo?: string[];
    whatsNext?: string;
    prepTip?: string;
    whyThisMatters?: string;
    confidenceScore: string;
  } | null>(null);
  const [rhythmInsightsLoading, setRhythmInsightsLoading] = useState(false);
  const [aiPrediction, setAiPrediction] = useState<AISchedulePrediction | null>(null);
  const [aiPredictionLoading, setAiPredictionLoading] = useState(false);
  const [isAdjusting, setIsAdjusting] = useState(false);
  const [adjustmentContext, setAdjustmentContext] = useState<string>("");
  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    const stored = localStorage.getItem('smartRemindersEnabled');
    return stored !== null ? stored === 'true' : true; // Default enabled
  });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [patternMilestones, setPatternMilestones] = useState<Set<string>>(() => {
    const stored = localStorage.getItem('patternMilestones');
    return stored ? new Set(JSON.parse(stored)) : new Set();
  });

  // ===== DERIVED VALUES (safe to calculate even if household is null) =====
  const babyName = household?.baby_name || 'Baby';
  const babyAgeInWeeks = household?.baby_birthday ? 
    Math.floor((Date.now() - new Date(household.baby_birthday).getTime()) / (1000 * 60 * 60 * 24 * 7)) : 0;
  
  // Get night sleep window detection
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();

  // Normalize activities for schedule predictor
  const normalizedActivities = useMemo(() => {
    return activities.map(a => ({
      id: a.id,
      type: a.type,
      timestamp: a.logged_at,
      logged_at: a.logged_at,
      details: a.details ?? {}
    }));
  }, [activities]);
  
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
  
  // Get icon component for each pattern
  const getPatternIcon = (pattern: string) => {
    if (pattern === "Smooth Flow") return Sun;
    if (pattern === "Building Rhythm") return TrendingUp;
    if (pattern === "In Sync") return Target;
    if (pattern === "Extra Sleepy") return Moon;
    if (pattern === "Active Feeding") return Milk;
    if (pattern === "Off Rhythm") return CloudRain;
    return TrendingUp;
  };
  
  // Get icon color for each pattern
  const getPatternColor = (pattern: string): string => {
    if (pattern === "Smooth Flow") return "text-amber-600";
    if (pattern === "Building Rhythm") return "text-green-600";
    if (pattern === "In Sync") return "text-primary";
    if (pattern === "Extra Sleepy") return "text-blue-600";
    if (pattern === "Active Feeding") return "text-purple-600";
    if (pattern === "Off Rhythm") return "text-slate-600";
    return "text-green-600";
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

  // Tiered data requirements
  // Filter out night sleep - only count daytime naps
  const allSleepActivities = activities.filter(a => a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour));
  const daytimeNaps = allSleepActivities;
  
  const feeds = activities.filter(a => a.type === 'feed');
  const totalActivities = activities.length;
  
  // Tier 1: Age-based predictions (1+ activity)
  const hasTier1Data = totalActivities >= 1;
  
  // Tier 2: Pattern emerging (4+ total activities)
  const hasTier2Data = totalActivities >= 4 && !needsBirthdaySetup;
  
  // Tier 3: Personalized AI (10+ total activities AND 4+ daytime naps AND 4+ feeds)
  // This ensures prediction engine has meaningful data (excludes night sleep)
  const hasTier3Data = totalActivities >= 10 && daytimeNaps.length >= 4 && feeds.length >= 4;
  
  // Progress toward unlocking insights
  const required = { activities: 10, feeds: 4, naps: 4 };
  const remaining = {
    activities: Math.max(0, required.activities - totalActivities),
    feeds: Math.max(0, required.feeds - feeds.length),
    naps: Math.max(0, required.naps - daytimeNaps.length),
  };
  const unlockPercent = Math.min(100, Math.round(((required.activities - remaining.activities) / required.activities) * 100));
  
  // Show schedule at Tier 1, AI insights at Tier 3
  const hasMinimumData = hasTier1Data;

  // Get user's timezone
  const userTimezone = useMemo(() => {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }, []);

  // Track today's key events for schedule regeneration triggers
  const todayKeyEvents = useMemo(() => {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const todayActivities = activities.filter(a => {
      const actDate = new Date(a.logged_at);
      return actDate >= todayStart;
    });
    
    // Find wake time (night sleep with end time)
    const wakeActivity = todayActivities.find(a => 
      a.type === 'nap' && a.details?.endTime && a.details?.isNightSleep
    );
    
    // Find first nap (daytime nap, not night sleep)
    const firstNap = todayActivities
      .filter(a => a.type === 'nap' && !a.details?.isNightSleep && a.details?.startTime)
      .sort((a, b) => {
        const timeA = a.details?.startTime || '';
        const timeB = b.details?.startTime || '';
        return timeA.localeCompare(timeB);
      })[0];
    
    return {
      hasWake: !!wakeActivity,
      wakeTime: wakeActivity?.details?.endTime,
      hasFirstNap: !!firstNap,
      firstNapTime: firstNap?.details?.startTime,
      firstNapId: firstNap?.id
    };
  }, [activities]);

  // Memoized adaptive schedule using prediction engine
  const adaptiveSchedule = useMemo(() => {
    // Show schedule with Tier 1 data (1+ activity) but require at least 1 nap
    const hasAnyNap = activities.filter(a => a.type === 'nap').length >= 1;
    
    if (!hasTier1Data || !hasAnyNap || !household?.baby_birthday) {
      return null;
    }
    
    try {
      
      // Convert activities to the format expected by prediction engine
      const activitiesForEngine = activities.map(a => ({
        id: a.id,
        type: a.type as any,
        time: a.details?.displayTime || new Date(a.logged_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        loggedAt: a.logged_at,
        timezone: userTimezone,
        details: a.details
      }));
      
      const schedule = generateAdaptiveSchedule(
        activitiesForEngine, 
        household.baby_birthday, 
        hasTier3Data ? aiPrediction : null, // Only use AI prediction if we have enough data
        activities.length, // Pass total activities count for "basedOn" text
        false, // forceShowAllNaps
        nightSleepStartHour,
        nightSleepEndHour,
        userTimezone
      );
      return schedule;
    } catch (error) {
      return null;
    }
  }, [activities, household?.baby_birthday, hasTier1Data, userTimezone, aiPrediction, hasTier3Data, activities.length, todayKeyEvents]);

  // Use adaptive schedule directly
  const displaySchedule = adaptiveSchedule;
  
  // Calculate baby age for anticipatory transition windows
  const babyAgeInDays = useMemo(() => {
    if (!household?.baby_birthday) return null;
    const birthDate = new Date(household.baby_birthday);
    const today = new Date();
    return Math.floor((today.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24));
  }, [household?.baby_birthday]);

  // Age-based transition window detection (anticipatory)
  const transitionWindow = useMemo(() => {
    if (!babyAgeInDays) return null;
    
    if (babyAgeInDays >= 90 && babyAgeInDays <= 120) {
      return { from: 4, to: 3, label: "3-4 month transition" };
    }
    if (babyAgeInDays >= 180 && babyAgeInDays <= 270) {
      return { from: 3, to: 2, label: "6-9 month transition" };
    }
    if (babyAgeInDays >= 365 && babyAgeInDays <= 547) {
      return { from: 2, to: 1, label: "12-18 month transition" };
    }
    return null;
  }, [babyAgeInDays]);

  // Combined transition detection: AI reactive OR age-based anticipatory
  const shouldShowTransition = aiPrediction?.is_transitioning || transitionWindow !== null;
  const effectiveTransitionCounts = transitionWindow 
    ? { current: transitionWindow.from, transitioning: transitionWindow.to }
    : (aiPrediction?.is_transitioning 
        ? { current: aiPrediction.total_naps_today, transitioning: aiPrediction.total_naps_today - 1 }
        : undefined);
  
  // Auto-recalculate schedule when morning wake is logged
  useEffect(() => {
    if (!hasTier3Data) return;
    
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    // Check if there's a wake-up that ENDED today (not just logged today)
    const todayWakeActivity = activities.find(a => {
      // Detect morning wake from night sleep end
      if (a.type === 'nap' && a.details?.endTime && isNightSleep(a, nightSleepStartHour, nightSleepEndHour)) {
        const timeMatch = a.details.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hour = parseInt(timeMatch[1]);
          const period = timeMatch[3].toUpperCase();
          if (period === 'PM' && hour !== 12) hour += 12;
          if (period === 'AM' && hour === 12) hour = 0;
          
          // Check if this is a morning wake (4-11 AM)
          if (hour >= 4 && hour <= 11) {
            // For night sleeps, check if it ended today (not when it was logged)
            // Night sleeps can be logged yesterday but end today
            const actDate = new Date(a.logged_at);
            const loggedDate = new Date(actDate.getFullYear(), actDate.getMonth(), actDate.getDate());
            
            // If logged yesterday and ended this morning, that's today's wake
            if (loggedDate < todayStart) {
              return true; // Night sleep from yesterday ending this morning
            }
            // If logged today and ended this morning, that's also today's wake
            if (actDate >= todayStart) {
              return true;
            }
          }
        }
      }
      return false;
    });
    
    // Auto-clear cache when morning wake is detected to force recalculation
    if (todayWakeActivity) {
      const hasRecalculatedToday = sessionStorage.getItem(`schedule-recalc-${todayStart.toDateString()}`);
      if (!hasRecalculatedToday) {
        localStorage.removeItem('aiPrediction');
        localStorage.removeItem('aiPredictionLastFetch');
        sessionStorage.setItem(`schedule-recalc-${todayStart.toDateString()}`, 'true');
      }
    }
  }, [activities, hasTier3Data, nightSleepStartHour, nightSleepEndHour]);
  
  // Listen for activity logs and trigger context-aware adjustments
  useEffect(() => {
    const handleActivityLogged = () => {
      if (!hasTier3Data) return;
      
      // Get the most recent activity
      const recentActivity = activities[0];
      if (!recentActivity) return;
      
      // Check if this activity was just logged (within last 5 seconds)
      const activityTime = new Date(recentActivity.logged_at);
      const now = new Date();
      const timeDiff = now.getTime() - activityTime.getTime();
      if (timeDiff > 5000) return; // Only react to very recent activities
      
      setIsAdjusting(true);
      
      // Context-aware messages based on activity type and details
      if (recentActivity.type === 'nap' && recentActivity.details?.endTime) {
        // Nap ended
        const startTime = new Date(recentActivity.logged_at);
        const endTimeStr = recentActivity.details.endTime;
        const endMatch = endTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        
        if (endMatch) {
          let endHour = parseInt(endMatch[1]);
          const endMinute = parseInt(endMatch[2]);
          const period = endMatch[3].toUpperCase();
          if (period === 'PM' && endHour !== 12) endHour += 12;
          if (period === 'AM' && endHour === 12) endHour = 0;
          
          const duration = (endHour * 60 + endMinute - (startTime.getHours() * 60 + startTime.getMinutes()));
          
          if (duration < 30) {
            setAdjustmentContext("Short nap detected — adjusting afternoon nap window.");
          } else if (endHour >= 16) { // After 4 PM
            setAdjustmentContext("Late nap means bedtime might shift a bit later tonight.");
          } else if (isNightSleep(recentActivity, nightSleepStartHour, nightSleepEndHour)) {
            if (endHour >= 4 && endHour < 7) {
              setAdjustmentContext("Early wake — adjusting nap times for the day.");
            } else if (endHour >= 8) {
              setAdjustmentContext("Recalculated based on a later start to the day.");
            } else {
              setAdjustmentContext("Adjusting today's rhythm…");
            }
          } else {
            setAdjustmentContext("Adjusting today's rhythm…");
          }
        }
      } else if (recentActivity.type === 'nap' && !recentActivity.details?.endTime) {
        // Nap started
        setAdjustmentContext("Nap started — updating rest of day schedule.");
      } else if (recentActivity.type === 'feed') {
        setAdjustmentContext("Feed logged — refining today's timeline.");
      } else {
        setAdjustmentContext("Adjusting today's rhythm…");
      }
      
      // Auto-clear after 1.8 seconds
      setTimeout(() => {
        setIsAdjusting(false);
        setAdjustmentContext("");
      }, 1800);
    };
    
    // Only trigger on activities change when we have tier 3 data
    if (activities.length > 0 && hasTier3Data) {
      handleActivityLogged();
    }
  }, [activities.length, hasTier3Data, nightSleepStartHour, nightSleepEndHour]); // Trigger when activities array length changes
  
  // Recalculate schedule function - for manual midday adjustments
  const handleRecalculateSchedule = async () => {
    // Trigger adjustment animation
    setIsAdjusting(true);
    setAdjustmentContext("Adjusting today's rhythm…");
    
    // Clear cached prediction
    localStorage.removeItem('aiPrediction');
    localStorage.removeItem('aiPredictionLastFetch');
    setAiPrediction(null);
    setAiPredictionLoading(true);
    
    try {
      // Immediately fetch fresh prediction with current data
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayActivities = normalizedActivities.filter(a => {
        const activityDate = new Date(a.logged_at);
        return activityDate >= today;
      });
      
      const fourteenDaysAgo = new Date();
      fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
      const recentActivities = normalizedActivities.filter(a => {
        const activityDate = new Date(a.logged_at);
        return activityDate >= fourteenDaysAgo;
      });
      
      const { data, error } = await supabase.functions.invoke('predict-daily-schedule', {
        body: { 
          recentActivities,
          todayActivities,
          babyBirthday: household?.baby_birthday,
          householdId: household?.id,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          aiPrediction: null // Force fresh prediction
        }
      });
      
      if (error) {
        // Error handled silently
      } else if (data) {
        setAiPrediction(data);
        localStorage.setItem('aiPrediction', JSON.stringify(data));
        localStorage.setItem('aiPredictionLastFetch', new Date().toISOString());
      }
    } catch (err) {
      // Error handled silently
    } finally {
      setAiPredictionLoading(false);
    }
    
    // Clear adjustment animation after 1.8 seconds
    setTimeout(() => {
      setIsAdjusting(false);
      setAdjustmentContext("");
    }, 1800);
  };
  
  // Detect nap transition and get nap counts - DON'T presume which will happen
  const transitionInfo = useMemo(() => {
    // Check if AI detects transition OR baby is in age-based window
    const aiTransition = aiPrediction?.is_transitioning;
    const ageBasedWindow = transitionWindow !== null;
    
    if (!aiTransition && !ageBasedWindow) return null;

    // Prefer age-based guardrails; never show 2→1 before 12 months
    if (ageBasedWindow) {
      return {
        isTransitioning: true,
        napCounts: {
          current: transitionWindow!.from,
          transitioning: transitionWindow!.to
        }
      };
    }

    // Fallback: AI-only transition
    if (aiPrediction) {
      const currentCount = Math.max(1, aiPrediction.total_naps_today);
      const transitioningCount = Math.max(1, currentCount - 1);
      
      return {
        isTransitioning: true,
        napCounts: {
          current: currentCount,
          transitioning: transitioningCount
        }
      };
    }

    return null;
  }, [aiPrediction, transitionWindow]);
  
  // Generate alternate schedule for transitions - default to showing higher nap count
  const [showAlternateSchedule, setShowAlternateSchedule] = useState(false);
  
  // Initialize to show higher nap count by default when transitioning
  useEffect(() => {
    if (transitionInfo && transitionInfo.napCounts && aiPrediction) {
      const displayNapCount = aiPrediction.total_naps_today;
      const alternateNapCount = transitionInfo.napCounts.current === displayNapCount
        ? transitionInfo.napCounts.transitioning
        : transitionInfo.napCounts.current;
      
      // Show alternate if it has MORE naps than display
      const shouldShowAlternate = alternateNapCount > displayNapCount;
      setShowAlternateSchedule(shouldShowAlternate);
    }
  }, [transitionInfo?.napCounts?.current, transitionInfo?.napCounts?.transitioning, aiPrediction?.total_naps_today]);
  
  // Reset toggle when transition ends
  useEffect(() => {
    if (!transitionInfo) {
      setShowAlternateSchedule(false);
      localStorage.removeItem('guide-schedule-preference');
    }
  }, [transitionInfo]);
  
  // Calculate today's actual nap count
  const todayActualNapCount = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayNaps = normalizedActivities.filter(a => {
      const actDate = new Date(a.logged_at);
      return actDate >= today && a.type === 'nap' && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details?.endTime;
    });
    return todayNaps.length;
  }, [normalizedActivities]);
  
  const alternateSchedule = useMemo(() => {
    if (!transitionInfo || !hasTier3Data || !household?.baby_birthday || !aiPrediction) return null;
    
    try {
      // Get the nap count that's NOT in the display schedule
      const displayNapCount = aiPrediction.total_naps_today;
      const alternateNapCount = transitionInfo.napCounts.current === displayNapCount
        ? transitionInfo.napCounts.transitioning
        : transitionInfo.napCounts.current;
      
      // Only generate if different from current
      if (alternateNapCount === displayNapCount) {
        return null;
      }
      
      const alternateAIPrediction: AISchedulePrediction = {
        total_naps_today: alternateNapCount,
        confidence: aiPrediction.confidence,
        is_transitioning: true,
        reasoning: `Alternative ${alternateNapCount}-nap schedule`
      };
      
      const activitiesForEngine = activities.map(a => ({
        id: a.id,
        type: a.type as any,
        time: a.details?.displayTime || new Date(a.logged_at).toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        }),
        loggedAt: a.logged_at,
        timezone: userTimezone,
        details: a.details
      }));
      
      const result = generateAdaptiveSchedule(
        activitiesForEngine, 
        household.baby_birthday, 
        alternateAIPrediction,
        undefined, // totalActivitiesCount
        true, // forceShowAllNaps - user explicitly selected this nap count
        nightSleepStartHour,
        nightSleepEndHour,
        userTimezone
      );
      return result;
    } catch (error) {
      return null;
    }
  }, [transitionInfo, hasTier3Data, household?.baby_birthday, aiPrediction, activities, userTimezone, nightSleepStartHour, nightSleepEndHour]);
  
  // Use alternate schedule when toggled during transitions
  const activeDisplaySchedule = (transitionInfo && showAlternateSchedule && alternateSchedule) 
    ? alternateSchedule 
    : displaySchedule;
  
  // Enable smart reminders - only when we have adaptive schedule
  useSmartReminders({ 
    schedule: adaptiveSchedule as any, // Type compatibility with old interface
    enabled: remindersEnabled && hasTier3Data && !!adaptiveSchedule
  });

  // Sync reminder state with localStorage
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('smartRemindersEnabled');
      if (stored !== null) {
        setRemindersEnabled(stored === 'true');
      }
    };
    
    // Listen for storage changes (for cross-tab sync)
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ===== ALL EFFECTS =====

  // Fetch rhythm insights once daily at midnight (only for Tier 3)
  useEffect(() => {
    if (!hasTier3Data || !household) {
      setRhythmInsightsLoading(false);
      return;
    }
    
    const fetchRhythmInsights = async (showLoadingState = false) => {
      if (showLoadingState) {
        setRhythmInsightsLoading(true);
      }
      try {
        const { data, error } = await supabase.functions.invoke('generate-rhythm-insights', {
          body: { 
            activities: activities.slice(-300), // Send last 300 activities
            babyName: household.baby_name,
            babyAge: babyAgeInWeeks,
            babyBirthday: household.baby_birthday,
            aiPrediction: aiPrediction || undefined, // Optional now
            timezone: userTimezone
          }
        });
        
        if (error) {
          console.error('❌ Error fetching rhythm insights:', error);
          if (showLoadingState) {
            setRhythmInsightsLoading(false);
          }
          return;
        }
        
        if (data) {
          console.log('✅ Rhythm insights fetched:', data);
          const todayDate = new Date().toDateString(); // Store date stamp
          const insightData = {
            ...data,
            generatedDate: todayDate // Add date stamp to cached data
          };
          
          setRhythmInsights({
            heroInsight: data.heroInsight,
            whatToDo: data.whatToDo,
            whatsNext: data.whatsNext,
            prepTip: data.prepTip,
            whyThisMatters: data.whyThisMatters,
            confidenceScore: data.confidenceScore
          });
          localStorage.setItem('rhythmInsights', JSON.stringify(insightData));
          localStorage.setItem('rhythmInsightsLastFetch', new Date().toISOString());
        }
      } catch (err) {
        // Error handled silently
      } finally {
        if (showLoadingState) {
          setRhythmInsightsLoading(false);
        }
      }
    };

    const cached = localStorage.getItem('rhythmInsights');
    const todayDate = new Date().toDateString();
    
    // Detect nap count mismatch between cached insights and AI prediction
    const hasNapCountMismatch = () => {
      if (!cached || !aiPrediction) return false;
      
      try {
        const parsed = JSON.parse(cached);
        const insightText = `${parsed.whyThisMatters || ''} ${parsed.heroInsight || ''}`.toLowerCase();
        
        // Extract nap counts mentioned in text (e.g., "2-nap", "3 naps", "two nap")
        const napPatterns = [
          /(\d)-nap/g,
          /(\d)\s*naps/g,
        ];
        
        const mentionedCounts = new Set<number>();
        napPatterns.forEach(pattern => {
          const matches = insightText.matchAll(pattern);
          for (const match of matches) {
            mentionedCounts.add(parseInt(match[1]));
          }
        });
        
        // If insights mention a different nap count than predicted, invalidate cache
        if (mentionedCounts.size > 0 && !mentionedCounts.has(aiPrediction.total_naps_today)) {
          return true;
        }
      } catch (e) {
        // Error handled silently
      }
      return false;
    };
    
    // Load cached data IMMEDIATELY if available
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        const cachedDate = parsed.generatedDate;
        const napMismatch = hasNapCountMismatch();
        
        // Always show cached data immediately
        setRhythmInsights({
          heroInsight: parsed.heroInsight,
          whatToDo: parsed.whatToDo,
          whatsNext: parsed.whatsNext,
          prepTip: parsed.prepTip,
          whyThisMatters: parsed.whyThisMatters,
          confidenceScore: parsed.confidenceScore
        });
        setRhythmInsightsLoading(false);
        
        // Fetch fresh data in background if cache is stale or has mismatch
        if (cachedDate !== todayDate || napMismatch) {
          localStorage.removeItem('rhythmInsights');
          fetchRhythmInsights(false); // Don't show loading state
        }
        return;
      } catch (e) {
        localStorage.removeItem('rhythmInsights');
      }
    }
    
    // No cache available - show loading state and fetch
    fetchRhythmInsights(true); // Show loading state only on first load
  }, [hasTier3Data, household, babyAgeInWeeks, activities.length, userTimezone]);

  // Fetch AI-enhanced schedule prediction (only for Tier 2+)
  useEffect(() => {
    if (!hasTier2Data || !household) return;
    
    const fetchAiPrediction = async (showLoadingState = false) => {
      if (showLoadingState) {
        setAiPredictionLoading(true);
      }
      try {
        // Get today's activities (use normalized activities with isNightSleep flag)
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayActivities = normalizedActivities.filter(a => {
          const activityDate = new Date(a.logged_at);
          return activityDate >= today;
        });
        
        // Get last 14 days for pattern analysis (use normalized activities with isNightSleep flag)
        const fourteenDaysAgo = new Date();
        fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
        const recentActivities = normalizedActivities.filter(a => {
          const activityDate = new Date(a.logged_at);
          return activityDate >= fourteenDaysAgo;
        });
        
        const { data, error } = await supabase.functions.invoke('predict-daily-schedule', {
          body: { 
            recentActivities,
            todayActivities,
            babyBirthday: household?.baby_birthday,
            householdId: household?.id,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            aiPrediction: aiPrediction // Pass existing prediction for consistency
          }
        });
        
        if (error) {
          return;
        }
        
        if (data) {
          setAiPrediction(data);
          localStorage.setItem('aiPrediction', JSON.stringify(data));
          localStorage.setItem('aiPredictionLastFetch', new Date().toISOString());
        }
      } catch (err) {
        // Error handled silently
      } finally {
        if (showLoadingState) {
          setAiPredictionLoading(false);
        }
      }
    };

    // Check if we need to fetch - only generate new prediction at 5am each day
    const lastFetch = localStorage.getItem('aiPredictionLastFetch');
    const cached = localStorage.getItem('aiPrediction');
    
    // Load cached data IMMEDIATELY if available
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setAiPrediction(parsed);
        setAiPredictionLoading(false);
      } catch (e) {
        localStorage.removeItem('aiPrediction');
      }
    }
    
    // Determine if we should fetch new data
    let shouldFetch = false;
    const now = new Date();
    const currentHour = now.getHours();
    
    if (!lastFetch || !cached) {
      // No cached prediction - show loading and fetch now
      shouldFetch = true;
      fetchAiPrediction(true); // Show loading state only on first load
    } else {
      const lastFetchDate = new Date(lastFetch);
      const isNewDay = now.toDateString() !== lastFetchDate.toDateString();
      
      // Fetch in background if it's a new day AND we're past 5am
      if (isNewDay && currentHour >= 5) {
        fetchAiPrediction(false); // Don't show loading state
      }
    }
  }, [hasTier2Data, household, activities.length, aiPrediction]);

  // Adaptive schedule is now generated via useMemo, no need for separate effect

  // Track pattern milestones (no toasts for streaks - early journey celebrations only)
  useEffect(() => {
    if (!currentTone) return;
    
    // First pattern detected - milestone tracking only (no notification)
    if (toneFrequencies.tones.length >= 1 && !patternMilestones.has('first_pattern')) {
      const newMilestones = new Set(patternMilestones);
      newMilestones.add('first_pattern');
      setPatternMilestones(newMilestones);
      localStorage.setItem('patternMilestones', JSON.stringify([...newMilestones]));
    }
    
    // Track streaks silently (no toasts)
    if (toneFrequencies.currentStreak >= 3 && !patternMilestones.has('streak_3')) {
      const newMilestones = new Set(patternMilestones);
      newMilestones.add('streak_3');
      setPatternMilestones(newMilestones);
      localStorage.setItem('patternMilestones', JSON.stringify([...newMilestones]));
    }
    
    if (toneFrequencies.currentStreak >= 7 && !patternMilestones.has('streak_7')) {
      const newMilestones = new Set(patternMilestones);
      newMilestones.add('streak_7');
      setPatternMilestones(newMilestones);
      localStorage.setItem('patternMilestones', JSON.stringify([...newMilestones]));
    }
  }, [currentTone, toneFrequencies.currentStreak, toneFrequencies.tones.length, patternMilestones]);


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
        icon: <TrendingUp className="w-5 h-5 text-primary" />,
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
      // Error handled silently
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
      {householdLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Analyzing recent activity…</p>
          </div>
        </div>
      ) : !household ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm mx-auto px-6">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-2">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-medium text-foreground mb-1">Set up your baby to see Rhythm</h2>
            <p className="text-muted-foreground mb-4">Add your baby's name and birthday to unlock personalized insights.</p>
            <Button onClick={() => onGoToSettings?.()} className="">Go to Settings</Button>
          </div>
        </div>
      ) : (

        <>
          {/* Birthday Setup Prompt */}
          {needsBirthdaySetup && (
            <div className="p-4 mx-2 bg-accent/20 border-b border-border/40">
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
        <div ref={scrollRef} className="pt-4 space-y-4">
          {/* Hero Insight Card - Only for Tier 3 */}
          {!needsBirthdaySetup && hasTier3Data && (
            <>
              <HeroInsightCard 
                insight={rhythmInsights?.heroInsight || ''}
                confidence={rhythmInsights?.confidenceScore || 'High confidence'}
                loading={rhythmInsightsLoading || !rhythmInsights}
              />
              
              {/* Pattern Milestones Badges */}
            </>
          )}
          
          {/* Tier 1 & 2: Simple confidence message + unlock progress */}
          {!needsBirthdaySetup && hasTier1Data && !hasTier3Data && (
            <div className="mb-4 mx-2 p-4 bg-accent/20 rounded-lg border border-border/40 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <p className="text-sm font-medium text-foreground">
                  {hasTier2Data 
                    ? 'Learning patterns — insights unlock soon'
                    : 'Starting to learn rhythm — keep logging'}
                </p>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Unlock progress</span>
                <span className="text-foreground font-medium">{unlockPercent}%</span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/60 via-primary to-primary transition-all duration-500 ease-out"
                  style={{ width: `${unlockPercent}%` }}
                />
              </div>
              <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                <span className="px-2 py-1 rounded bg-background border border-border/50">{required.activities - remaining.activities}/{required.activities} activities</span>
                <span className="px-2 py-1 rounded bg-background border border-border/50">{required.feeds - remaining.feeds}/{required.feeds} feeds</span>
                <span className="px-2 py-1 rounded bg-background border border-border/50">{required.naps - remaining.naps}/{required.naps} daytime naps</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Tip: logging today helps unlock personalized guidance and improves schedule accuracy.
              </p>
            </div>
          )}

          {/* Predicted Schedule - Show for Tier 1+ */}
          {hasMinimumData && (
            <>
              {/* Only show transition detection for Tier 2+ */}
              {hasTier2Data && (
                <TodayAtGlance 
                  prediction={aiPrediction}
                  loading={aiPredictionLoading}
                />
              )}
              
              {/* Missed Activity Prompt */}
              {missedActivitySuggestion && (
                <div className="px-2 mb-4">
                  <MissedActivityPrompt
                    suggestion={missedActivitySuggestion}
                    onAccept={async () => {
                      // Navigate to Home tab to handle the missed activity
                      const homeTab = document.querySelector('[data-tab="home"]') as HTMLElement;
                      if (homeTab) {
                        homeTab.click();
                      }
                    }}
                    onDismiss={() => {
                      // Dismiss handled by the hook's localStorage tracking
                    }}
                  />
                </div>
              )}
              
              {displaySchedule && (
                <>
                  <ScheduleTimeline
                    schedule={activeDisplaySchedule} 
                    babyName={babyName}
                    onRecalculate={handleRecalculateSchedule}
                    isTransitioning={transitionInfo?.isTransitioning}
                    transitionNapCounts={transitionInfo?.napCounts}
                    showAlternate={showAlternateSchedule}
                    onToggleAlternate={(show) => {
                      setShowAlternateSchedule(show);
                      // Don't persist during transition - let it reset naturally
                    }}
                    isAdjusting={isAdjusting}
                    adjustmentContext={adjustmentContext}
                    transitionWindow={transitionWindow}
                    todayActualNapCount={todayActualNapCount}
                  />
                </>
              )}
              
              {/* AI-Generated Guidance - Personalized to your data */}
              {hasMinimumData && (
                <UnifiedInsightCard
                  whatToDo={hasTier3Data ? rhythmInsights?.whatToDo : undefined}
                  whatsNext={hasTier3Data ? rhythmInsights?.whatsNext : undefined}
                  prepTip={hasTier3Data ? rhythmInsights?.prepTip : undefined}
                  whyThisMatters={hasTier3Data ? rhythmInsights?.whyThisMatters : undefined}
                  babyName={babyName}
                  loading={hasTier3Data && (rhythmInsightsLoading || !rhythmInsights)}
                />
              )}
            </>
          )}



        </div>
      </ScrollArea>
        </>
      )}
    </div>
  );
};
