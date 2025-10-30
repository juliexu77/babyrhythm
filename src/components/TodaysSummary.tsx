import { Activity } from "./ActivityCard";
import { Baby, Moon, Palette, StickyNote, Calendar, ChevronDown } from "lucide-react";
import { normalizeVolume } from "@/utils/unitConversion";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { ActivityDetailModal } from "./ActivityDetailModal";
import { getActivitiesByDate } from "@/utils/activityDateFilters";

interface TodaysSummaryProps {
  activities: Activity[];
}

export const TodaysSummary = ({ activities }: TodaysSummaryProps) => {
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const handleCardClick = (activityType: string) => {
    // Find the most recent activity of this type to show details
    const recentActivity = activities.find(activity => activity.type === activityType);
    if (recentActivity) {
      setSelectedActivity(recentActivity);
      setIsDetailModalOpen(true);
    }
  };
  // Get all unique dates from activities (in real app would come from database)
  const getAvailableDates = () => {
    const today = new Date();
    const dates = [];
    
    // For demo, create last 7 days worth of dates
    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push({
        date: date,
        dateStr: date.toISOString().split('T')[0],
        label: i === 0 ? "Today" : i === 1 ? "Yesterday" : date.toLocaleDateString("en-US", { 
          weekday: "short", 
          month: "short", 
          day: "numeric" 
        })
      });
    }
    
    return dates;
  };

  const [selectedDate, setSelectedDate] = useState(getAvailableDates()[0]);
  const availableDates = getAvailableDates();

  // Filter activities for selected date using shared utility
  const dayActivities = getActivitiesByDate(activities, selectedDate.date);

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

    dayActivities.forEach(activity => {
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

// Real nap duration calculation in hours
let totalNapMinutes = 0;
dayActivities.forEach(act => {
  if (act.type === "nap" && act.details?.startTime && act.details?.endTime) {
    const start = timeToMinutes(act.details.startTime);
    const end = timeToMinutes(act.details.endTime);
    let diff = end - start;
    if (diff < 0) diff += 24 * 60;
    totalNapMinutes += diff;
  }
});
stats.totalNapDuration = Math.round((totalNapMinutes / 60) * 10) / 10;

    return stats;
  };

  const stats = calculateStats();

  const StatCard = ({ icon: Icon, label, value, color, activityType }: { 
    icon: any, 
    label: string, 
    value: string | number, 
    color: string,
    activityType: string
  }) => (
    <div 
      className="bg-card rounded-lg p-4 border border-border cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => handleCardClick(activityType)}
    >
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

  if (dayActivities.length === 0) {
    return (
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <div className="flex justify-end mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {selectedDate.label}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
              {availableDates.map((date) => (
                <DropdownMenuItem 
                  key={date.dateStr}
                  onClick={() => setSelectedDate(date)}
                  className={selectedDate.dateStr === date.dateStr ? "bg-accent" : ""}
                >
                  {date.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">No data available for {selectedDate.label.toLowerCase()}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <div className="flex justify-end mb-6">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                {selectedDate.label}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-popover border border-border z-50">
              {availableDates.map((date) => (
                <DropdownMenuItem 
                  key={date.dateStr}
                  onClick={() => setSelectedDate(date)}
                  className={selectedDate.dateStr === date.dateStr ? "bg-accent" : ""}
                >
                  {date.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <StatCard 
            icon={Baby}
            label="Feeds"
            value={stats.feeds}
            color="bg-pink-50 text-pink-600"
            activityType="feed"
          />
          <StatCard 
            icon={Moon}
            label="Naps"
            value={stats.naps}
            color="bg-blue-50 text-blue-600"
            activityType="nap"
          />
          <StatCard 
            icon={Palette}
            label="Diapers"
            value={stats.diapers}
            color="bg-amber-50 text-amber-600"
            activityType="diaper"
          />
          <StatCard 
            icon={StickyNote}
            label="Notes"
            value={stats.notes}
            color="bg-green-50 text-green-600"
            activityType="note"
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
      
      <ActivityDetailModal 
        activity={selectedActivity}
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false);
          setSelectedActivity(null);
        }}
      />
    </div>
  );
};