import { Clock, Baby, Palette, Moon, StickyNote, Trash2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface Activity {
  id: string;
  type: "feed" | "diaper" | "nap" | "note";
  time: string;
  loggedAt?: string; // Add the original logged timestamp
  details: {
    // Feed details
    feedType?: "bottle" | "nursing" | "solid";
    quantity?: string;
    unit?: "oz" | "ml";
    minutesLeft?: string;
    minutesRight?: string;
    solidDescription?: string;
    // Diaper details
    diaperType?: "wet" | "poopy" | "both";
    hasLeak?: boolean;
    hasCream?: boolean;
    // Nap details
    startTime?: string;
    endTime?: string;
    // General
    note?: string;
  };
}

interface ActivityCardProps {
  activity: Activity;
  babyName?: string;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activityId: string) => void;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "feed":
      return <Baby className="h-4 w-4" />;
    case "diaper":
      return <Palette className="h-4 w-4" />;
    case "nap":
      return <Moon className="h-4 w-4" />;
    case "note":
      return <StickyNote className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const getActivityGradient = (type: string) => {
  switch (type) {
    case "feed":
      return "bg-gradient-feed";
    case "diaper":
      return "bg-gradient-diaper";
    case "nap":
      return "bg-gradient-nap";
    case "note":
      return "bg-gradient-note";
    default:
      return "bg-gradient-primary";
  }
};

const calculateNapDuration = (startTime: string, endTime: string): string => {
  try {
    // Parse time strings (assuming format like "2:30 PM")
    const parseTime = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let totalMinutes = minutes;
      let adjustedHours = hours;
      
      if (period === 'PM' && hours !== 12) {
        adjustedHours += 12;
      } else if (period === 'AM' && hours === 12) {
        adjustedHours = 0;
      }
      
      totalMinutes += adjustedHours * 60;
      return totalMinutes;
    };

    const startMinutes = parseTime(startTime);
    const endMinutes = parseTime(endTime);
    
    let durationMinutes = endMinutes - startMinutes;
    
    // Handle case where nap goes past midnight
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }
    
    if (durationMinutes >= 60) {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}min` : `${hours}h`;
    }
    
    return `${durationMinutes}min`;
  } catch (error) {
    return 'unknown duration';
  }
};

const getPersonalizedActivityText = (activity: Activity, babyName: string = "Baby") => {
  switch (activity.type) {
    case "feed":
      const { feedType, quantity, unit, minutesLeft, minutesRight, solidDescription } = activity.details;
      
      if (feedType === "bottle" && quantity && unit) {
        return `${babyName} drank ${quantity} ${unit}`;
      } else if (feedType === "nursing") {
        const leftTime = minutesLeft ? parseInt(minutesLeft) : 0;
        const rightTime = minutesRight ? parseInt(minutesRight) : 0;
        const totalTime = leftTime + rightTime;
        
        if (totalTime > 0) {
          return `${babyName} nursed ${totalTime} min total`;
        }
        return `${babyName} nursed`;
      } else if (feedType === "solid") {
        if (solidDescription) {
          return `${babyName} ate ${solidDescription}`;
        }
        return `${babyName} had solids`;
      }
      return `${babyName} had a feeding`;
    case "diaper":
      const type = activity.details.diaperType;
      if (type === "wet") {
        return `${babyName} had a wet diaper`;
      } else if (type === "poopy") {
        return `${babyName} had a poop diaper`;
      } else if (type === "both") {
        return `${babyName} had a wet and poop diaper`;
      }
      return `${babyName} had a diaper change`;
    case "nap":
      if (activity.details.startTime && activity.details.endTime) {
        const duration = calculateNapDuration(activity.details.startTime, activity.details.endTime);
        return `${babyName} slept ${duration}`;
      }
      return `${babyName} took a nap`;
    case "note":
      return activity.details.note || `${babyName} note`;
    default:
      return `${babyName} activity`;
  }
};

export const ActivityCard = ({ activity, babyName = "Baby", onEdit, onDelete }: ActivityCardProps) => {
  const activityText = getPersonalizedActivityText(activity, babyName);

  const handleClick = () => {
    if (onEdit) {
      onEdit(activity);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the edit click
    if (onDelete) {
      onDelete(activity.id);
    }
  };

  return (
    <div className="relative flex items-center gap-3 py-1 group hover:bg-accent/30 rounded-md px-2 transition-colors">
      {/* Timeline line */}
      <div className="absolute left-3 top-5 bottom-0 w-0.5 bg-border group-last:hidden"></div>
      
      {/* Timeline marker */}
      <div className={`relative z-10 flex-shrink-0 w-6 h-6 rounded-full ${getActivityGradient(activity.type)} flex items-center justify-center text-white`}>
        {getActivityIcon(activity.type)}
      </div>
      
      {/* Content - clickable single line */}
      <div className="flex-1 flex items-center justify-between min-w-0">
        <button
          onClick={handleClick}
          className="flex-1 text-left"
          disabled={!onEdit && !onDelete}
        >
          <p className="text-sm text-foreground font-medium capitalize truncate hover:text-primary transition-colors">
            {activityText}
          </p>
        </button>
        <div className="flex items-center gap-2 ml-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            {activity.time}
          </span>
          {/* Delete button - appears on hover */}
          {onDelete && (
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-destructive/10 rounded text-destructive hover:text-destructive/80"
              title="Delete activity"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};