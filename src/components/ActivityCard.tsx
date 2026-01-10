import { Clock, Milk, Droplet, Moon, StickyNote, Utensils, Camera, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { MilestoneBadge } from "./MilestoneBadge";
import { Milestone } from "@/utils/milestoneDetection";

export interface Activity {
  id: string;
  type: "feed" | "diaper" | "nap" | "note" | "solids" | "photo";
  time: string;
  loggedAt?: string;
  timezone?: string;
  details: {
    feedType?: "bottle" | "nursing";
    quantity?: string;
    unit?: "oz" | "ml";
    minutesLeft?: string;
    minutesRight?: string;
    solidDescription?: string;
    isDreamFeed?: boolean;
    diaperType?: "wet" | "poopy" | "both";
    hasLeak?: boolean;
    hasCream?: boolean;
    startTime?: string;
    endTime?: string;
    isNightSleep?: boolean;
    photoUrl?: string;
    allergens?: string[];
    note?: string;
    displayTime?: string;
  };
}

interface ActivityCardProps {
  activity: Activity;
  babyName?: string;
  onEdit?: (activity: Activity) => void;
  onDelete?: (activityId: string) => void;
  milestones?: Milestone[];
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "feed":
      return <Milk className="h-4 w-4" />;
    case "diaper":
      return <Droplet className="h-4 w-4" />;
    case "nap":
      return <Moon className="h-4 w-4" />;
    case "note":
      return <StickyNote className="h-4 w-4" />;
    case "solids":
      return <Utensils className="h-4 w-4" />;
    case "photo":
      return <Camera className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

const calculateNapDuration = (startTime: string, endTime: string): string => {
  try {
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
    
    if (durationMinutes < 0) {
      durationMinutes += 24 * 60;
    }
    
    if (durationMinutes >= 60) {
      const hours = Math.floor(durationMinutes / 60);
      const minutes = durationMinutes % 60;
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    
    return `${durationMinutes}m`;
  } catch (error) {
    return 'unknown duration';
  }
};

const getActivityValueAndDescriptor = (activity: Activity, t: (key: string) => string): { value: string; descriptor: string } => {
  switch (activity.type) {
    case "feed":
      const { feedType, quantity, unit, minutesLeft, minutesRight, isDreamFeed } = activity.details;
      
      if (feedType === "bottle" && quantity && unit) {
        return {
          value: `${quantity} ${unit}`,
          descriptor: isDreamFeed ? `Formula (${t('dreamFeed')})` : "Formula"
        };
      } else if (feedType === "nursing") {
        const leftTime = minutesLeft ? parseInt(minutesLeft) : 0;
        const rightTime = minutesRight ? parseInt(minutesRight) : 0;
        const totalTime = leftTime + rightTime;
        
        if (totalTime > 0) {
          return {
            value: `${totalTime} min`,
            descriptor: isDreamFeed ? `Nursing (${t('dreamFeed')})` : "Nursing"
          };
        } else {
          return {
            value: "Nursed",
            descriptor: isDreamFeed ? `(${t('dreamFeed')})` : ""
          };
        }
      } else {
        return {
          value: "Feed",
          descriptor: isDreamFeed ? `(${t('dreamFeed')})` : ""
        };
      }
      
    case "diaper":
      const type = activity.details.diaperType;
      if (type === "wet") {
        return { value: "Wet", descriptor: "Diaper" };
      } else if (type === "poopy") {
        return { value: "Poopy", descriptor: "Diaper" };
      } else if (type === "both") {
        return { value: "Wet & Poopy", descriptor: "Diaper" };
      }
      return { value: "Diaper", descriptor: "Change" };
      
    case "nap":
      if (activity.details.startTime && activity.details.endTime) {
        const duration = calculateNapDuration(activity.details.startTime, activity.details.endTime);
        return { value: duration, descriptor: activity.details.isNightSleep ? "Night sleep" : "Nap" };
      } else if (activity.details.startTime && !activity.details.endTime) {
        return { value: "Sleeping", descriptor: `Started ${activity.details.startTime}` };
      }
      return { value: "Nap", descriptor: "" };
      
    case "note":
      return { 
        value: "Note", 
        descriptor: activity.details.note ? activity.details.note.substring(0, 30) + (activity.details.note.length > 30 ? "..." : "") : ""
      };
      
    case "solids":
      const allergensArray = (activity.details as any)?.allergens || [];
      return {
        value: activity.details.solidDescription || "Solids",
        descriptor: allergensArray.length > 0 ? `Allergens: ${allergensArray.join(', ')}` : "Meal"
      };
      
    case "photo":
      return { 
        value: "Photo", 
        descriptor: activity.details.note || "Memory captured"
      };
      
    default:
      return { value: "Activity", descriptor: "" };
  }
};

export const ActivityCard = ({ activity, babyName = "Baby", onEdit, onDelete, milestones = [] }: ActivityCardProps) => {
  const { t } = useLanguage();
  const { value, descriptor } = getActivityValueAndDescriptor(activity, t);

  const handleClick = () => {
    if (onEdit) {
      onEdit(activity);
    }
  };

  // Get activity type label
  const getTypeLabel = () => {
    switch (activity.type) {
      case "feed": return "Feed";
      case "diaper": return "Diaper";
      case "nap": return activity.details?.isNightSleep ? "Night Sleep" : "Nap";
      case "note": return "Note";
      case "solids": return "Solids";
      case "photo": return "Photo";
      default: return "Activity";
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left group"
    >
      {/* Flat row - no card background, just a subtle hover state */}
      <div className="py-2.5 px-4 hover:bg-muted/20 active:bg-muted/30 transition-colors border-b border-border/30 last:border-b-0">
        <div className="flex items-center justify-between gap-3">
          {/* Left: Icon + Content */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            {/* Minimal icon - just color, no background */}
            <div className="text-foreground/60 flex-shrink-0">
              {getActivityIcon(activity.type)}
            </div>
            
            <div className="min-w-0 flex-1">
              {/* Inline: Type + Value on same line */}
              <div className="flex items-baseline gap-1.5">
                <span className="text-label-sm text-foreground">{getTypeLabel()}</span>
                <span className="text-sm text-muted-foreground">·</span>
                <span className="text-body-muted">{value}</span>
              </div>
              {/* Descriptor as secondary text */}
              {descriptor && (
                <p className="text-label-xs text-muted-foreground/50 truncate mt-0.5">{descriptor}</p>
              )}
            </div>
          </div>
          
          {/* Right: Time only, no chevron for cleaner look */}
          <span className="text-xs text-muted-foreground/60 tabular-nums flex-shrink-0">
            {activity.type === 'nap' && activity.details.startTime && !activity.details.endTime
              ? activity.details.startTime
              : activity.time
            }
          </span>
        </div>
        
        {/* Milestone badges - inline with content */}
        {milestones.length > 0 && (
          <div className="pl-7 mt-1">
            {milestones.map(milestone => (
              <MilestoneBadge key={milestone.id} milestone={milestone} />
            ))}
          </div>
        )}
      </div>
    </button>
  );
};
