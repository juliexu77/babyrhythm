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
  
  // Calculate total nap time
  const totalNapMinutes = todayActivities
    .filter(a => a.type === "nap" && !a.details.isNightSleep)
    .reduce((sum, a) => {
      if (a.details.startTime && a.details.endTime) {
        const start = new Date(`2000-01-01 ${a.details.startTime}`);
        const end = new Date(`2000-01-01 ${a.details.endTime}`);
        return sum + (end.getTime() - start.getTime()) / (1000 * 60);
      }
      return sum + 90;
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

    // Solid food milestone
    const hadSolidFood = todayActivities.some(a => a.type === "feed" && a.details.feedType === "solid");
    if (hadSolidFood) {
      const solidMeal = todayActivities.find(a => a.type === "feed" && a.details.feedType === "solid");
      if (solidMeal?.details.note) {
        return `${babyName || 'Baby'} discovered ${solidMeal.details.note.toLowerCase()} today.`;
      }
      return `${babyName || 'Baby'} tried new foods today.`;
    }

    // Feed heavy day (growth spurt)
    if (feedDiff >= 2) {
      return "Lots of feeds today — growing fast.";
    }

    // Extra sleepy day
    if (napDiff >= 2 || napTimeDiff >= 60) {
      return "Lots of rest today — just what was needed.";
    }

    // Balanced rhythm
    if (Math.abs(feedDiff) <= 1 && Math.abs(napDiff) <= 1 && Math.abs(napTimeDiff) <= 30) {
      return "Everything found its rhythm.";
    }

    // Short naps but steady
    if (napCount >= 2 && totalNapMinutes < avgNapMinutes - 30) {
      return "Short naps, but steady energy.";
    }

    // Default peaceful
    return "A cozy, well-fed rhythm.";
  };

  const headline = getHeadline();

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

  // Animation sequence timing
  useEffect(() => {
    if (!isOpen) {
      setAnimationPhase('act1');
      return;
    }

    // Act 1: 0-1.2s (photo blur in + headline)
    const timer1 = setTimeout(() => {
      setAnimationPhase('act2');
    }, 1200);

    // Act 2: 1.2-2.5s (metrics reveal)
    const timer2 = setTimeout(() => {
      setAnimationPhase('act3');
    }, 2500);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg h-[90vh] p-0 gap-0 bg-background overflow-hidden border-0">
        <div className="relative h-full w-full overflow-hidden">
          {/* ACT 1: Arrival - Full-screen hero photo */}
          <div className="relative w-full h-full">
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
                
                {/* Gradient overlay for readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
                
                {/* Date subtitle (top) */}
                <div className="absolute top-8 left-6 right-6">
                  <p className="text-xs font-light text-white/70 uppercase tracking-[0.2em] animate-story-headline-fade-up">
                    {todayDate}
                  </p>
                </div>
                
                {/* Headline (bottom) */}
                <div className="absolute bottom-0 left-0 right-0 p-8 pb-12">
                  <h1 className="text-[28px] leading-[1.3] font-light tracking-tight text-white animate-story-headline-fade-up">
                    {headline}
                  </h1>
                  
                  {getPhotoCaption() && (
                    <p className="text-sm text-white/60 mt-3 font-light tracking-wide animate-story-headline-fade-up" style={{ animationDelay: '0.8s' }}>
                      {getPhotoCaption()}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              // No photo fallback
              <div className="relative w-full h-full bg-gradient-to-br from-accent/20 to-accent/5">
                <div className="absolute inset-0 flex flex-col items-center justify-center p-8">
                  <p className="text-xs font-light text-muted-foreground uppercase tracking-[0.2em] mb-4 animate-story-headline-fade-up">
                    {todayDate}
                  </p>
                  <h1 className="text-[28px] leading-[1.3] font-light tracking-tight text-foreground text-center animate-story-headline-fade-up">
                    {headline}
                  </h1>
                </div>
              </div>
            )}
          </div>

          {/* ACT 2: Reveal - Metric cards overlaid on bottom */}
          {animationPhase !== 'act1' && (
            <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3">
              {/* Feeds */}
              <div 
                className="backdrop-blur-xl bg-background/80 dark:bg-background/90 rounded-2xl p-4 border border-border/50 animate-story-card-slide-up"
                style={{ animationDelay: '0s' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Baby className="w-4 h-4 text-[hsl(var(--pp-terracotta))]" strokeWidth={1.5} />
                    <span className="text-sm text-muted-foreground">Feeds</span>
                  </div>
                  <span className="text-sm font-medium">{feedCount}</span>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[hsl(var(--pp-terracotta))] to-[hsl(var(--pp-coral))] animate-story-bar-scale-fill"
                    style={{ 
                      width: `${Math.min(100, (feedCount / avgFeeds) * 100)}%`,
                      animationDelay: '0.1s'
                    }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  avg {avgFeeds}
                </div>
              </div>

              {/* Naps */}
              <div 
                className="backdrop-blur-xl bg-background/80 dark:bg-background/90 rounded-2xl p-4 border border-border/50 animate-story-card-slide-up"
                style={{ animationDelay: '0.15s' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Moon className="w-4 h-4 text-[hsl(var(--pp-lavender))]" strokeWidth={1.5} />
                    <span className="text-sm text-muted-foreground">Naps</span>
                  </div>
                  <span className="text-sm font-medium">{napCount}</span>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[hsl(var(--pp-lavender))] to-[hsl(264_40%_75%)] animate-story-bar-scale-fill"
                    style={{ 
                      width: `${Math.min(100, (napCount / avgNaps) * 100)}%`,
                      animationDelay: '0.25s'
                    }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  avg {avgNaps}
                </div>
              </div>

              {/* Nap time */}
              <div 
                className="backdrop-blur-xl bg-background/80 dark:bg-background/90 rounded-2xl p-4 border border-border/50 animate-story-card-slide-up"
                style={{ animationDelay: '0.3s' }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <Clock className="w-4 h-4 text-[hsl(var(--pp-mint))]" strokeWidth={1.5} />
                    <span className="text-sm text-muted-foreground">Nap time</span>
                  </div>
                  <span className="text-sm font-medium">{totalNapHours}h {totalNapMins}m</span>
                </div>
                <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-[hsl(var(--pp-mint))] to-[hsl(153_45%_65%)] animate-story-bar-scale-fill"
                    style={{ 
                      width: `${Math.min(100, (totalNapMinutes / avgNapMinutes) * 100)}%`,
                      animationDelay: '0.4s'
                    }}
                  />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  avg {Math.floor(avgNapMinutes / 60)}h {avgNapMinutes % 60}m
                </div>
              </div>

              {/* Longest wake window */}
              {longestWakeWindow && (
                <div 
                  className="backdrop-blur-xl bg-background/80 dark:bg-background/90 rounded-2xl p-4 border border-border/50 animate-story-card-slide-up"
                  style={{ animationDelay: '0.45s' }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Sparkles className="w-4 h-4 text-accent" strokeWidth={1.5} />
                      <span className="text-sm text-muted-foreground">Longest wake window</span>
                    </div>
                  </div>
                  <div className="mt-1 text-sm font-medium">{longestWakeWindow}</div>
                </div>
              )}
            </div>
          )}

          {/* ACT 3: Closure - Reassuring message with sparkle sweep */}
          {animationPhase === 'act3' && (
            <>
              {/* Dusk gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-primary/10 animate-story-dusk-overlay pointer-events-none" />
              
              {/* Sparkle sweep effect */}
              <div className="absolute top-1/4 left-0 pointer-events-none">
                <Sparkles 
                  className="w-6 h-6 text-primary/40 animate-story-sparkle-sweep" 
                  style={{ animationDelay: '0.5s' }}
                />
              </div>
              
              {/* Closure message - centered */}
              <div className="absolute top-1/3 left-0 right-0 flex justify-center px-8 pointer-events-none">
                <p 
                  className="text-lg font-light text-foreground/90 dark:text-foreground/80 text-center tracking-wide animate-story-closure-fade"
                  style={{ animationDelay: '1s' }}
                >
                  {getClosureMessage()}
                </p>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
