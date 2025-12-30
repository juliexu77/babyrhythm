import { Clock, Milk, Droplet, Moon, StickyNote, Utensils, Camera, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "feed":
      return <Milk className="h-5 w-5" />;
    case "diaper":
      return <Droplet className="h-5 w-5" />;
    case "nap":
      return <Moon className="h-5 w-5" />;
    case "note":
      return <StickyNote className="h-5 w-5" />;
    case "solids":
      return <Utensils className="h-5 w-5" />;
    case "photo":
      return <Camera className="h-5 w-5" />;
    default:
      return <Clock className="h-5 w-5" />;
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

export const ActivityCard = ({ activity, babyName = "Baby", onEdit, onDelete }: ActivityCardProps) => {
  const { t } = useLanguage();
  const { value, descriptor } = getActivityValueAndDescriptor(activity, t);

  const handleClick = () => {
    if (onEdit) {
      onEdit(activity);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full text-left group"
    >
      <div className="flex items-center justify-between py-3 px-4 hover:bg-accent/5 active:bg-accent/10 transition-colors border-b border-border last:border-b-0">
        {/* Left side: Icon + Content */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/30 flex items-center justify-center text-primary">
            {getActivityIcon(activity.type)}
          </div>
          
          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-semibold text-foreground">
                {value}
              </span>
              {descriptor && (
                <span className="text-sm text-muted-foreground truncate">
                  {descriptor}
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Right side: Time + Chevron */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground tabular-nums">
            {activity.type === 'nap' && activity.details.startTime && !activity.details.endTime
              ? activity.details.startTime
              : activity.time
            }
          </span>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
        </div>
      </div>
    </button>
  );
};
