import { Clock, Baby, Palette, Moon, StickyNote } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface Activity {
  id: string;
  type: "feed" | "diaper" | "nap" | "note";
  time: string;
  details: {
    quantity?: string;
    diaperType?: "pee" | "poop" | "both";
    startTime?: string;
    endTime?: string;
    note?: string;
  };
}

interface ActivityCardProps {
  activity: Activity;
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case "feed":
      return <Baby className="h-5 w-5" />;
    case "diaper":
      return <Palette className="h-5 w-5" />;
    case "nap":
      return <Moon className="h-5 w-5" />;
    case "note":
      return <StickyNote className="h-5 w-5" />;
    default:
      return <Clock className="h-5 w-5" />;
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

const getActivityDetails = (activity: Activity) => {
  switch (activity.type) {
    case "feed":
      return activity.details.quantity ? `${activity.details.quantity} oz` : "";
    case "diaper":
      return activity.details.diaperType ? 
        activity.details.diaperType.charAt(0).toUpperCase() + activity.details.diaperType.slice(1) : "";
    case "nap":
      return activity.details.startTime && activity.details.endTime 
        ? `${activity.details.startTime} - ${activity.details.endTime}` : "";
    case "note":
      return activity.details.note || "";
    default:
      return "";
  }
};

export const ActivityCard = ({ activity }: ActivityCardProps) => {
  return (
    <div className="relative flex items-start gap-4 pb-8 last:pb-0">
      {/* Timeline line */}
      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-border last:hidden"></div>
      
      {/* Timeline marker */}
      <div className={`relative z-10 flex-shrink-0 w-12 h-12 rounded-full ${getActivityGradient(activity.type)} flex items-center justify-center text-white shadow-soft`}>
        {getActivityIcon(activity.type)}
      </div>
      
      {/* Content */}
      <div className="flex-1 min-w-0 pt-2">
        <div className="bg-card rounded-lg p-4 shadow-card border border-border">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium capitalize text-foreground">
              {activity.type}
            </h3>
            <span className="text-sm text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {activity.time}
            </span>
          </div>
          {getActivityDetails(activity) && (
            <p className="text-sm text-muted-foreground">
              {getActivityDetails(activity)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};