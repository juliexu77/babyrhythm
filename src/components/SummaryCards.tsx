import { Activity } from "./ActivityCard";
import { Baby, Clock } from "lucide-react";

interface SummaryCardsProps {
  activities: Activity[];
}

export const SummaryCards = ({ activities }: SummaryCardsProps) => {
  const feedActivities = activities.filter(a => a.type === "feed");
  const napActivities = activities.filter(a => a.type === "nap");
  
  const totalOunces = feedActivities.reduce((sum, feed) => {
    const quantity = parseFloat(feed.details.quantity || "0");
    return sum + quantity;
  }, 0);

  const totalNapTime = napActivities.reduce((sum, nap) => {
    if (nap.details.startTime && nap.details.endTime) {
      // Simple calculation - assumes same day
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
    <div className="grid grid-cols-2 gap-4 mb-8">
      {/* Total Feeds Card */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Baby className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-foreground">Total Feeds</h3>
        </div>
        <div className="space-y-2">
          <div className="text-3xl font-serif font-semibold text-foreground">
            {feedActivities.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {totalOunces.toFixed(1)} oz total
          </div>
        </div>
      </div>

      {/* Total Naps Card */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-primary" />
          <h3 className="font-medium text-foreground">Total Naps</h3>
        </div>
        <div className="space-y-2">
          <div className="text-3xl font-serif font-semibold text-foreground">
            {napActivities.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {formatNapTime(totalNapTime)}
          </div>
        </div>
      </div>
    </div>
  );
};