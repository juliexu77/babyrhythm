import { Activity } from "./ActivityCard";
import { useState } from "react";
import { useSleepData } from "@/hooks/useSleepData";
import { SleepChartVisualization } from "./sleep/SleepChartVisualization";
import { SleepStats } from "./sleep/SleepStats";
import { SleepChartControls } from "./sleep/SleepChartControls";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";

interface SleepChartProps {
  activities: Activity[];
}

export const SleepChart = ({ activities }: SleepChartProps) => {
  const { t } = useLanguage();
  const [showFullDay, setShowFullDay] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  
  const { sleepData, averageDailySummary } = useSleepData(activities, showFullDay, currentWeekOffset);

  return (
    <div className="space-y-6">
      {/* Sleep Chart */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Weekly Sleep Schedule</h3>
          <div className="flex items-center gap-2">
            <div className="flex bg-muted/30 rounded-lg p-1">
              <Button
                variant={currentWeekOffset === 0 ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentWeekOffset(0)}
                className="h-8 px-3 rounded-md"
              >
                This Week
              </Button>
              <Button
                variant={currentWeekOffset === 1 ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentWeekOffset(1)}
                className="h-8 px-3 rounded-md"
              >
                Last Week
              </Button>
            </div>
          </div>
        </div>
        
        <div className="mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullDay(!showFullDay)}
            className="text-muted-foreground text-caption hover:text-foreground"
          >
            {showFullDay ? "Show condensed (6am-9pm)" : "Show full day (12am-12am)"}
          </Button>
        </div>
        
        <SleepChartVisualization 
          sleepData={sleepData}
          showFullDay={showFullDay}
        />
      </div>
    </div>
  );
};