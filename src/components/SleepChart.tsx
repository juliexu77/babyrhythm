import { Activity } from "./ActivityCard";
import { useState } from "react";
import { useSleepData } from "@/hooks/useSleepData";
import { SleepChartVisualization } from "./sleep/SleepChartVisualization";
import { SleepStats } from "./sleep/SleepStats";
import { SleepChartControls } from "./sleep/SleepChartControls";
import { useLanguage } from "@/contexts/LanguageContext";

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
        <h3 className="text-lg font-semibold mb-4">Sleep Chart</h3>
        <SleepChartControls
          currentWeekOffset={currentWeekOffset}
          setCurrentWeekOffset={setCurrentWeekOffset}
          showFullDay={showFullDay}
          setShowFullDay={setShowFullDay}
        />
        
        <SleepChartVisualization 
          sleepData={sleepData}
          showFullDay={showFullDay}
        />
      </div>
    </div>
  );
};