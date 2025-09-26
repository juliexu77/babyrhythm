import { Activity } from "./ActivityCard";
import { Calendar, Download, Share2, Baby, Clock, Moon, StickyNote } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DailySummaryProps {
  activities: Activity[];
  date: string;
}

export const DailySummary = ({ activities, date }: DailySummaryProps) => {
  const feedActivities = activities.filter(a => a.type === "feed");
  const napActivities = activities.filter(a => a.type === "nap");
  const diaperActivities = activities.filter(a => a.type === "diaper");
  const noteActivities = activities.filter(a => a.type === "note");

  const totalOunces = feedActivities.reduce((sum, feed) => {
    const quantity = parseFloat(feed.details.quantity || "0");
    return sum + quantity;
  }, 0);

  const handleScreenshot = () => {
    // In a real app, you could use html2canvas or similar
    alert("Screenshot functionality - would capture this summary");
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: `Baby's Daily Summary - ${date}`,
        text: `Today: ${feedActivities.length} feeds (${totalOunces}oz), ${napActivities.length} naps, ${diaperActivities.length} diapers`,
      });
    } else {
      // Fallback for browsers without Web Share API
      navigator.clipboard.writeText(
        `Baby's Daily Summary - ${date}\nFeeds: ${feedActivities.length} (${totalOunces}oz)\nNaps: ${napActivities.length}\nDiapers: ${diaperActivities.length}`
      );
    }
  };

  return (
    <div className="bg-gradient-to-br from-background to-secondary/30 rounded-xl p-6 border border-border shadow-card">
      <div className="flex gap-2 mb-6">
        <Button
          variant="outline"
          size="sm"
          onClick={handleShare}
          className="p-2"
        >
          <Share2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={handleScreenshot}
          className="p-2"
        >
          <Download className="w-4 h-4" />
        </Button>
      </div>

      {/* Summary Grid */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Feeds */}
        <div className="bg-white/50 rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Baby className="w-4 h-4 text-rose-600" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Feeds
            </span>
          </div>
          <div className="text-2xl font-serif font-semibold text-foreground">
            {feedActivities.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {totalOunces.toFixed(1)} oz total
          </div>
        </div>

        {/* Naps */}
        <div className="bg-white/50 rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Naps
            </span>
          </div>
          <div className="text-2xl font-serif font-semibold text-foreground">
            {napActivities.length}
          </div>
          <div className="text-sm text-muted-foreground">
            {napActivities.length > 0 ? "Great sleep!" : "No naps yet"}
          </div>
        </div>

        {/* Diapers */}
        <div className="bg-white/50 rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Diapers
            </span>
          </div>
          <div className="text-2xl font-serif font-semibold text-foreground">
            {diaperActivities.length}
          </div>
          <div className="text-sm text-muted-foreground">
            Changes today
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white/50 rounded-lg p-4 border border-white/20">
          <div className="flex items-center gap-2 mb-2">
            <StickyNote className="w-4 h-4 text-purple-600" />
            <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Notes
            </span>
          </div>
          <div className="text-2xl font-serif font-semibold text-foreground">
            {noteActivities.length}
          </div>
          <div className="text-sm text-muted-foreground">
            Observations
          </div>
        </div>
      </div>

      {/* Insights */}
      <div className="bg-white/30 rounded-lg p-4 border border-white/20">
        <h3 className="text-sm font-semibold text-foreground mb-2">Today's Insights</h3>
        <div className="space-y-1 text-sm text-muted-foreground">
          {feedActivities.length >= 6 && (
            <p>• Feeding schedule looks great - {feedActivities.length} feeds today</p>
          )}
          {napActivities.length >= 3 && (
            <p>• Excellent nap routine with {napActivities.length} naps</p>
          )}
          {activities.length === 0 && (
            <p>• Start logging activities to see personalized insights</p>
          )}
        </div>
      </div>
    </div>
  );
};