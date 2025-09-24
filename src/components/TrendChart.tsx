import { Activity } from "./ActivityCard";
import { TrendingUp } from "lucide-react";

interface TrendChartProps {
  activities: Activity[];
}

export const TrendChart = ({ activities }: TrendChartProps) => {
  // Generate sample trend data for the past 7 days
  const generateTrendData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Sample data - in real app this would be calculated from actual activities
      const feeds = Math.floor(Math.random() * 3) + 6; // 6-8 feeds
      const naps = Math.floor(Math.random() * 2) + 3; // 3-4 naps
      
      data.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        feeds,
        naps,
      });
    }
    
    return data;
  };

  const trendData = generateTrendData();
  const maxValue = Math.max(...trendData.map(d => Math.max(d.feeds, d.naps)));

  // Generate feed volume data (in oz)
  const generateFeedData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Sample data - total oz consumed per day
      const totalOz = Math.floor(Math.random() * 8) + 20; // 20-28 oz per day
      
      data.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        value: totalOz,
      });
    }
    
    return data;
  };

  // Generate nap duration data (in hours)
  const generateNapData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      
      // Sample data - total nap hours per day
      const napHours = Math.floor(Math.random() * 3) + 2; // 2-5 hours per day
      
      data.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        value: napHours,
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
            Daily Feed Volume
          </h3>
        </div>
        
        <div className="space-y-4">
          {/* Legend */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-feed"></div>
              <span className="text-muted-foreground">Total oz</span>
            </div>
          </div>

          {/* Feed volume chart */}
          <div className="grid grid-cols-7 gap-2 h-32">
            {feedData.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <div className="flex-1 flex flex-col justify-end w-full">
                  <div 
                    className="bg-gradient-feed rounded-t opacity-80 w-3/4 mx-auto relative"
                    style={{ height: `${(day.value / maxFeedValue) * 100}%` }}
                  >
                    <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground font-medium">
                      {day.value}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {day.date}
                </div>
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
              <div key={index} className="flex flex-col items-center gap-1">
                <div className="flex-1 flex flex-col justify-end w-full">
                  <div 
                    className="bg-gradient-nap rounded-t opacity-80 w-3/4 mx-auto relative"
                    style={{ height: `${(day.value / maxNapValue) * 100}%` }}
                  >
                    <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground font-medium">
                      {day.value}h
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {day.date}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};