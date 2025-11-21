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

  // Find the first activity with a photo FROM TODAY ONLY
  const activityWithPhoto = todayActivities.find(a => a.details?.photoUrl);
  const hasPhotoFromToday = !!activityWithPhoto;

  // Don't show if no activities today
  if (todayActivities.length === 0) {
    return null;
  }

  return (
    <div className="px-4 pb-2">
      <button 
        onClick={() => onSelectDay(todayStr, todayActivities)}
        className="group relative w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card hover:bg-card/80 transition-all duration-300 border border-border/50 overflow-hidden"
      >
        {/* Shimmer effect around the card */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent animate-story-shimmer-slow pointer-events-none" />
        
        {/* Icon - photo if available from today, otherwise sparkles */}
        {hasPhotoFromToday ? (
          <Avatar className="relative w-10 h-10 border-2 border-border/30 shadow-sm">
            <AvatarImage src={activityWithPhoto.details.photoUrl} alt="Today's moment" className="object-cover" />
            <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
              <Sparkles className="w-5 h-5 text-primary" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="relative w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary animate-story-shimmer" />
          </div>
        )}
        
        {/* Text */}
        <span className="relative flex-1 text-left text-base font-medium text-foreground">
          Today's Story
        </span>
        
        {/* Chevron */}
        <ChevronRight className="relative w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
      </button>
    </div>
  );
};
