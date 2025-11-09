import { useState, useEffect } from "react";
import { format, subDays, isToday, parseISO } from "date-fns";
import { Sparkles, Camera, PenLine, Plus } from "lucide-react";
import { Activity } from "@/components/ActivityCard";

interface CachedStory {
  date: string; // YYYY-MM-DD format
  headline: string;
  feedCount: number;
  napCount: number;
  activities: Activity[];
}

interface DailyStoryCirclesProps {
  activities: Activity[];
  babyName?: string;
  onSelectDay: (date: string, activities: Activity[]) => void;
}

export const DailyStoryCircles = ({ 
  activities, 
  babyName,
  onSelectDay 
}: DailyStoryCirclesProps) => {
  const [stories, setStories] = useState<CachedStory[]>([]);
  
  // Check if it's after 5pm for "story ready" state
  const isAfter5PM = new Date().getHours() >= 17;

  // Cache stories - always backfill for prior days
  useEffect(() => {
    const cacheKey = 'babyrhythm_daily_stories';

    // Load cached stories from localStorage
    const loadCachedStories = (): CachedStory[] => {
      try {
        const cached = localStorage.getItem(cacheKey);
        return cached ? JSON.parse(cached) : [];
      } catch {
        return [];
      }
    };

    // Generate story for a specific date
    const generateStoryForDate = (targetDate: Date): CachedStory | null => {
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      const dayActivities = activities.filter(a => {
        if (!a.loggedAt) return false;
        const activityDate = new Date(a.loggedAt);
        return format(activityDate, 'yyyy-MM-dd') === dateStr;
      });

      if (dayActivities.length === 0) return null;

      const feedCount = dayActivities.filter(a => a.type === 'feed').length;
      const napCount = dayActivities.filter(a => a.type === 'nap' && !a.details.isNightSleep).length;

      // Generate simple headline
      const headline = feedCount >= 8 
        ? "Growing strong" 
        : napCount >= 4 
          ? "Deep rest"
          : feedCount + napCount >= 8
            ? "Balanced day"
            : "Gentle rhythm";

      return {
        date: dateStr,
        headline,
        feedCount,
        napCount,
        activities: dayActivities
      };
    };

    const cachedStories = loadCachedStories();
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Generate stories for the last 5 days - always backfill
    const newStories: CachedStory[] = [];
    for (let i = 0; i < 5; i++) {
      const targetDate = subDays(today, i);
      const dateStr = format(targetDate, 'yyyy-MM-dd');

      // Always generate fresh story for each day
      const story = generateStoryForDate(targetDate);
      if (story) {
        newStories.push(story);
      }
    }

    setStories(newStories.reverse()); // Reverse so most recent is on the right

    // Always save to cache
    if (newStories.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify(newStories));
    }
  }, [activities]);

  // Empty state for new users
  if (activities.length === 0) {
    return (
      <div className="w-full -mx-4 py-2 pb-3 bg-transparent">
        <div className="flex items-center justify-center px-4 py-4">
          <div className="relative group">
            {/* Animated gradient border */}
            <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 to-accent/30 rounded-2xl blur opacity-60 group-hover:opacity-100 transition duration-500 animate-pulse"></div>
            
            {/* Card content */}
            <div className="relative px-6 py-5 bg-card rounded-2xl border border-border/50 space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary animate-story-shimmer" />
                <h3 className="text-sm font-semibold text-foreground">Your Daily Story</h3>
              </div>
              
              <p className="text-xs text-muted-foreground leading-relaxed">
                Log activities throughout the day to unlock your personalized daily story. Each story captures {babyName}'s unique rhythm and milestones.
              </p>
              
              <div className="flex items-center gap-2 pt-1">
                <div className="flex -space-x-1">
                  <div className="w-6 h-6 rounded-full bg-primary/10 border-2 border-background flex items-center justify-center">
                    <span className="text-[9px]">📸</span>
                  </div>
                  <div className="w-6 h-6 rounded-full bg-accent/10 border-2 border-background flex items-center justify-center">
                    <span className="text-[9px]">✨</span>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  Tip: Add a photo to make your story even more special
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Generate gradients matching Today's Pulse card aesthetic
  const getDayGradient = (dateStr: string) => {
    // Using colors from card-ombre-3 variants for consistency
    return 'from-card-ombre-3-dark to-card-ombre-3';
  };

  // Only show circles if we have at least one story
  if (stories.length === 0) return null;

  return (
    <div className="w-full py-2 pb-3 bg-transparent">
      {/* Subtle gradient track behind circles */}
      <div className="relative px-4 py-2">
        <div 
          className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-10 mx-4 rounded-full"
          style={{
            background: 'linear-gradient(to right, hsl(280, 30%, 65%) 0%, hsl(350, 45%, 70%) 100%)',
            opacity: 0.15,
            filter: 'blur(3px)'
          }}
        />
        
        <div className="relative flex items-center justify-center gap-3 py-2">
        {stories.map((story, index) => {
          const storyDate = parseISO(story.date);
          const isTodayStory = isToday(storyDate);
          const isStoryReady = isTodayStory && isAfter5PM;
          
          // Check content types
          const hasPhoto = story.activities.some(a => a.type === 'photo' || a.details?.photoUrl);
          const hasNote = story.activities.some(a => a.details?.note);
          const isEmpty = story.activities.length === 0;
          
          // Get the first photo for background
          const firstPhoto = story.activities.find(a => a.details?.photoUrl)?.details?.photoUrl;
          
          return (
            <button
              key={story.date}
              onClick={() => onSelectDay(story.date, story.activities)}
              className="group flex flex-col items-center gap-1.5 flex-shrink-0 transition-all duration-300 hover:scale-105"
            >
              {/* Enhanced bold ring for Today with prominent shimmer/glow - positioned around circle only */}
              <div className="relative">
                {isTodayStory && (
                  <>
                    {/* Outer glow */}
                    <div 
                      className="absolute -inset-[6px] rounded-full opacity-60 animate-pulse"
                      style={{
                        background: 'linear-gradient(135deg, hsl(336, 41%, 55%) 0%, hsl(24, 46%, 74%) 100%)',
                        filter: 'blur(4px)',
                        animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }}
                    />
                    {/* Bold gradient ring */}
                    <div 
                      className="absolute -inset-[4px] rounded-full animate-story-shimmer"
                      style={{
                        background: 'linear-gradient(135deg, hsl(336, 41%, 55%) 0%, hsl(24, 46%, 74%) 100%)',
                      }}
                    />
                    {/* Inner white ring */}
                    <div 
                      className="absolute -inset-[1.5px] rounded-full bg-background"
                    />
                  </>
                )}
              
              {/* Circle container - outlined only */}
              <div 
                className="relative w-16 h-16 rounded-full border-2 border-border/30 bg-background transition-all duration-300 group-hover:border-border/50"
              >
                {/* Content - sparkle for Today only */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {isTodayStory && (
                    <Sparkles className="w-5 h-5 text-primary animate-story-shimmer" />
                  )}
                </div>
              </div>
              </div>
              
              {/* Label below circle */}
              <span className="text-[10px] font-medium text-foreground/70">
                {isTodayStory ? 'Today' : format(storyDate, 'EEE')}
              </span>
            </button>
          );
        })}
        </div>
      </div>
    </div>
  );
};
