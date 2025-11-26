import { format } from "date-fns";
import { Sparkles, ChevronRight } from "lucide-react";
import { Activity } from "@/components/ActivityCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";

interface DailyStoryCirclesProps {
  activities: Activity[];
  babyName?: string;
  babyPhotoUrl?: string;
  onSelectDay: (date: string, activities: Activity[]) => void;
}

export const DailyStoryCircles = ({ 
  activities, 
  babyName,
  babyPhotoUrl,
  onSelectDay 
}: DailyStoryCirclesProps) => {
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  
  // Get today's date and activities
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayActivities = activities.filter(a => {
    if (!a.loggedAt) return false;
    const activityDate = new Date(a.loggedAt);
    return format(activityDate, 'yyyy-MM-dd') === todayStr;
  });

  // Find the first activity with a photo FROM TODAY ONLY
  const activityWithPhoto = todayActivities.find(a => a.details?.photoUrl);
  const hasPhotoFromToday = !!activityWithPhoto;

  // Check if current time is within "story time" window (bedtime to wake-up time)
  const currentHour = today.getHours();
  const isStoryTime = currentHour >= nightSleepStartHour || currentHour < nightSleepEndHour;

  // Count feeds and naps to ensure story is meaningful
  const feedCount = todayActivities.filter(a => a.type === 'feed').length;
  const napCount = todayActivities.filter(a => a.type === 'nap').length;
  const hasMinimumForStory = feedCount >= 1 && napCount >= 1;

  // Don't show if no activities today OR if it's not story time OR insufficient data
  if (todayActivities.length === 0 || !isStoryTime || !hasMinimumForStory) {
    return null;
  }

  return (
    <div className="mx-2 mb-6">
      <button
        onClick={() => onSelectDay(todayStr, todayActivities)}
        className="group relative w-full flex items-center gap-3 px-4 py-3.5 rounded-xl bg-card/50 hover:bg-card/60 transition-all duration-300 overflow-hidden backdrop-blur-sm"
      >
        {/* Rainbow shimmer border effect */}
        <div className="absolute inset-0 rounded-xl opacity-60 animate-rainbow-shimmer" 
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--accent)), hsl(280 65% 60%), transparent)',
            backgroundSize: '200% 100%'
          }} 
        />
        <div className="absolute inset-[1px] rounded-xl bg-card/50 backdrop-blur-sm" />
        
        {/* Icon - photo if available from today, otherwise ambient gradient */}
        {hasPhotoFromToday ? (
          <Avatar className="relative w-11 h-11 border border-primary/30 shadow-sm z-10">
            <AvatarImage src={activityWithPhoto.details.photoUrl} alt="Today's moment" className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="relative w-11 h-11 rounded-full bg-gradient-to-br from-primary/30 via-accent/20 to-primary/30 flex items-center justify-center z-10">
            <Sparkles className="w-5 h-5 text-primary/70" />
          </div>
        )}
        
        {/* Text */}
        <span className="relative flex-1 text-left text-base font-serif font-medium text-foreground z-10">
          Today's Story
        </span>
        
        {/* Chevron */}
        <ChevronRight className="relative w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform z-10" />
      </button>
    </div>
  );
};
