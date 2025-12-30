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
      <div className="bg-gradient-to-br from-[hsl(18,40%,92%)] to-[hsl(15,38%,88%)]/50 dark:from-card dark:to-card rounded-xl p-6 border border-[hsl(15,35%,80%)]/30 dark:border-border/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-feed flex items-center justify-center">
            <Baby className="w-5 h-5 text-[hsl(30,50%,97%)]" />
          </div>
          <div className="text-sm font-medium text-[hsl(12,40%,40%)] dark:text-foreground/70 uppercase tracking-wide">
            Total Feeds
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-num font-semibold text-[hsl(12,35%,30%)] dark:font-bold dark:text-primary">
            {feedActivities.length}
          </div>
          <div className="text-sm text-[hsl(15,30%,45%)] dark:text-muted-foreground font-medium">
            {totalOunces.toFixed(1)} oz total
          </div>
        </div>
      </div>

      {/* Total Naps Card */}
      <div className="bg-gradient-to-br from-[hsl(22,38%,91%)] to-[hsl(20,35%,87%)]/50 dark:from-card dark:to-card rounded-xl p-6 border border-[hsl(20,32%,80%)]/30 dark:border-border/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-nap flex items-center justify-center">
            <Clock className="w-5 h-5 text-[hsl(30,50%,97%)]" />
          </div>
          <div className="text-sm font-medium text-[hsl(18,35%,42%)] dark:text-foreground/70 uppercase tracking-wide">
            Total Naps
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-num font-semibold text-[hsl(18,30%,30%)] dark:font-bold dark:text-primary">
            {napActivities.length}
          </div>
          <div className="text-sm text-primary font-medium">
            {formatNapTime(totalNapTime)}
          </div>
        </div>
      </div>
    </div>
  );
};