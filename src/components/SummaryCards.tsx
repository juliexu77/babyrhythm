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
      <div className="bg-gradient-to-br from-rose-50 to-rose-100/50 rounded-xl p-6 border border-rose-200/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-feed flex items-center justify-center">
            <Baby className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm font-medium text-rose-700 uppercase tracking-wide">
            Total Feeds
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-serif font-semibold text-rose-900">
            {feedActivities.length}
          </div>
          <div className="text-sm text-rose-600 font-medium">
            {totalOunces.toFixed(1)} oz total
          </div>
        </div>
      </div>

      {/* Total Naps Card */}
      <div className="bg-gradient-to-br from-blue-50 to-blue-100/50 rounded-xl p-6 border border-blue-200/30">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-full bg-gradient-nap flex items-center justify-center">
            <Clock className="w-5 h-5 text-white" />
          </div>
          <div className="text-sm font-medium text-blue-700 uppercase tracking-wide">
            Total Naps
          </div>
        </div>
        <div className="space-y-1">
          <div className="text-3xl font-serif font-semibold text-blue-900">
            {napActivities.length}
          </div>
          <div className="text-sm text-blue-600 font-medium">
            {formatNapTime(totalNapTime)}
          </div>
        </div>
      </div>
    </div>
  );
};