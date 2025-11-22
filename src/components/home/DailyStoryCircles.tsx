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
        className="group relative w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl bg-card/50 hover:bg-card/60 transition-all duration-300 overflow-hidden backdrop-blur-sm"
      >
        {/* Rainbow shimmer border effect */}
        <div className="absolute inset-0 rounded-2xl opacity-60 animate-rainbow-shimmer" 
          style={{
            background: 'linear-gradient(90deg, transparent, hsl(var(--primary)), hsl(var(--accent)), hsl(280 65% 60%), transparent)',
            backgroundSize: '200% 100%'
          }} 
        />
        <div className="absolute inset-[1px] rounded-2xl bg-card/50 backdrop-blur-sm" />
        
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
        <span className="relative flex-1 text-left text-base font-medium text-foreground z-10">
          Today's Story
        </span>
        
        {/* Chevron */}
        <ChevronRight className="relative w-5 h-5 text-muted-foreground group-hover:translate-x-0.5 transition-transform z-10" />
      </button>
    </div>
  );
};
