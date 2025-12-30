import { Activity } from "./ActivityCard";
import { Baby, Moon, Droplets } from "lucide-react";

interface SummaryCardsProps {
  activities: Activity[];
}

export const SummaryCards = ({ activities }: SummaryCardsProps) => {
  const feedActivities = activities.filter(a => a.type === "feed");
  const napActivities = activities.filter(a => a.type === "nap");
  const diaperActivities = activities.filter(a => a.type === "diaper");
  
  const totalOunces = feedActivities.reduce((sum, feed) => {
    const quantity = parseFloat(feed.details.quantity || "0");
    return sum + quantity;
  }, 0);

  const totalNapTime = napActivities.reduce((sum, nap) => {
    if (nap.details.startTime && nap.details.endTime) {
      const start = new Date(`2000/01/01 ${nap.details.startTime}`);
      const end = new Date(`2000/01/01 ${nap.details.endTime}`);
      const diff = end.getTime() - start.getTime();
      return sum + diff;
    }
    return sum;
  }, 0);

  const formatNapTime = (milliseconds: number) => {
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="grid grid-cols-3 gap-3 mb-6">
      {/* Feeds Card */}
      <div className="bg-card rounded-strava p-4 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-feed flex items-center justify-center">
            <Baby className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
        <div className="text-2xl font-num font-bold text-foreground tracking-tight">
          {feedActivities.length}
        </div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-strava">
          Feeds
        </div>
        {totalOunces > 0 && (
          <div className="text-xs text-primary font-medium mt-1">
            {totalOunces.toFixed(1)} oz
          </div>
        )}
      </div>

      {/* Naps Card */}
      <div className="bg-card rounded-strava p-4 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-nap flex items-center justify-center">
            <Moon className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
        <div className="text-2xl font-num font-bold text-foreground tracking-tight">
          {napActivities.length}
        </div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-strava">
          Naps
        </div>
        {totalNapTime > 0 && (
          <div className="text-xs text-primary font-medium mt-1">
            {formatNapTime(totalNapTime)}
          </div>
        )}
      </div>

      {/* Diapers Card */}
      <div className="bg-card rounded-strava p-4 border border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-gradient-diaper flex items-center justify-center">
            <Droplets className="w-4 h-4 text-primary-foreground" />
          </div>
        </div>
        <div className="text-2xl font-num font-bold text-foreground tracking-tight">
          {diaperActivities.length}
        </div>
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-strava">
          Diapers
        </div>
      </div>
    </div>
  );
};