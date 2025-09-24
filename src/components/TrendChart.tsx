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

  return (
    <div className="bg-card rounded-xl p-6 shadow-card border border-border mb-6">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-muted-foreground" />
        <h3 className="text-lg font-serif font-medium text-foreground">
          Weekly Trends
        </h3>
      </div>
      
      <div className="space-y-4">
        {/* Legend */}
        <div className="flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-feed"></div>
            <span className="text-muted-foreground">Feeds</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-nap"></div>
            <span className="text-muted-foreground">Naps</span>
          </div>
        </div>

        {/* Simple bar chart */}
        <div className="grid grid-cols-7 gap-2 h-32">
          {trendData.map((day, index) => (
            <div key={index} className="flex flex-col items-center gap-1">
              <div className="flex-1 flex flex-col justify-end gap-1 w-full">
                {/* Feeds bar */}
                <div 
                  className="bg-gradient-feed rounded-t opacity-80 w-1/2 mx-auto"
                  style={{ height: `${(day.feeds / maxValue) * 100}%` }}
                ></div>
                {/* Naps bar */}
                <div 
                  className="bg-gradient-nap rounded-t opacity-80 w-1/2 mx-auto"
                  style={{ height: `${(day.naps / maxValue) * 100}%` }}
                ></div>
              </div>
              <div className="text-xs text-muted-foreground font-medium">
                {day.date}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};