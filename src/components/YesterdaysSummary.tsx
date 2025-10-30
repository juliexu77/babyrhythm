import { Activity } from "./ActivityCard";
import { Baby, Moon, Palette, StickyNote, TrendingDown } from "lucide-react";
import { normalizeVolume } from "@/utils/unitConversion";
import { getYesterdayActivities } from "@/utils/activityDateFilters";

interface YesterdaysSummaryProps {
  activities: Activity[];
}

export const YesterdaysSummary = ({ activities }: YesterdaysSummaryProps) => {
  // Filter activities by yesterday's date using shared utility
  const yesterdayActivities = getYesterdayActivities(activities);

  const getYesterdaysDate = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toLocaleDateString("en-US", { 
      weekday: "long", 
      month: "long", 
      day: "numeric" 
    });
  };

  const calculateStats = () => {
    const stats = {
      feeds: 0,
      naps: 0,
      diapers: 0,
      notes: 0,
      totalFeedVolume: 0,
      totalNapDuration: 0,
      firstFeed: "",
      lastActivity: ""
    };

    let feedTimes: string[] = [];
    let allActivityTimes: string[] = [];
    let totalVolume = 0;

    // Helper function to convert time string to minutes for proper sorting
    const timeToMinutes = (timeStr: string) => {
      const [time, period] = timeStr.split(' ');
      const [hours, minutes] = time.split(':').map(Number);
      let totalMinutes = (hours % 12) * 60 + minutes;
      if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
      if (period === 'AM' && hours === 12) totalMinutes = minutes;
      return totalMinutes;
    };

    yesterdayActivities.forEach(activity => {
      allActivityTimes.push(activity.time);
      
      switch (activity.type) {
        case "feed":
          stats.feeds++;
          feedTimes.push(activity.time);
          if (activity.details?.quantity) {
            const normalized = normalizeVolume(activity.details.quantity);
            totalVolume += normalized.value;
          }
          break;
        case "nap":
          stats.naps++;
          break;
        case "diaper":
          stats.diapers++;
          break;
        case "note":
          stats.notes++;
          break;
      }
    });

    stats.totalFeedVolume = Math.round(totalVolume * 10) / 10;
    
    // Sort times properly and get first feed and last activity
    if (feedTimes.length > 0) {
      feedTimes.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
      stats.firstFeed = feedTimes[0];
    }
    
    if (allActivityTimes.length > 0) {
      allActivityTimes.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
      stats.lastActivity = allActivityTimes[allActivityTimes.length - 1];
    }

    // Mock nap duration calculation
    stats.totalNapDuration = stats.naps * 1.5; // Average 1.5 hours per nap

    return stats;
  };

  const stats = calculateStats();

  const StatCard = ({ icon: Icon, label, value, color }: { 
    icon: any, 
    label: string, 
    value: string | number, 
    color: string 
  }) => (
    <div className="bg-card rounded-lg p-4 border border-border">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <p className="text-2xl font-bold text-foreground">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );

  if (yesterdayActivities.length === 0) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <div className="text-center py-8">
          <p className="text-muted-foreground">No data available for yesterday</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard 
            icon={Baby}
            label="Feeds"
            value={stats.feeds}
            color="bg-pink-50 text-pink-600"
          />
          <StatCard 
            icon={Moon}
            label="Naps"
            value={stats.naps}
            color="bg-blue-50 text-blue-600"
          />
          <StatCard 
            icon={Palette}
            label="Diapers"
            value={stats.diapers}
            color="bg-amber-50 text-amber-600"
          />
          <StatCard 
            icon={StickyNote}
            label="Notes"
            value={stats.notes}
            color="bg-green-50 text-green-600"
          />
        </div>

        {stats.totalFeedVolume > 0 && (
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
              <span className="text-sm text-muted-foreground">Total Feed Volume</span>
              <span className="font-medium text-foreground">{stats.totalFeedVolume} oz</span>
            </div>
            
            {stats.totalNapDuration > 0 && (
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Total Nap Time</span>
                <span className="font-medium text-foreground">{stats.totalNapDuration}h</span>
              </div>
            )}

            {stats.firstFeed && (
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">First Feed</span>
                <span className="font-medium text-foreground">{stats.firstFeed}</span>
              </div>
            )}

            {stats.lastActivity && (
              <div className="flex justify-between items-center p-3 bg-muted/30 rounded-lg">
                <span className="text-sm text-muted-foreground">Last Activity</span>
                <span className="font-medium text-foreground">{stats.lastActivity}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};