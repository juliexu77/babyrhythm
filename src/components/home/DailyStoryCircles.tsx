import { useState, useEffect } from "react";
import { format, subDays, isToday, parseISO } from "date-fns";
import { Sparkles } from "lucide-react";
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

  // Only show circles if we have at least one story
  if (stories.length === 0) return null;

  return (
    <div className="w-full -mx-4 py-2 pb-3 bg-transparent">
      <div className="flex items-center justify-center gap-3 px-0 py-2">
        {stories.map((story, index) => {
          const storyDate = parseISO(story.date);
          const isTodayStory = isToday(storyDate);
          const isStoryReady = isTodayStory && isAfter5PM;
          
          return (
            <button
              key={story.date}
              onClick={() => onSelectDay(story.date, story.activities)}
              className="group relative flex-shrink-0 transition-all duration-300 hover:scale-105"
            >
              {/* Pulse effect for ready stories */}
              {isStoryReady && (
                <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur opacity-75 animate-pulse"></div>
              )}
              
              {/* Circle container */}
              <div className={`relative w-16 h-16 rounded-full overflow-hidden ${
                isTodayStory 
                  ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' 
                  : ''
              } ${isStoryReady ? 'animate-story-breathe' : ''}`}>
                {/* Gradient background based on activity level */}
                <div className={`w-full h-full ${
                  story.feedCount + story.napCount >= 10
                    ? 'bg-gradient-to-br from-primary/30 to-accent/30'
                    : story.feedCount + story.napCount >= 6
                      ? 'bg-gradient-to-br from-primary/20 to-accent/20'
                      : 'bg-gradient-to-br from-primary/10 to-accent/10'
                }`}>
                  {/* Date label */}
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Sparkles className={`w-4 h-4 mb-1 ${
                      isStoryReady
                        ? 'text-primary animate-story-shimmer' 
                        : isTodayStory 
                          ? 'text-primary' 
                          : 'text-primary/60'
                    }`} />
                    <span className="text-[10px] font-medium text-foreground/70">
                      {isTodayStory ? 'Today' : format(storyDate, 'MMM d')}
                    </span>
                  </div>
                </div>

                {/* Hover overlay */}
                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              {/* "Today" label - removed since it's now in the circle */}
            </button>
          );
        })}
      </div>
    </div>
  );
};
