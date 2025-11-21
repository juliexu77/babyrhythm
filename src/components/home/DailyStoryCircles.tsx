import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Sparkles } from "lucide-react";
import { Activity } from "@/components/ActivityCard";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

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
  // Get today's date and activities
  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const todayActivities = activities.filter(a => {
    if (!a.loggedAt) return false;
    const activityDate = new Date(a.loggedAt);
    return format(activityDate, 'yyyy-MM-dd') === todayStr;
  });

  // Find the first activity with a photo
  const activityWithPhoto = todayActivities.find(a => a.details?.photoUrl);
  const photoUrl = activityWithPhoto?.details?.photoUrl;

  // Don't show if no activities today
  if (todayActivities.length === 0) {
    return null;
  }

  return (
    <div className="px-4">
      <button 
        onClick={() => onSelectDay(todayStr, todayActivities)}
        className="group inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(320_40%_92%)] dark:bg-[hsl(320_40%_25%)] hover:bg-[hsl(320_40%_88%)] dark:hover:bg-[hsl(320_40%_30%)] transition-all duration-300 animate-story-breathe"
      >
        {photoUrl ? (
          <Avatar className="w-5 h-5">
            <AvatarImage src={photoUrl} alt="Today's moment" />
            <AvatarFallback>
              <Sparkles className="w-3 h-3" />
            </AvatarFallback>
          </Avatar>
        ) : (
          <Sparkles className="w-3.5 h-3.5 text-[hsl(320_45%_55%)] dark:text-[hsl(320_60%_70%)] animate-story-shimmer" />
        )}
        <span className="text-sm font-medium text-[hsl(320_45%_40%)] dark:text-[hsl(320_60%_85%)] animate-story-fade-in">
          Today's Story
        </span>
      </button>
    </div>
  );
};
