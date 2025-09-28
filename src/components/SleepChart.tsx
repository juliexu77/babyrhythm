import { Activity } from "@/components/ActivityCard";
import { useState } from "react";
import { calculateAgeInWeeks } from "@/utils/huckleberrySchedules";
import { useHousehold } from "@/hooks/useHousehold";
import { useSleepData } from "@/hooks/useSleepData";
import { SleepChartVisualization } from "./sleep/SleepChartVisualization";
import { SleepStats } from "./sleep/SleepStats";
import { SleepChartControls } from "./sleep/SleepChartControls";

interface SleepChartProps {
  activities: Activity[];
}

export const SleepChart = ({ activities }: SleepChartProps) => {
  const [showFullDay, setShowFullDay] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const { household } = useHousehold();
  const { generateSleepData, calculateSleepStats } = useSleepData();

  const ageInWeeks = household?.baby_birthday ? calculateAgeInWeeks(household.baby_birthday) : 0;
  const sleepData = generateSleepData(activities, currentWeekOffset, showFullDay);
  const stats = calculateSleepStats(sleepData);

  if (sleepData.every(day => day.sleepPeriods.length === 0)) {
    return (
      <div className="text-center py-8">
        <div className="text-muted-foreground text-sm">
          No sleep data recorded yet. Start logging naps to see sleep patterns!
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SleepChartControls
        showFullDay={showFullDay}
        onToggleFullDay={setShowFullDay}
        currentWeekOffset={currentWeekOffset}
        onWeekChange={setCurrentWeekOffset}
      />

      <SleepChartVisualization
        data={sleepData}
        showFullDay={showFullDay}
        ageInWeeks={ageInWeeks}
        currentWeekOffset={currentWeekOffset}
      />

      <SleepStats
        totalSleep={stats.totalSleep}
        averageSleep={stats.averageSleep}
        averageNaps={stats.averageNaps}
        daysWithData={stats.daysWithData}
        ageInWeeks={ageInWeeks}
        currentWeekOffset={currentWeekOffset}
      />
    </div>
  );
};