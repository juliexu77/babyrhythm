import { useState, useEffect } from "react";
import { format, subDays, isToday, parseISO } from "date-fns";
import { Sparkles } from "lucide-react";
import dynamicIconImports from "lucide-react/dynamicIconImports";
import { Activity } from "@/components/ActivityCard";

interface CachedStory {
  date: string; // YYYY-MM-DD format
  headline: string;
  feedCount: number;
  napCount: number;
  activities: Activity[];
  icon?: string | null; // AI-suggested icon name
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
    const cacheKey = 'babyrhythm_daily_stories_v2'; // v2: fixed backfill logic

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
    const generateStoryForDate = async (targetDate: Date): Promise<CachedStory | null> => {
      const dateStr = format(targetDate, 'yyyy-MM-dd');
      const dayActivities = activities.filter(a => {
        if (!a.loggedAt) return false;
        const activityDate = new Date(a.loggedAt);
        return format(activityDate, 'yyyy-MM-dd') === dateStr;
      });

      if (dayActivities.length === 0) return null;

      const feedCount = dayActivities.filter(a => a.type === 'feed').length;
      const napCount = dayActivities.filter(a => a.type === 'nap' && !a.details.isNightSleep).length;

      // Check cache first - only use cached story if it has a valid icon
      const cached = cachedStories.find(s => s.date === dateStr);
      if (cached && cached.icon !== null && cached.icon !== undefined) {
        // Update with latest activity counts but keep cached headline/icon
        return {
          ...cached,
          feedCount,
          napCount,
          activities: dayActivities
        };
      }

      // Generate simple headline as fallback (will be replaced by AI if possible)
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
        activities: dayActivities,
        icon: null // Will be populated by AI later
      };
    };

    const cachedStories = loadCachedStories();
    const today = new Date();
    const todayStr = format(today, 'yyyy-MM-dd');

    // Always show 5 days (today and 4 prior days) - even if empty
    const fetchStories = async () => {
      const newStories: CachedStory[] = [];
      for (let i = 4; i >= 0; i--) { // Count backwards from 4 days ago to today
        const targetDate = subDays(today, i);
        const dateStr = format(targetDate, 'yyyy-MM-dd');

        // Generate story for each day, or create empty placeholder
        const story = await generateStoryForDate(targetDate);
        if (story) {
          newStories.push(story);
        } else {
          // Create empty story placeholder for days without activities
          newStories.push({
            date: dateStr,
            headline: "",
            feedCount: 0,
            napCount: 0,
            activities: [],
            icon: null
          });
        }
      }

      setStories(newStories); // Already in correct order (oldest to newest)

      // Save to cache (including empty placeholders)
      localStorage.setItem(cacheKey, JSON.stringify(newStories));

      // Fetch AI icons for days that don't have them yet (excluding today and empty days)
      const storiesNeedingIcons = newStories.filter(
        s => s.activities.length > 0 && s.icon === null && s.date !== todayStr
      );

      if (storiesNeedingIcons.length > 0) {
        console.log(`🎨 Backfilling AI icons for ${storiesNeedingIcons.length} days:`, storiesNeedingIcons.map(s => s.date));
        
        // Fetch icons immediately (not in background)
        const updatedStoriesWithIcons = await Promise.all(
          storiesNeedingIcons.map(async (story) => {
            try {
              // Calculate total nap minutes
              const totalNapMinutes = story.activities
                .filter(a => a.type === 'nap' && !a.details.isNightSleep)
                .reduce((sum, a) => {
                  if (a.details.startTime && a.details.endTime) {
                    const start = new Date(a.details.startTime).getTime();
                    const end = new Date(a.details.endTime).getTime();
                    return sum + (end - start) / (1000 * 60);
                  }
                  return sum;
                }, 0);

              const solidFeeds = story.activities.filter(a => a.type === 'feed' && a.details.feedType === 'solid');
              const specialNotes = story.activities.filter(a => a.details?.note);

              console.log(`📖 Fetching AI icon for ${story.date}...`);
              
              const response = await fetch(
                `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-story-headline`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    feedCount: story.feedCount,
                    napCount: story.napCount,
                    totalNapMinutes,
                    hadSolidFood: solidFeeds.length > 0,
                    solidFoodNote: solidFeeds[0]?.details.note || null,
                    specialMoments: specialNotes.slice(0, 3).map(a => a.details.note),
                    babyName
                  })
                }
              );

              if (response.ok) {
                const data = await response.json();
                console.log(`✅ AI icon for ${story.date}:`, data.icon, data.headline);
                if (data.headline || data.icon) {
                  // Update story with AI-generated data
                  return {
                    ...story,
                    headline: data.headline || story.headline,
                    icon: data.icon || story.icon
                  };
                }
              } else {
                console.warn(`❌ Failed to fetch AI icon for ${story.date}:`, response.status);
              }
            } catch (err) {
              console.error(`❌ Error fetching AI icon for ${story.date}:`, err);
            }
            return story;
          })
        );
        
        // Update cache and state with AI-generated icons
        const finalStories = newStories.map(s => {
          const updated = updatedStoriesWithIcons.find(u => u.date === s.date);
          return updated || s;
        });
        
        setStories(finalStories);
        localStorage.setItem(cacheKey, JSON.stringify(finalStories));
      }
    };

    fetchStories();
  }, [activities, babyName]);

  // Empty state for completely new users (no stories at all)
  if (stories.length === 0) {
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

  // Render dynamic icon component
  const DynamicIcon = ({ iconName }: { iconName: string }) => {
    const [IconComponent, setIconComponent] = useState<any>(null);
    
    useEffect(() => {
      const loadIcon = async () => {
        try {
          const iconKey = iconName.charAt(0).toLowerCase() + iconName.slice(1);
          const kebabCase = iconKey.replace(/([A-Z])/g, '-$1').toLowerCase();
          
          if (kebabCase in dynamicIconImports) {
            const module = await dynamicIconImports[kebabCase as keyof typeof dynamicIconImports]();
            setIconComponent(() => module.default);
          }
        } catch (error) {
          console.warn('Failed to load icon:', iconName, error);
        }
      };
      loadIcon();
    }, [iconName]);
    
    if (!IconComponent) return null;
    return <IconComponent className="w-5 h-5" style={{ color: 'hsl(300, 35%, 55%)' }} />;
  };

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
          
          return (
            <button
              key={story.date}
              onClick={() => onSelectDay(story.date, story.activities)}
              className="group flex flex-col items-center gap-1.5 flex-shrink-0 transition-all duration-300 hover:scale-105"
            >
              {/* Subtle ring for Today - toned down */}
              <div className="relative">
                {isTodayStory && (
                  <>
                    {/* Subtle outer glow */}
                    <div 
                      className="absolute -inset-[3px] rounded-full opacity-30"
                      style={{
                        background: 'linear-gradient(135deg, hsl(336, 41%, 55%) 0%, hsl(24, 46%, 74%) 100%)',
                        filter: 'blur(3px)',
                        animation: 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                      }}
                    />
                    {/* Thin gradient ring */}
                    <div 
                      className="absolute -inset-[2px] rounded-full"
                      style={{
                        background: 'linear-gradient(135deg, hsl(336, 41%, 55%) 0%, hsl(24, 46%, 74%) 100%)',
                      }}
                    />
                  </>
                )}
              
              {/* Circle container - outlined only */}
              <div 
                className="relative w-16 h-16 rounded-full border-[3px] bg-background transition-all duration-300"
                style={{
                  borderColor: 'hsl(340, 35%, 65%)'
                }}
              >
                {/* Emotional anchor icon or sparkle for Today */}
                <div className="relative w-full h-full flex items-center justify-center">
                  {isTodayStory ? (
                    <Sparkles className="w-5 h-5 text-primary animate-story-shimmer" />
                  ) : story.icon ? (
                    <DynamicIcon iconName={story.icon} />
                  ) : null}
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
