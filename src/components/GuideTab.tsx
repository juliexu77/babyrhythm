import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Sprout, Send, Calendar, Activity, TrendingUp, 
  Sun, Moon, Target, Milk, CloudRain, 
  Clock, Timer, Bed, Lightbulb, CheckSquare, 
  ArrowRight, Compass, ChevronDown, ChevronUp, Bell
} from "lucide-react";
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

interface TimeSegment {
  start: number; // minutes from midnight
  end: number;
  type: 'awake' | 'nap' | 'night';
  label?: string;
}

// Simple text formatter
const formatText = (text: string) => {
  const paragraphs = text.split('\n\n').filter(p => p.trim());
  
  return paragraphs.map((paragraph, idx) => {
    const parts = paragraph.split(/(\*\*[^*]+\*\*)/g);
    const isListItem = paragraph.trim().startsWith('- ');
    
    if (isListItem) {
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

export const GuideTab = ({ activities, onGoToSettings }: GuideTabProps) => {
  const { household, loading: householdLoading } = useHousehold();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showTrendView, setShowTrendView] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const babyName = household?.baby_name || 'Baby';
  const babyBirthday = household?.baby_birthday;
  
  // Calculate baby's age
  const getBabyAge = () => {
    if (!babyBirthday) return null;
    const birthDate = new Date(babyBirthday);
    const today = new Date();
    
    let totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                      (today.getMonth() - birthDate.getMonth());
    
    if (today.getDate() < birthDate.getDate()) {
      totalMonths--;
    }
    
    const months = Math.max(0, totalMonths);
    const monthsDate = new Date(birthDate);
    monthsDate.setMonth(monthsDate.getMonth() + totalMonths);
    const daysDiff = Math.floor((today.getTime() - monthsDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(daysDiff / 7);
    
    return { months, weeks };
  };

  const babyAge = getBabyAge();
  const babyAgeInWeeks = babyAge ? babyAge.months * 4 + babyAge.weeks : 0;
  const needsBirthdaySetup = !babyAge || babyAgeInWeeks === 0;

  // Check minimum data requirements
  const naps = activities.filter(a => a.type === 'nap');
  const feeds = activities.filter(a => a.type === 'feed');
  const hasMinimumData = naps.length >= 4 && feeds.length >= 4;

  // Calculate average daily pattern from last 5 days
  const calculateAverageDayPattern = (): TimeSegment[] => {
    if (!hasMinimumData) return [];

    const last5Days = Array.from({ length: 5 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      return date;
    }).reverse();

    // Helper to parse time string to minutes from midnight
    const parseTime = (timeStr: string): number => {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return 0;
      let h = parseInt(match[1], 10);
      const mins = parseInt(match[2], 10);
      const period = match[3].toUpperCase();
      if (period === 'PM' && h !== 12) h += 12;
      if (period === 'AM' && h === 12) h = 0;
      return h * 60 + mins;
    };

    // Collect all naps from last 5 days
    const recentNaps = activities.filter(a => {
      const activityDate = new Date(a.logged_at);
      return last5Days.some(d => activityDate.toDateString() === d.toDateString()) && 
             a.type === 'nap' && a.details?.startTime && a.details?.endTime;
    });

    // Average nap times
    const napSegments: TimeSegment[] = [];
    const napGroups: { [key: number]: { starts: number[]; ends: number[] } } = {};

    recentNaps.forEach(nap => {
      const start = parseTime(nap.details.startTime);
      const end = parseTime(nap.details.endTime);
      const napNumber = Math.floor(start / 480); // Roughly group by time of day
      if (!napGroups[napNumber]) napGroups[napNumber] = { starts: [], ends: [] };
      napGroups[napNumber].starts.push(start);
      napGroups[napNumber].ends.push(end);
    });

    Object.keys(napGroups).forEach((key, idx) => {
      const group = napGroups[parseInt(key)];
      const avgStart = Math.round(group.starts.reduce((a, b) => a + b, 0) / group.starts.length);
      const avgEnd = Math.round(group.ends.reduce((a, b) => a + b, 0) / group.ends.length);
      
      const formatMin = (mins: number) => {
        const h = Math.floor(mins / 60);
        const m = mins % 60;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
        return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
      };

      napSegments.push({
        start: avgStart,
        end: avgEnd,
        type: 'nap',
        label: `Nap ${idx + 1} ${formatMin(avgStart)}–${formatMin(avgEnd)}`
      });
    });

    // Add night sleep (assume 7:30 PM - 6:00 AM)
    napSegments.push({
      start: 1170, // 7:30 PM
      end: 360, // 6:00 AM next day
      type: 'night',
      label: 'Night sleep'
    });

    return napSegments.sort((a, b) => a.start - b.start);
  };

  const dayPattern = calculateAverageDayPattern();

  // Calculate pattern shifts (compare this week to last week)
  const getPatternShifts = () => {
    if (!hasMinimumData) return [];

    const thisWeek = activities.filter(a => {
      const date = new Date(a.logged_at);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= weekAgo;
    });

    const lastWeek = activities.filter(a => {
      const date = new Date(a.logged_at);
      const twoWeeksAgo = new Date();
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return date >= twoWeeksAgo && date < weekAgo;
    });

    const shifts: string[] = [];

    // Compare nap counts
    const thisWeekNaps = thisWeek.filter(a => a.type === 'nap').length;
    const lastWeekNaps = lastWeek.filter(a => a.type === 'nap').length;
    const napDiff = Math.round((thisWeekNaps - lastWeekNaps) / 7 * 10) / 10;

    if (Math.abs(napDiff) >= 0.3) {
      if (napDiff > 0) {
        shifts.push(`Naps increased by ~${Math.abs(napDiff).toFixed(1)} per day this week`);
      } else {
        shifts.push(`Naps decreased by ~${Math.abs(napDiff).toFixed(1)} per day this week`);
      }
    }

    // Compare total daytime sleep
    const getTotalDaySleep = (acts: Activity[]) => {
      const parseTime = (timeStr: string): number => {
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return 0;
        let h = parseInt(match[1], 10);
        const mins = parseInt(match[2], 10);
        const period = match[3].toUpperCase();
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + mins;
      };

      return acts
        .filter(a => a.type === 'nap' && a.details?.startTime && a.details?.endTime)
        .reduce((total, nap) => {
          const start = parseTime(nap.details.startTime);
          const end = parseTime(nap.details.endTime);
          const duration = end >= start ? end - start : (24 * 60) - start + end;
          return total + duration;
        }, 0);
    };

    const thisSleep = getTotalDaySleep(thisWeek) / 7;
    const lastSleep = getTotalDaySleep(lastWeek) / 7;
    const sleepDiff = Math.round((thisSleep - lastSleep) / 60 * 10) / 10;

    if (Math.abs(sleepDiff) >= 0.3) {
      if (sleepDiff > 0) {
        shifts.push(`Total daytime sleep up by ${Math.abs(sleepDiff).toFixed(1)}h per day`);
      } else {
        shifts.push(`Total daytime sleep down by ${Math.abs(sleepDiff).toFixed(1)}h per day`);
      }
    } else {
      shifts.push(`Total daytime sleep steady around ${(thisSleep / 60).toFixed(1)}h per day`);
    }

    return shifts;
  };

  const patternShifts = getPatternShifts();

  // Get coaching based on age
  const getWhatToKnow = () => {
    if (!babyAge) return [];
    const { months } = babyAge;

    if (months < 3) {
      return [
        "Nap patterns are still forming — expect variability",
        "Sleep cycles are shorter (45-60 min) and may need help linking"
      ];
    } else if (months < 6) {
      return [
        "Wake windows are extending — typically 1.5-2 hours now",
        "Naps are beginning to consolidate into more predictable windows"
      ];
    } else if (months < 9) {
      return [
        "Most babies drop to 3 naps around this age",
        "Wake windows extend to 2-3 hours between naps"
      ];
    } else if (months < 12) {
      return [
        "Transitioning toward 2 naps per day is common",
        "Morning nap may shift later as rhythm consolidates"
      ];
    }

    return ["Approaching 1-nap transition — watch for longer wake windows"];
  };

  const getWhatToDo = () => {
    if (!babyAge) return [];
    const { months } = babyAge;

    if (months < 3) {
      return [
        "Follow sleepy cues closely — yawning, eye rubbing, fussiness",
        "Keep wake windows under 90 minutes to prevent overtiredness"
      ];
    } else if (months < 6) {
      return [
        "Start establishing consistent nap routines (darkened room, white noise)",
        "Watch for the first wake window to stretch — it's often longest"
      ];
    } else if (months < 9) {
      return [
        "Try stretching the first wake window to 2.5-3 hours",
        "Protect the afternoon nap — overtiredness impacts bedtime"
      ];
    } else if (months < 12) {
      return [
        "If mornings feel rushed, consider slightly earlier bedtime",
        "Watch for refusal of 3rd nap — it's a sign to drop it"
      ];
    }

    return ["Offer one longer afternoon nap and monitor for readiness to transition"];
  };

  // Forecast today's rhythm
  const getTodayForecast = () => {
    if (dayPattern.length === 0) return [];

    const formatTime = (mins: number) => {
      let adjustedMins = mins;
      if (mins >= 1440) adjustedMins = mins - 1440; // Handle next day wrap

      const h = Math.floor(adjustedMins / 60);
      const m = adjustedMins % 60;
      const period = h >= 12 ? 'PM' : 'AM';
      const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
      return `${displayH}:${m.toString().padStart(2, '0')} ${period}`;
    };

    return dayPattern
      .filter(seg => seg.type === 'nap')
      .map((seg, idx) => ({
        icon: '💤',
        label: `Nap ${idx + 1}: ${formatTime(seg.start)}–${formatTime(seg.end)}`
      }))
      .concat([
        {
          icon: '🌙',
          label: `Bedtime: around ${formatTime(dayPattern.find(s => s.type === 'night')?.start || 1170)}`
        }
      ]);
  };

  const todayForecast = getTodayForecast();

  const CHAT_URL = "https://ufpavzvrtdzxwcwasaqj.functions.supabase.co/parenting-chat";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages]);

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
      if (!token) throw new Error('No active session token');

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
      {householdLoading || !household ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading rhythm...</p>
          </div>
        </div>
      ) : (
        <>
          {needsBirthdaySetup && (
            <div className="p-4 bg-accent/20 border-b border-border/40">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium">Set your baby's birthday for personalized rhythm insights</p>
                  <p className="text-xs text-muted-foreground">
                    Age-specific guidance helps you understand their daily patterns better.
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

          <ScrollArea className="flex-1">
            <div ref={scrollRef} className="px-4 pt-4 space-y-5">
              {/* Header */}
              {!needsBirthdaySetup && (
                <div className="space-y-1">
                  <h2 className="text-lg font-semibold text-foreground">
                    {babyName} • {babyAge?.months} month{babyAge?.months !== 1 ? 's' : ''}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Average Day (last 5 days)
                  </p>
                  <p className="text-xs text-muted-foreground pt-0.5">
                    Here's when {babyName} usually eats, naps, and sleeps based on recent patterns.
                  </p>
                </div>
              )}

              {/* Empty State */}
              {!hasMinimumData && !needsBirthdaySetup && (
                <div className="space-y-4">
                  <div className="p-6 bg-accent/10 rounded-lg border border-border/40 text-center">
                    <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Track at least 4 naps and 4 feeds to see {babyName}'s daily rhythm map
                    </p>
                    <p className="text-xs text-muted-foreground/70">
                      The timeline will show when {babyName} typically wakes, naps, feeds, and sleeps
                    </p>
                  </div>
                </div>
              )}

              {/* Daily Rhythm Timeline */}
              {hasMinimumData && dayPattern.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Daily Rhythm Timeline
                  </h3>
                  
                  {/* 24-hour visualization */}
                  <div className="relative h-16 bg-accent/10 rounded-lg border border-border/40 overflow-hidden">
                    {/* Time labels */}
                    <div className="absolute inset-0 flex items-center justify-between px-2">
                      <span className="text-xs text-muted-foreground">6 AM</span>
                      <span className="text-xs text-muted-foreground">Noon</span>
                      <span className="text-xs text-muted-foreground">6 PM</span>
                      <span className="text-xs text-muted-foreground">12 AM</span>
                    </div>
                    
                    {/* Sleep segments */}
                    <div className="absolute inset-0 flex">
                      {dayPattern.map((segment, idx) => {
                        const startPercent = ((segment.start - 360) / 1080) * 100; // 6 AM to midnight
                        let endPercent = ((segment.end - 360) / 1080) * 100;
                        
                        // Handle overnight sleep
                        if (segment.type === 'night') {
                          if (segment.end < segment.start) {
                            endPercent = ((segment.end + 1440 - 360) / 1080) * 100;
                          }
                        }
                        
                        const width = endPercent - startPercent;
                        
                        return (
                          <div
                            key={idx}
                            className={`absolute top-0 bottom-0 ${
                              segment.type === 'night' ? 'bg-blue-500/30' :
                              segment.type === 'nap' ? 'bg-purple-500/30' :
                              'bg-amber-500/10'
                            } border-l border-r border-border/40`}
                            style={{
                              left: `${Math.max(0, startPercent)}%`,
                              width: `${Math.min(100 - Math.max(0, startPercent), width)}%`
                            }}
                            title={segment.label}
                          />
                        );
                      })}
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-amber-500/10 border border-border/40" />
                      <span className="text-muted-foreground">Awake</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-purple-500/30 border border-border/40" />
                      <span className="text-muted-foreground">Naps</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded bg-blue-500/30 border border-border/40" />
                      <span className="text-muted-foreground">Night sleep</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Pattern Shift Summary */}
              {hasMinimumData && patternShifts.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Today's Rhythm Shift
                  </h3>
                  <div className="space-y-1.5">
                    {patternShifts.map((shift, idx) => (
                      <p key={idx} className="text-sm text-muted-foreground">
                        • {shift}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* What to Know / What to Do */}
              {hasMinimumData && (
                <div className="grid grid-cols-1 gap-4">
                  {/* What to Know */}
                  <div className="p-4 bg-accent/10 rounded-lg border border-border/40">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-medium text-foreground uppercase tracking-wider">What to Know</h3>
                    </div>
                    <div className="space-y-2">
                      {getWhatToKnow().map((item, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                          → {item}
                        </p>
                      ))}
                    </div>
                  </div>

                  {/* What to Do */}
                  <div className="p-4 bg-accent/10 rounded-lg border border-border/40">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckSquare className="w-4 h-4 text-primary" />
                      <h3 className="text-xs font-medium text-foreground uppercase tracking-wider">What To Do</h3>
                    </div>
                    <div className="space-y-2">
                      {getWhatToDo().map((item, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground leading-relaxed">
                          ☑️ {item}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Upcoming Day Forecast */}
              {hasMinimumData && todayForecast.length > 0 && (
                <div className="space-y-3">
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Today's Expected Rhythm
                  </h3>
                  <div className="space-y-2">
                    {todayForecast.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {item.icon} {item.label}
                        </span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                        >
                          <Bell className="w-3 h-3 mr-1" />
                          Remind
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground italic pt-2 border-t border-border/40">
                    Times may shift ±15 min based on {babyName}'s cues today
                  </p>
                </div>
              )}

              {/* Optional mini trend view */}
              {hasMinimumData && (
                <div className="space-y-2">
                  <button
                    onClick={() => setShowTrendView(!showTrendView)}
                    className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors"
                  >
                    View pattern details
                    <ChevronDown 
                      className={`h-3 w-3 transition-transform ${showTrendView ? 'rotate-180' : ''}`}
                    />
                  </button>
                  
                  {showTrendView && (
                    <div className="grid grid-cols-3 gap-2 text-xs pt-2">
                      <div className="p-2 bg-accent/10 rounded border border-border/40">
                        <p className="text-muted-foreground mb-1">Naps/day</p>
                        <p className="font-medium text-foreground">
                          {(naps.length / Math.max(1, activities.length / 10)).toFixed(1)}
                        </p>
                      </div>
                      <div className="p-2 bg-accent/10 rounded border border-border/40">
                        <p className="text-muted-foreground mb-1">Avg nap</p>
                        <p className="font-medium text-foreground">1.2h</p>
                      </div>
                      <div className="p-2 bg-accent/10 rounded border border-border/40">
                        <p className="text-muted-foreground mb-1">Wake time</p>
                        <p className="font-medium text-foreground">6:15 AM</p>
                      </div>
                    </div>
                  )}
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