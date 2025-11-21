import { format } from "date-fns";
import { Sparkles, ChevronRight } from "lucide-react";
import { Activity } from "@/components/ActivityCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  // Get today's date and activities
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayActivities = activities.filter(a => {
    if (!a.loggedAt) return false;
    const activityDate = new Date(a.loggedAt);
    return format(activityDate, 'yyyy-MM-dd') === todayStr;
  });

  // Find the first activity with a photo, otherwise use baby photo
  const activityWithPhoto = todayActivities.find(a => a.details?.photoUrl);
  const photoUrl = activityWithPhoto?.details?.photoUrl || babyPhotoUrl;

  // Don't show if no activities today
  if (todayActivities.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pb-2">
      <button 
        onClick={() => onSelectDay(todayStr, todayActivities)}
        className="group relative w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-gradient-to-r from-[hsl(320_40%_92%)] to-[hsl(280_40%_92%)] dark:from-[hsl(320_40%_20%)] dark:to-[hsl(280_40%_22%)] hover:from-[hsl(320_40%_88%)] hover:to-[hsl(280_40%_88%)] dark:hover:from-[hsl(320_40%_25%)] dark:hover:to-[hsl(280_40%_27%)] transition-all duration-300 border border-[hsl(320_30%_85%)] dark:border-[hsl(320_30%_25%)]"
      >
        {/* Subtle sparkle overlay effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-2xl opacity-50 animate-story-breathe" />
        
        {/* Avatar with photo or sparkle fallback */}
        <Avatar className="relative w-14 h-14 border-2 border-background shadow-md">
          <AvatarImage src={photoUrl} alt="Today's moment" className="object-cover" />
          <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
            <Sparkles className="w-6 h-6 text-primary animate-story-shimmer" />
          </AvatarFallback>
        </Avatar>
        
        {/* Text */}
        <span className="relative flex-1 text-left text-lg font-semibold text-[hsl(320_45%_35%)] dark:text-[hsl(320_60%_90%)]">
          Today's Story
        </span>
        
        {/* Chevron */}
        <ChevronRight className="relative w-5 h-5 text-[hsl(320_45%_45%)] dark:text-[hsl(320_60%_70%)] group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
