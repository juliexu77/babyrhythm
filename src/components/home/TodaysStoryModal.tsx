import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Activity } from "@/components/ActivityCard";
import { format } from "date-fns";
import { X, Sparkles } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { isDaytimeNap } from "@/utils/napClassification";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { generateStoryHeadline } from "@/utils/storyHeadlineGenerator";
import { generateStoryInsights } from "@/utils/storyInsightsGenerator";

interface TodaysStoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  activities: Activity[];
  babyName?: string;
  targetDate?: string; // YYYY-MM-DD, when viewing a past day
  availableDates?: string[]; // Array of YYYY-MM-DD dates (sorted oldest to newest)
  onNavigate?: (newDate: string, activities: Activity[]) => void;
  allActivities?: Activity[]; // All activities for filtering
}

export function TodaysStoryModal({ isOpen, onClose, activities, babyName, targetDate, availableDates, onNavigate, allActivities }: TodaysStoryModalProps) {
  const [animationPhase, setAnimationPhase] = useState<'act1' | 'act2' | 'act3'>('act1');
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  const [navigationDirection, setNavigationDirection] = useState<'prev' | 'next' | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { nightSleepEndHour, nightSleepStartHour } = useNightSleepWindow();
  
  // Determine which day's activities to show
  const dayStart = (() => {
    const d = targetDate ? new Date(`${targetDate}T00:00:00`) : new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  })();
  
  // ALWAYS filter activities by the target date for consistency
  const todayActivities = activities.filter(activity => {
    if (!activity.loggedAt) {
      return false;
    }
    const activityDate = new Date(activity.loggedAt);
    const activityDateMidnight = new Date(activityDate);
    activityDateMidnight.setHours(0, 0, 0, 0);
    return activityDateMidnight.getTime() === dayStart.getTime();
  });


  const todayDate = format(dayStart, "MMM d");

  // Get hero photo
  const photosWithNotes = todayActivities.filter(a => 
    a.type === "photo" && (a.details.photoUrl || a.details.note)
  );
  const heroMoment = photosWithNotes[photosWithNotes.length - 1] || 
                     todayActivities.filter(a => a.type === "photo")[0];

  // Calculate metrics
  const feedCount = todayActivities.filter(a => a.type === "feed").length;
  const napCount = todayActivities.filter(a => a.type === "nap" && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour)).length;
  
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
    .filter(a => a.type === "nap" && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour))
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
    .filter(a => a.type === "nap" && isDaytimeNap(a, nightSleepStartHour, nightSleepEndHour) && a.details.startTime && a.details.endTime)
    .map(a => ({
      start: a.details.startTime,
      end: a.details.endTime,
      loggedAt: a.loggedAt
    }))
    .sort((a, b) => new Date(a.loggedAt).getTime() - new Date(b.loggedAt).getTime());
  
  

  // Calculate longest wake window (in minutes)
  let longestWakeWindowMinutes = 0;
  if (napsWithTimes.length >= 2) {
    // Find the longest gap between nap end and next nap start
    let maxGap = 0;

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
      }
    }

    longestWakeWindowMinutes = maxGap;
  }

  const longestWakeWindow = longestWakeWindowMinutes > 0 
    ? `${Math.floor(longestWakeWindowMinutes / 60)}h ${longestWakeWindowMinutes % 60}m`
    : "";

  // Historical averages (simplified - in production would use actual history)
  const avgFeeds = 7;
  const avgNaps = 3;
  const avgNapMinutes = 180;

  // Generate poetic headline based on patterns
  const getHeadline = (): string => {
    const feedDiff = feedCount - avgFeeds;
    const napDiff = napCount - avgNaps;
    const napTimeDiff = totalNapMinutes - avgNapMinutes;

    // Special notes/moments take priority
    if (allSpecialNotes.length > 0) {
      const firstNote = allSpecialNotes[0].details.note;
      // Extract key words for poetic headline
      const noteWords = firstNote.split(' ').slice(0, 4).join(' ');
      return `${noteWords}${firstNote.length > 20 ? '...' : ''}. A day to remember.`;
    }

    // Extra hungry day
    if (feedDiff >= 3) {
      return `${feedCount} feeds — steady as always. Growing fast.`;
    }

    // Extra rest
    if (napDiff >= 2) {
      return `${napCount} naps. Deep and calm. The body knows what it needs.`;
    }

    // Long wake window but found rhythm
    if (longestWakeWindow && napCount >= 2) {
      return `A longer wake, a deeper rest. The day stretched, then softened.`;
    }

    // Balanced rhythm
    if (Math.abs(feedDiff) <= 1 && Math.abs(napDiff) <= 1 && Math.abs(napTimeDiff) <= 30) {
      return `Quiet balance. Full hearts. Everything in sync.`;
    }

    // Short naps but consistent
    if (napCount >= 3 && totalNapMinutes < avgNapMinutes - 30) {
      return `Brief rests, steady energy. The rhythm hums on.`;
    }

    // Light day
    if (feedCount < avgFeeds - 1 && napCount < avgNaps - 1) {
      return `A gentle day. Tomorrow will hum the same tune.`;
    }

    // Default
    return `Steady breath. Gentle rhythm. Today flowed.`;
  };

  const fallbackHeadline = getHeadline();

  // Generate template-based headline (instant, no loading)
  const generatedHeadline = useMemo(() => {
    const dateKey = format(dayStart, 'yyyy-MM-dd');
    const cacheKey = `babyrhythm_story_headline_${dateKey}`;

    // Try to load from cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed.headline && parsed.date === dateKey) {
          return parsed.headline;
        }
      }
    } catch (err) {
      console.error('Error loading cached headline:', err);
    }

    // Generate new headline using template logic
    const headline = generateStoryHeadline({
      feedCount,
      napCount,
      totalNapMinutes,
      longestWakeWindow: longestWakeWindowMinutes,
      specialMoments: allSpecialNotes.map(a => a.details.note || '')
    });

    // Cache the headline
    try {
      localStorage.setItem(cacheKey, JSON.stringify({
        headline,
        date: dateKey,
        timestamp: new Date().toISOString()
      }));
    } catch (err) {
      console.error('Error caching headline:', err);
    }

    return headline;
  }, [dayStart, feedCount, napCount, totalNapMinutes, longestWakeWindowMinutes, allSpecialNotes]);

  // Navigation handlers
  const currentDate = targetDate || format(new Date(), 'yyyy-MM-dd');
  const currentIndex = availableDates?.indexOf(currentDate) ?? -1;
  const isOldestDate = currentIndex === 0;
  const isNewestDate = currentIndex === (availableDates?.length ?? 1) - 1;

  const handleNavigate = (direction: 'prev' | 'next') => {
    if (!availableDates || !onNavigate || !allActivities) return;

    // Trigger crossfade animation
    setNavigationDirection(direction);

    // Wait for fade out (250ms) before navigating
    setTimeout(() => {
      if (direction === 'prev') {
        // Don't close - just ignore if at boundary
        if (isOldestDate) {
          setNavigationDirection(null);
          return;
        }
        const prevDate = availableDates[currentIndex - 1];
        if (prevDate) {
          const dayActivities = allActivities.filter(a => {
            if (!a.loggedAt) return false;
            return format(new Date(a.loggedAt), 'yyyy-MM-dd') === prevDate;
          });
          onNavigate(prevDate, dayActivities);
        }
      } else {
        // Don't close - just ignore if at boundary
        if (isNewestDate) {
          setNavigationDirection(null);
          return;
        }
        const nextDate = availableDates[currentIndex + 1];
        if (nextDate) {
          const dayActivities = allActivities.filter(a => {
            if (!a.loggedAt) return false;
            return format(new Date(a.loggedAt), 'yyyy-MM-dd') === nextDate;
          });
          onNavigate(nextDate, dayActivities);
        }
      }
      // Reset direction after content updates
      setTimeout(() => setNavigationDirection(null), 50);
    }, 250);
  };

  // Swipe detection
  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNavigate('next'); // Swipe left = go to next (newer) day
    }
    if (isRightSwipe) {
      handleNavigate('prev'); // Swipe right = go to previous (older) day
    }
  };

  // Tap zone detection
  const handleTapZone = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const rect = target.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const width = rect.width;
    
    // Left 30% = previous day, Right 30% = next day
    if (x < width * 0.3) {
      handleNavigate('prev');
    } else if (x > width * 0.7) {
      handleNavigate('next');
    }
  };

  const headline = generatedHeadline || fallbackHeadline;

  // Generate meaningful insights instead of raw metrics
  const storyInsights = useMemo(() => {
    return generateStoryInsights({
      activities: todayActivities,
      feedCount,
      napCount,
      totalNapMinutes,
      longestWakeWindowMinutes,
      nightSleepStartHour,
      nightSleepEndHour,
      babyName: babyName || 'Baby'
    });
  }, [todayActivities, feedCount, napCount, totalNapMinutes, longestWakeWindowMinutes, nightSleepStartHour, nightSleepEndHour, babyName]);

  // Get photo caption
  const getPhotoCaption = (): string | null => {
    if (heroMoment?.details.note) {
      const time = heroMoment.loggedAt ? format(new Date(heroMoment.loggedAt), "h:mm a") : "";
      return `${heroMoment.details.note}, ${time}`;
    }
    return null;
  };

  // Animation sequence timing - 4 second total
  useEffect(() => {
    if (!isOpen) {
      setAnimationPhase('act1');
      setImageLoaded(false);
      setNavigationDirection(null);
      return;
    }

    // Reset image loaded state and animation phase when date changes
    setImageLoaded(false);
    setAnimationPhase('act1');

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
  }, [isOpen, targetDate]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent hideCloseButton className="max-w-lg h-[90vh] p-0 gap-0 bg-background overflow-hidden border-0">
        {/* Enhanced close button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 z-50 rounded-full p-2 bg-black/40 backdrop-blur-sm hover:bg-black/60 transition-all duration-200 border border-white/20"
        >
          <X className="h-5 w-5 text-white drop-shadow-lg" />
        </button>
        
        <div 
          className={cn(
            "relative w-full h-full overflow-y-auto"
          )}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
          onClick={handleTapZone}
        >
          {/* Solid background layer */}
          <div className="absolute inset-0 bg-background" />
          
          {/* Photo layer on top (full screen) */}
          <div className="fixed inset-0 w-full h-full pointer-events-none">
            {heroMoment?.details.photoUrl ? (
              <div className="relative w-full h-full">
                {/* Hero photo with blur-in animation */}
                <img 
                  key={targetDate || 'today'}
                  src={heroMoment.details.photoUrl} 
                  alt="Today's moment" 
                  onLoad={() => setImageLoaded(true)}
                  className={cn(
                    "w-full h-full object-cover transition-opacity duration-300",
                    navigationDirection ? "opacity-0" : imageLoaded ? "opacity-100 animate-story-photo-blur-in" : "opacity-0 blur-[20px]"
                  )}
                />
                
                {/* Subtle glow in corners */}
                <div className="absolute top-0 left-0 w-32 h-32 bg-white/10 blur-3xl animate-story-glow-corners" />
                <div className="absolute bottom-0 right-0 w-32 h-32 bg-white/10 blur-3xl animate-story-glow-corners" style={{ animationDelay: '1s' }} />
                
                {/* Warm gradient overlay - amber to mauve */}
                <div className="absolute inset-0 bg-gradient-to-b from-[#FFE9D4]/40 via-transparent via-40% to-[#E9E3FF]/40" />
                <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-transparent via-35% to-black/50" />
                
                {/* Date subtitle (fixed on photo) - enhanced visibility */}
                <div className="absolute top-8 left-6 right-6">
                  <p className="text-sm font-medium text-foreground/90 uppercase tracking-[0.25em] animate-story-headline-fade-up drop-shadow-2xl" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.8), 0 0 20px rgba(0,0,0,0.5)' }}>
                    {todayDate}
                  </p>
                </div>
              </div>
            ) : (
              // No photo fallback - ambient gradient matching theme
              <div className="relative w-full h-full">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/15 to-primary/10" />
                <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-background/30 to-transparent" />
                
                {/* Date subtitle for no-photo state */}
                <div className="absolute top-8 left-6 right-6">
                  <p className="text-sm font-medium text-foreground/80 uppercase tracking-[0.25em] animate-story-headline-fade-up">
                    {todayDate}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Scrollable content layer - positioned over fixed photo */}
          <div className={cn(
            "relative w-full min-h-full transition-opacity duration-250 ease-in-out",
            navigationDirection ? "opacity-0" : "opacity-100"
          )}>
            {/* Headline positioned in safe zone - whispered typography */}
            <div className="relative px-8 pt-[30vh]">
              <h1 className="text-[24px] font-serif leading-[1.4] font-light tracking-[0.04em] text-foreground/80 animate-story-headline-type drop-shadow-2xl">
                {headline}
              </h1>
              
              {getPhotoCaption() && (
                <p className="text-[13px] text-foreground/60 mt-4 font-light tracking-[0.03em] animate-story-headline-fade-up drop-shadow-xl" style={{ animationDelay: '2s' }}>
                  {getPhotoCaption()}
                </p>
              )}
            </div>

            {/* Breathing room - 60px */}
            <div className="h-[60px]" />

            {/* ACT 2: Reveal - Meaningful insights section */}
            {animationPhase !== 'act1' && (
              <div className="relative w-full px-6 pb-6 space-y-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 24px)' }}>
              
              {/* Story Insights - Meaningful patterns instead of raw metrics */}
              {storyInsights.map((insight, index) => (
                <div 
                  key={index}
                  className="backdrop-blur-md bg-background/50 rounded-[12px] p-3 border border-border/10 animate-story-card-slide-up shadow-sm"
                  style={{ animationDelay: insight.animationDelay }}
                >
                  <div className="flex items-start gap-2.5">
                    <span className="text-[18px] flex-shrink-0 mt-0.5">{insight.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium text-muted-foreground/70 uppercase tracking-wider mb-1">
                        {insight.label}
                      </div>
                      <p className="text-[14px] leading-relaxed text-foreground/80">
                        {insight.text}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Special moments */}
              {allSpecialNotes.length > 0 && (
                <div 
                  className="backdrop-blur-md bg-background/50 rounded-[12px] p-3 border border-border/10 animate-story-card-slide-up shadow-sm"
                  style={{ animationDelay: '3s' }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="w-[15px] h-[15px] text-primary/70" strokeWidth={1.5} />
                    <span className="text-[14px] font-medium text-foreground/70">Moments</span>
                  </div>
                  <div className="space-y-1.5">
                    {allSpecialNotes.slice(0, 3).map((activity, idx) => {
                      const time = activity.loggedAt ? format(new Date(activity.loggedAt), "h:mm a") : "";
                      return (
                        <div key={idx} className="text-[12px] text-foreground/70 leading-relaxed">
                          <span className="font-num text-muted-foreground/50 italic text-[11px]">{time}</span>
                          <span className="mx-1">·</span>
                          {activity.details.note}
                        </div>
                      );
                    })}
                    {allSpecialNotes.length > 3 && (
                      <div className="text-[11px] text-muted-foreground/50 italic pt-1">
                        +{allSpecialNotes.length - 3} more
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bottom spacer */}
          <div className="relative w-full h-24" />
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
                  Tomorrow awaits · rhythm continues
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
