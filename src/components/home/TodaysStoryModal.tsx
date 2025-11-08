import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Activity } from "@/components/ActivityCard";
import { format } from "date-fns";
import { Baby, Moon, Clock, Sparkles } from "lucide-react";
import { useState, useEffect } from "react";

interface TodaysStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  babyName?: string;
}

export function TodaysStoryModal({ isOpen, onClose, activities, babyName }: TodaysStoryModalProps) {
  const [animationPhase, setAnimationPhase] = useState<'act1' | 'act2' | 'act3'>('act1');
  
  // Filter today's activities
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const todayActivities = activities.filter(activity => {
    if (!activity.loggedAt) return false;
    const activityDate = new Date(activity.loggedAt);
    activityDate.setHours(0, 0, 0, 0);
    return activityDate.getTime() === today.getTime();
  });

  console.log('📖 Story Modal Debug:', {
    totalActivities: activities.length,
    todayActivities: todayActivities.length,
    activities: todayActivities.map(a => ({ type: a.type, time: a.loggedAt, details: a.details }))
  });

  const todayDate = format(today, "MMM d");

  // Get hero photo
  const photosWithNotes = todayActivities.filter(a => 
    a.type === "photo" && (a.details.photoUrl || a.details.note)
  );
  const heroMoment = photosWithNotes[photosWithNotes.length - 1] || 
                     todayActivities.filter(a => a.type === "photo")[0];

  // Calculate metrics
  const feedCount = todayActivities.filter(a => a.type === "feed").length;
  const napCount = todayActivities.filter(a => a.type === "nap" && !a.details.isNightSleep).length;
  
  // Get solid food info
  const solidFeeds = todayActivities.filter(a => a.type === "feed" && a.details.feedType === "solid");
  const hadSolidFood = solidFeeds.length > 0;
  
  // Get special notes/moments from photos or activities with notes
  const specialMoments = todayActivities.filter(a => 
    a.details.note && a.details.note.length > 0 && a.type !== "photo"
  );
  const photoNotes = todayActivities.filter(a => 
    a.type === "photo" && a.details.note && a.details.note.length > 0
  );
  const allSpecialNotes = [...specialMoments, ...photoNotes];
  
  // Calculate total nap time
  const totalNapMinutes = todayActivities
    .filter(a => a.type === "nap" && !a.details.isNightSleep)
    .reduce((sum, a) => {
      if (a.details.startTime && a.details.endTime) {
        // Parse time strings more carefully
        const parseTime = (timeStr: string) => {
          const [time, period] = timeStr.split(' ');
          const [hStr, mStr] = time.split(':');
          let h = parseInt(hStr, 10);
          const m = parseInt(mStr || '0', 10);
          if (period === 'PM' && h !== 12) h += 12;
          if (period === 'AM' && h === 12) h = 0;
          return h * 60 + m;
        };

        const startMinutes = parseTime(a.details.startTime);
        const endMinutes = parseTime(a.details.endTime);
        const duration = endMinutes >= startMinutes 
          ? endMinutes - startMinutes 
          : (24 * 60) - startMinutes + endMinutes; // Handle overnight
        
        return sum + duration;
      }
      return sum;
    }, 0);
  
  const totalNapHours = Math.floor(totalNapMinutes / 60);
  const totalNapMins = Math.round(totalNapMinutes % 60);

  // Calculate longest wake window
  const napsWithTimes = todayActivities
    .filter(a => a.type === "nap" && a.details.startTime && a.details.endTime)
    .map(a => ({
      start: a.details.startTime,
      end: a.details.endTime,
      loggedAt: a.loggedAt
    }))
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());

  let longestWakeWindow = "";
  if (napsWithTimes.length >= 2) {
    // Find the longest gap between nap end and next nap start
    let maxGap = 0;
    let maxGapStart = "";
    let maxGapEnd = "";

    for (let i = 0; i < napsWithTimes.length - 1; i++) {
      const endTime = napsWithTimes[i].end;
      const nextStartTime = napsWithTimes[i + 1].start;
      
      const parseTime = (timeStr: string) => {
        const [time, period] = timeStr.split(' ');
        const [hStr, mStr] = time.split(':');
        let h = parseInt(hStr, 10);
        const m = parseInt(mStr || '0', 10);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return h * 60 + m;
      };

      const endMinutes = parseTime(endTime);
      const startMinutes = parseTime(nextStartTime);
      const gap = startMinutes - endMinutes;

      if (gap > maxGap) {
        maxGap = gap;
        maxGapStart = endTime;
        maxGapEnd = nextStartTime;
      }
    }

    if (maxGapStart && maxGapEnd) {
      longestWakeWindow = `${maxGapStart} – ${maxGapEnd}`;
    }
  }

  // Historical averages (simplified - in production would use actual history)
  const avgFeeds = 7;
  const avgNaps = 3;
  const avgNapMinutes = 180;

  // Generate dynamic headline based on patterns
  const getHeadline = (): string => {
    const feedDiff = feedCount - avgFeeds;
    const napDiff = napCount - avgNaps;
    const napTimeDiff = totalNapMinutes - avgNapMinutes;
    const name = babyName || 'Baby';

    // Solid food milestone - most specific
    if (hadSolidFood) {
      const solidMeal = solidFeeds[0];
      if (solidMeal?.details.note) {
        const foodName = solidMeal.details.note.toLowerCase();
        return `${name} discovered ${foodName} today.`;
      }
      return `${name} tried new foods today.`;
    }

    // Data-driven specific headlines
    if (feedDiff >= 3) {
      return `${feedCount} feeds, ${napCount} naps — growing fast.`;
    }

    if (napDiff >= 2) {
      return `Extra rest today — ${napCount} naps, ${totalNapHours}h ${totalNapMins}m total.`;
    }

    if (longestWakeWindow && napCount >= 2) {
      const [start] = longestWakeWindow.split(' – ');
      return `Extra long wake window at ${start}, but the day found its flow.`;
    }

    // Balanced rhythm - be specific about numbers
    if (Math.abs(feedDiff) <= 1 && Math.abs(napDiff) <= 1 && Math.abs(napTimeDiff) <= 30) {
      return `${feedCount} feeds, ${napCount} naps, and one very content kid.`;
    }

    // Short naps but consistent
    if (napCount >= 3 && totalNapMinutes < avgNapMinutes - 30) {
      return `Short naps, but steady energy all day.`;
    }

    // Light day
    if (feedCount < avgFeeds - 1 && napCount < avgNaps - 1) {
      return `Light day — ${feedCount} feeds, ${napCount} naps. Tomorrow resets.`;
    }

    // Default with specifics
    return `Balanced rhythm — ${feedCount} feeds, ${napCount} naps, steady and calm.`;
  };

  const headline = getHeadline();

  console.log('📖 Story Metrics:', {
    feedCount,
    napCount,
    totalNapMinutes,
    totalNapTime: `${totalNapHours}h ${totalNapMins}m`,
    longestWakeWindow,
    hadSolidFood,
    headline,
    napActivities: todayActivities.filter(a => a.type === "nap" && !a.details.isNightSleep).map(a => ({
      startTime: a.details.startTime,
      endTime: a.details.endTime
    }))
  });

  // Get photo caption
  const getPhotoCaption = (): string | null => {
    if (heroMoment?.details.note) {
      const time = heroMoment.loggedAt ? format(new Date(heroMoment.loggedAt), "h:mm a") : "";
      return `${heroMoment.details.note}, ${time}`;
    }
    return null;
  };

  // Get closure message (Act 3)
  const getClosureMessage = (): string => {
    const currentHour = new Date().getHours();
    const isEvening = currentHour >= 18;

    if (isEvening) {
      return "All in rhythm. See you in the morning.";
    }
    return "A peaceful day — ready for tomorrow's adventures.";
  };

  // Animation sequence timing - 4 second total
  useEffect(() => {
    if (!isOpen) {
      setAnimationPhase('act1');
      return;
    }

    // Act 1: 0-1.0s (photo blur in + headline types in)
    const timer1 = setTimeout(() => {
      setAnimationPhase('act2');
    }, 1000);

    // Act 2: 1.0-3.0s (bars fill sequentially)
    const timer2 = setTimeout(() => {
      setAnimationPhase('act3');
    }, 3000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[90vh] p-0 gap-0 bg-background overflow-hidden border-0">
        <div className="relative w-full h-full overflow-y-auto">
          {/* Fixed photo background layer */}
          <div className="fixed inset-0 w-full h-full pointer-events-none">
            {heroMoment?.details.photoUrl ? (
              <div className="relative w-full h-full">
                {/* Hero photo with blur-in animation */}
                <img 
                  src={heroMoment.details.photoUrl} 
                  alt="Today's moment" 
                  className="w-full h-full object-cover animate-story-photo-blur-in"
                />
                
                {/* Subtle glow in corners */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 blur-3xl animate-story-glow-corners" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 blur-3xl animate-story-glow-corners" style={{ animationDelay: '1s' }} />
                
                {/* Gradient overlay for readability - enhanced for text visibility */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent via-35% to-black/70" />
              </div>
            ) : (
              // No photo fallback
              <div className="relative w-full h-full bg-gradient-to-br from-accent/20 to-accent/5" />
            )}
          </div>

          {/* Scrollable content layer - positioned over fixed photo */}
          <div className="relative w-full min-h-full">
            {/* Top spacer */}
            <div className="h-8" />
            
            {/* Date subtitle */}
            <div className="relative px-6">
              <p className="text-xs font-light text-white/70 uppercase tracking-[0.2em] animate-story-headline-fade-up drop-shadow-lg">
                {todayDate}
              </p>
            </div>

            {/* Headline positioned in safe zone */}
            <div className="relative px-8 mt-[25vh]">
              <h1 className="text-[22px] leading-[1.3] font-light tracking-[0.01em] text-white animate-story-headline-type drop-shadow-lg">
                {headline}
              </h1>
              
              {getPhotoCaption() && (
                <p className="text-sm text-white/60 mt-3 font-light tracking-wide animate-story-headline-fade-up drop-shadow-lg" style={{ animationDelay: '0.7s' }}>
                  {getPhotoCaption()}
                </p>
              )}
            </div>

            {/* Spacer to push cards down */}
            <div className="h-[20vh]" />

            {/* ACT 2: Reveal - Metric cards section */}
            {animationPhase !== 'act1' && (
              <div className="relative w-full px-6 pb-6 space-y-2.5" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
              {/* Feeds - Peach with pulse */}
              <div 
                className="backdrop-blur-[8px] bg-background/95 dark:bg-background/95 rounded-[14px] p-2.5 border border-border/30 animate-story-card-slide-up"
                style={{ animationDelay: '0s' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <Baby className="w-4 h-4 text-[hsl(var(--pp-terracotta))]" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-foreground">Feeds</span>
                  </div>
                  <span className="text-[14px] font-medium">{feedCount}</span>
                </div>
                <div className="h-1 bg-muted/30 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-[hsl(var(--pp-terracotta))]/60 to-[hsl(var(--pp-coral))]/60 rounded-full animate-story-bar-feed"
                    style={{ 
                      width: `${Math.min(100, (feedCount / avgFeeds) * 100)}%`,
                      animationDelay: '0.1s'
                    }}
                  />
                  {/* Shimmer sweep on completion */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-story-shimmer-sweep"
                    style={{ animationDelay: '0.8s' }}
                  />
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground/60">
                  avg {avgFeeds}
                </div>
              </div>

              {/* Naps - Lavender smooth */}
              <div 
                className="backdrop-blur-[8px] bg-background/95 dark:bg-background/95 rounded-[14px] p-2.5 border border-border/30 animate-story-card-slide-up"
                style={{ animationDelay: '0.5s' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <Moon className="w-4 h-4 text-[hsl(var(--pp-lavender))]" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-foreground">Naps</span>
                  </div>
                  <span className="text-[14px] font-medium">{napCount}</span>
                </div>
                <div className="h-1 bg-muted/30 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-[hsl(var(--pp-lavender))]/60 to-[hsl(264_40%_75%)]/60 rounded-full animate-story-bar-nap"
                    style={{ 
                      width: `${Math.min(100, (napCount / avgNaps) * 100)}%`,
                      animationDelay: '0.6s'
                    }}
                  />
                  {/* Shimmer sweep on completion */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-story-shimmer-sweep"
                    style={{ animationDelay: '1.3s' }}
                  />
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground/60">
                  avg {avgNaps}
                </div>
              </div>

              {/* Nap time - Mint with glint sweep */}
              <div 
                className="backdrop-blur-[8px] bg-background/95 dark:bg-background/95 rounded-[14px] p-2.5 border border-border/30 animate-story-card-slide-up"
                style={{ animationDelay: '1.0s' }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-4 h-4 text-[hsl(var(--pp-mint))]" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-foreground">Nap time</span>
                  </div>
                  <span className="text-[14px] font-medium">{totalNapHours}h {totalNapMins}m</span>
                </div>
                <div className="h-1 bg-muted/30 rounded-full overflow-hidden relative">
                  <div 
                    className="h-full bg-gradient-to-r from-[hsl(var(--pp-mint))]/60 to-[hsl(153_45%_65%)]/60 rounded-full animate-story-bar-naptime"
                    style={{ 
                      width: `${Math.min(100, (totalNapMinutes / avgNapMinutes) * 100)}%`,
                      animationDelay: '1.1s'
                    }}
                  />
                  {/* Shimmer sweep on completion */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-story-shimmer-sweep"
                    style={{ animationDelay: '1.8s' }}
                  />
                </div>
                <div className="mt-1 text-[12px] text-muted-foreground/60">
                  avg {Math.floor(avgNapMinutes / 60)}h {avgNapMinutes % 60}m
                </div>
              </div>

              {/* Longest wake window - Sand with pulse highlight */}
              {longestWakeWindow && (
                <div 
                  className="backdrop-blur-[8px] bg-background/95 dark:bg-background/95 rounded-[14px] p-2.5 border border-border/30 animate-story-card-slide-up"
                  style={{ animationDelay: '1.5s' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <Sparkles className="w-4 h-4 text-accent" strokeWidth={1.5} />
                      <span className="text-[14px] font-medium text-foreground">Longest wake window</span>
                    </div>
                  </div>
                  <div className="mt-1 text-[14px] font-medium animate-story-window-pulse" style={{ animationDelay: '1.6s' }}>
                    {longestWakeWindow}
                  </div>
                </div>
              )}

              {/* Special moments - Food or notes */}
              {allSpecialNotes.length > 0 && (
                <div 
                  className="backdrop-blur-[8px] bg-background/95 dark:bg-background/95 rounded-[14px] p-2.5 border border-border/30 animate-story-card-slide-up"
                  style={{ animationDelay: longestWakeWindow ? '2.0s' : '1.5s' }}
                >
                  <div className="flex items-center gap-2.5 mb-1.5">
                    <Sparkles className="w-4 h-4 text-[hsl(var(--pp-coral))]" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-foreground">Special moments</span>
                  </div>
                  <div className="space-y-1">
                    {allSpecialNotes.slice(0, 3).map((activity, idx) => {
                      const time = activity.loggedAt ? format(new Date(activity.loggedAt), "h:mm a") : "";
                      return (
                        <div key={idx} className="text-[13px] text-foreground/80">
                          <span className="text-muted-foreground/60">{time}:</span> {activity.details.note}
                        </div>
                      );
                    })}
                    {allSpecialNotes.length > 3 && (
                      <div className="text-[12px] text-muted-foreground/50 italic">
                        +{allSpecialNotes.length - 3} more moments
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom spacer and ending message */}
          <div className="relative w-full px-6 pb-24 pt-12">
            <div className="text-center text-xs text-white/40 uppercase tracking-widest animate-story-closure-fade">
              {getClosureMessage()}
            </div>
          </div>
          </div>

          {/* ACT 3: Closure - Sparkles and bottom text overlays */}
          {animationPhase === 'act3' && (
            <div className="fixed inset-0 pointer-events-none">
              {/* Dusk gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/10 animate-story-dusk-overlay" />
              
              {/* Multiple sparkles rising effect */}
              <div className="absolute top-1/4 left-1/4">
                <Sparkles 
                  className="w-5 h-5 text-primary/30 animate-story-sparkle-rise" 
                  style={{ animationDelay: '0.5s' }}
                />
              </div>
              <div className="absolute top-1/3 right-1/3">
                <Sparkles 
                  className="w-4 h-4 text-primary/25 animate-story-sparkle-rise" 
                  style={{ animationDelay: '0.7s' }}
                />
              </div>
              <div className="absolute top-1/2 left-1/3">
                <Sparkles 
                  className="w-6 h-6 text-primary/35 animate-story-sparkle-rise" 
                  style={{ animationDelay: '0.9s' }}
                />
              </div>
              
              {/* Subtle bottom text only */}
              <div className="absolute left-0 right-0 flex justify-center" style={{ bottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
                <div 
                  className="text-xs text-white/40 uppercase tracking-widest animate-story-closure-fade"
                  style={{ animationDelay: '1s' }}
                >
                  Goodnight · rhythm saved
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
