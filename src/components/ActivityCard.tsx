import { Clock, Milk, Droplet, Moon, StickyNote, Utensils, Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

export interface Activity {
  id: string;
  type: "feed" | "diaper" | "nap" | "note" | "solids" | "photo";
  time: string;
  loggedAt?: string; // The original logged timestamp
  timezone?: string; // IANA timezone name where activity was logged
  details: {
    // Feed details
    feedType?: "bottle" | "nursing";
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
    // Photo details
    photoUrl?: string;
    // Solids details
    allergens?: string[];
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

// Color tinting for icons based on type - Warm clay-brown family (no clinical mauve)
const getIconColorClass = (type: string) => {
  switch (type) {
    case "nap":
      return "text-[hsl(18,35%,48%)] dark:text-[hsl(18,40%,65%)]"; // Warm clay for sleep
    case "feed":
      return "text-[hsl(12,42%,50%)] dark:text-[hsl(12,45%,62%)]"; // Cinnamon-rose for feeding
    case "diaper":
      return "text-[hsl(22,30%,48%)] dark:text-[hsl(22,35%,62%)]"; // Warm taupe for diaper
    case "solids":
      return "text-[hsl(20,45%,52%)] dark:text-[hsl(20,48%,62%)]"; // Terracotta for solids
    case "note":
      return "text-[hsl(18,22%,48%)] dark:text-[hsl(18,25%,62%)]"; // Clay brown
    case "photo":
      return "text-[hsl(15,32%,50%)] dark:text-[hsl(15,35%,62%)]"; // Dusty clay
    default:
      return "text-muted-foreground";
  }
};

// Background circles for icons - Warm clay-beige tints (archival feel)
const getIconBackgroundClass = (type: string) => {
  switch (type) {
    case "nap":
      return "bg-[hsl(18,32%,90%)] dark:bg-[hsl(18,25%,18%)]"; // Warm clay tint
    case "feed":
      return "bg-[hsl(12,38%,91%)] dark:bg-[hsl(12,30%,18%)]"; // Cinnamon tint
    case "diaper":
      return "bg-[hsl(22,28%,90%)] dark:bg-[hsl(22,22%,18%)]"; // Taupe tint
    case "solids":
      return "bg-[hsl(20,40%,91%)] dark:bg-[hsl(20,32%,18%)]"; // Terracotta tint
    case "note":
      return "bg-[hsl(18,20%,90%)] dark:bg-[hsl(18,15%,18%)]"; // Clay tint
    case "photo":
      return "bg-[hsl(15,28%,91%)] dark:bg-[hsl(15,22%,18%)]"; // Dusty clay tint
    default:
      return "bg-muted/50";
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
      return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
    }
    
    return `${durationMinutes}m`;
  } catch (error) {
    return 'unknown duration';
  }
};

// New: Get value (bold) and descriptor (lighter) for smart text formatting
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
      let solidsDescriptor = activity.details.solidDescription || "Solids";
      
      if (allergensArray.length > 0) {
        const allergenLabels = allergensArray.map((id: string) => {
          const allergenMap: Record<string, string> = {
            'peanut': 'Peanut',
            'egg': 'Egg',
            'dairy': 'Dairy',
            'wheat': 'Wheat',
            'soy': 'Soy',
            'tree-nuts': 'Tree nuts',
            'sesame': 'Sesame',
            'fish': 'Fish',
            'shellfish': 'Shellfish',
          };
          return allergenMap[id] || id;
        }).join(', ');
        solidsDescriptor += ` • ${allergenLabels}`;
      }
      
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

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the edit click
    if (onDelete) {
      onDelete(activity.id);
    }
  };

  return (
    <div className="relative flex items-center py-px group transition-colors">
      {/* Icon - warm clay stroke color, uses foreground for dark/dusk */}
      <div className="relative z-10 flex-shrink-0 w-6 h-6 flex items-center justify-center text-[hsl(18,28%,52%)] dark:text-foreground/70 dusk:text-foreground/70" style={{ marginLeft: '8px' }}>
        {getActivityIcon(activity.type)}
      </div>
      
      {/* Content - clickable with smart text formatting, positioned to the right of icon */}
      <div className="flex-1 flex items-center justify-between min-w-0 gap-3 pl-4">
        <button
          onClick={handleClick}
          className="flex-1 text-left min-w-0 flex items-baseline gap-2 hover:opacity-80 transition-opacity"
        >
          {/* Value - Semibold serif, uses foreground for dark/dusk */}
          <span className="text-sm font-serif font-semibold text-[hsl(18,26%,35%)] dark:text-foreground dusk:text-foreground">
            {value}
          </span>
          {/* Descriptor - Lighter sans-serif, uses muted-foreground for dark/dusk */}
          {descriptor && (
            <span className="text-sm font-light truncate text-[hsl(20,18%,52%)] dark:text-muted-foreground dusk:text-muted-foreground">
              {descriptor}
            </span>
          )}
        </button>
        
        {/* Timestamp - uses muted-foreground for dark/dusk */}
        <span className="text-xs font-light whitespace-nowrap tabular-nums text-[hsl(20,18%,55%)] dark:text-muted-foreground dusk:text-muted-foreground">
          {activity.type === 'nap' && activity.details.startTime && !activity.details.endTime
            ? activity.details.startTime  // Show just start time for ongoing naps
            : activity.time  // Show full time or time range for completed activities
          }
        </span>
      </div>
    </div>
  );
};
