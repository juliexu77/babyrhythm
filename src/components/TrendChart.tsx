import { Activity } from "./ActivityCard";
import { TrendingUp } from "lucide-react";
import { normalizeVolume } from "@/utils/unitConversion";
import { useState } from "react";

interface TrendChartProps {
  activities: Activity[];
}

export const TrendChart = ({ activities }: TrendChartProps) => {
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);

  // Determine preferred unit from last feed entry
  const getPreferredUnit = () => {
    const feedActivities = activities.filter(a => a.type === "feed" && a.details?.quantity);
    if (feedActivities.length === 0) return "oz";
    
    const lastFeed = feedActivities[feedActivities.length - 1];
    const quantity = parseFloat(lastFeed.details.quantity || "0");
    
    // If quantity > 50, assume it's ml, otherwise oz
    return quantity > 50 ? "ml" : "oz";
  };

  const preferredUnit = getPreferredUnit();

  // Calculate real feed volume data for the past 7 days
  const generateFeedData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Filter activities for this specific date
      const dayFeeds = activities.filter(a => {
        if (a.type !== "feed") return false;
        const activityDate = new Date().toISOString().split('T')[0]; // All current activities are today
        return dateStr === activityDate; // Only show data for today, empty for other days
      });
      
      let totalValue = 0;
      
      dayFeeds.forEach(feed => {
        if (!feed.details.quantity) return;
        const quantity = parseFloat(feed.details.quantity);
        
        if (preferredUnit === "ml") {
          // If user prefers ml, convert oz to ml when needed
          const detectedUnit = quantity > 50 ? "ml" : "oz";
          if (detectedUnit === "oz") {
            totalValue += quantity * 29.5735; // Convert oz to ml
          } else {
            totalValue += quantity;
          }
        } else {
          // If user prefers oz, convert ml to oz when needed
          const normalized = normalizeVolume(quantity);
          totalValue += normalized.value;
        }
      });
      
      const value = Math.round(totalValue * 10) / 10;
      const feedCount = dayFeeds.length;
      const unit = preferredUnit;
      
      data.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        value,
        feedCount,
        unit,
        detail: value > 0 ? `${value} ${unit}, ${feedCount} feeds` : "No feeds"
      });
    }
    
    return data;
  };

  // Calculate real nap duration data for the past 7 days
  const generateNapData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Filter activities for this specific date
      const dayNaps = activities.filter(a => {
        if (a.type !== "nap") return false;
        const activityDate = new Date().toISOString().split('T')[0]; // All current activities are today
        return dateStr === activityDate; // Only show data for today, empty for other days
      });
      
      let totalHours = 0;
      dayNaps.forEach(nap => {
        if (nap.details.startTime && nap.details.endTime) {
          const start = new Date(`2000/01/01 ${nap.details.startTime}`);
          const end = new Date(`2000/01/01 ${nap.details.endTime}`);
          const diff = end.getTime() - start.getTime();
          if (diff > 0) totalHours += diff / (1000 * 60 * 60);
        }
      });
      
      const value = Math.round(totalHours * 10) / 10;
      const napCount = dayNaps.length;
      
      data.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        value,
        napCount,
        detail: value > 0 ? `${value}h, ${napCount} naps` : "No naps"
      });
    }
    
    return data;
  };

  const feedData = generateFeedData();
  const napData = generateNapData();
  const maxFeedValue = Math.max(...feedData.map(d => d.value));
  const maxNapValue = Math.max(...napData.map(d => d.value));

  return (
    <div className="space-y-6">
      {/* Feed Volume Chart */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-serif font-medium text-foreground">
            Daily Feed Volume ({preferredUnit})
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-feed"></div>
              <span className="text-muted-foreground">Total {preferredUnit}</span>
            </div>
          </div>

          {/* Feed volume chart */}
          <div className="grid grid-cols-7 gap-2 h-32">
            {feedData.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <div className="flex-1 flex flex-col justify-end w-full">
                  <button
                    className="bg-gradient-feed rounded-t opacity-80 w-3/4 mx-auto relative hover:opacity-100 transition-opacity cursor-pointer border-none p-0"
                    style={{ height: `${(day.value / maxFeedValue) * 100}%` }}
                    onClick={() => setSelectedDetail(selectedDetail === `feed-${index}` ? null : `feed-${index}`)}
                  >
                    <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground font-medium">
                      {day.value}
                    </span>
                  </button>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {day.date}
                </div>
                 {selectedDetail === `feed-${index}` && (
                   <div className="fixed z-50 bg-popover border border-border rounded-lg p-2 shadow-lg pointer-events-none"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}>
                     <p className="text-xs font-medium">{day.detail}</p>
                   </div>
                 )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Nap Duration Chart */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
          <h3 className="text-lg font-serif font-medium text-foreground">
            Daily Nap Duration
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-nap"></div>
              <span className="text-muted-foreground">Hours</span>
            </div>
          </div>

          {/* Nap duration chart */}
          <div className="grid grid-cols-7 gap-2 h-32">
            {napData.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-1 relative">
                <div className="flex-1 flex flex-col justify-end w-full">
                  <button
                    className="bg-gradient-nap rounded-t opacity-80 w-3/4 mx-auto relative hover:opacity-100 transition-opacity cursor-pointer border-none p-0"
                    style={{ height: `${(day.value / maxNapValue) * 100}%` }}
                    onClick={() => setSelectedDetail(selectedDetail === `nap-${index}` ? null : `nap-${index}`)}
                  >
                    <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground font-medium">
                      {day.value}h
                    </span>
                  </button>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {day.date}
                </div>
                 {selectedDetail === `nap-${index}` && (
                   <div className="fixed z-50 bg-popover border border-border rounded-lg p-2 shadow-lg pointer-events-none"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}>
                     <p className="text-xs font-medium">{day.detail}</p>
                   </div>
                 )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};