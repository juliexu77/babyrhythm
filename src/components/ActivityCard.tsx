import { Clock, Baby, Droplet, Moon, StickyNote, Ruler, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Activity {
  id: string;
  type: "feed" | "diaper" | "nap" | "note" | "measure" | "photo";
  time: string;
  loggedAt?: string; // The original logged timestamp
  timezone?: string; // IANA timezone name where activity was logged
  details: {
    // Feed details
    feedType?: "bottle" | "nursing" | "solid";
    quantity?: string;
    unit?: "oz" | "ml";
    minutesLeft?: string;
    minutesRight?: string;
    solidDescription?: string;
    isDreamFeed?: boolean;
    // Diaper details
    diaperType?: "wet" | "poopy" | "both";
    hasLeak?: boolean;
    hasCream?: boolean;
    // Nap details
    startTime?: string;
    endTime?: string;
    isNightSleep?: boolean;
    // Measure details
    weightLbs?: string;
    weightOz?: string;
    heightInches?: string;
    headCircumference?: string;
    // Photo details
    photoUrl?: string;
    // General
    note?: string;
    displayTime?: string; // Store the original selected time for consistent display
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
      return <Droplet className="h-4 w-4" />;
    case "nap":
      return <Moon className="h-4 w-4" />;
    case "note":
      return <StickyNote className="h-4 w-4" />;
    case "measure":
      return <Ruler className="h-4 w-4" />;
    case "photo":
      return <Camera className="h-4 w-4" />;
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
    case "measure":
      return "bg-gradient-primary";
    case "photo":
      return "bg-gradient-primary";
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

const getPersonalizedActivityText = (activity: Activity, babyName: string = "Baby", t: (key: string) => string) => {
  switch (activity.type) {
    case "feed":
      const { feedType, quantity, unit, minutesLeft, minutesRight, solidDescription, isDreamFeed } = activity.details;
      let feedText = "";
      
      if (feedType === "bottle" && quantity && unit) {
        feedText = `${babyName} ${t('drank')} ${quantity} ${unit}`;
      } else if (feedType === "nursing") {
        const leftTime = minutesLeft ? parseInt(minutesLeft) : 0;
        const rightTime = minutesRight ? parseInt(minutesRight) : 0;
        const totalTime = leftTime + rightTime;
        
        if (totalTime > 0) {
          feedText = `${babyName} ${t('nursed')} ${totalTime} ${t('minTotal')}`;
        } else {
          feedText = `${babyName} ${t('nursed')}`;
        }
      } else if (feedType === "solid") {
        if (solidDescription) {
          feedText = `${babyName} ${t('ate')} ${solidDescription}`;
        } else {
          feedText = `${babyName} ${t('hadSolids')}`;
        }
      } else {
        feedText = `${babyName} ${t('hadAFeeding')}`;
      }
      
      // Add dream feed indicator
      return isDreamFeed ? `${feedText} (${t('dreamFeed')})` : feedText;
    case "diaper":
      const type = activity.details.diaperType;
      if (type === "wet") {
        return `${babyName} ${t('hadAWetDiaper')}`;
      } else if (type === "poopy") {
        return `${babyName} ${t('hadAPoopDiaper')}`;
      } else if (type === "both") {
        return `${babyName} ${t('hadAWetAndPoopDiaper')}`;
      }
      return `${babyName} ${t('hadADiaperChange')}`;
    case "nap":
      if (activity.details.startTime && activity.details.endTime) {
        const duration = calculateNapDuration(activity.details.startTime, activity.details.endTime);
        return `${babyName} ${t('slept')} ${duration}`;
      } else if (activity.details.startTime && !activity.details.endTime) {
        return `${babyName} ${t('isSleeping')} (${t('startedAt')} ${activity.details.startTime})`;
      }
      return `${babyName} ${t('tookANap')}`;
    case "note":
      return activity.details.note || `${babyName} ${t('note')}`;
    case "measure":
      const measurements = [];
      if (activity.details.weightLbs || activity.details.weightOz) {
        measurements.push(`${activity.details.weightLbs || 0}lb ${activity.details.weightOz || 0}oz`);
      }
      if (activity.details.heightInches) {
        measurements.push(`${activity.details.heightInches}" ${t('tall')}`);
      }
      if (activity.details.headCircumference) {
        measurements.push(`${activity.details.headCircumference}" ${t('head')}`);
      }
      return measurements.length > 0 
        ? `${babyName} ${t('measured')}: ${measurements.join(", ")}`
        : `${babyName} ${t('measurementsTaken')}`;
    case "photo":
      return activity.details.note || `${babyName} ${t('photo')}`;
    default:
      return `${babyName} ${t('activity')}`;
  }
};

export const ActivityCard = ({ activity, babyName = "Baby", onEdit, onDelete }: ActivityCardProps) => {
  const { t } = useLanguage();
  const activityText = getPersonalizedActivityText(activity, babyName, t);

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
    <div className="relative flex items-center gap-2 py-0.5 group hover:bg-accent/30 rounded-md px-2 transition-colors">
      {/* Timeline line */}
      <div className="absolute left-2 top-4 bottom-0 w-0.5 bg-border group-last:hidden"></div>
      
      {/* Timeline marker */}
      <div className={`relative z-10 flex-shrink-0 w-5 h-5 rounded-full ${getActivityGradient(activity.type)} flex items-center justify-center text-white`}>
        {getActivityIcon(activity.type)}
      </div>
      
      {/* Content - clickable with wrapping text */}
      <div className="flex-1 flex items-start justify-between min-w-0 gap-2">
        <button
          onClick={handleClick}
          className="flex-1 text-left min-w-0"
        >
          <p className="text-sm text-foreground font-medium break-words hover:text-primary transition-colors">
            {activityText}
          </p>
        </button>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {activity.type === 'nap' && activity.details.startTime && !activity.details.endTime
              ? activity.details.startTime  // Show just start time for ongoing naps
              : activity.time  // Show full time or time range for completed activities
            }
          </span>
        </div>
      </div>
    </div>
  );
};