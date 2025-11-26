import { Activity } from "./ActivityCard";
import { useState, useRef } from "react";
import { useSleepData } from "@/hooks/useSleepData";
import { SleepChartVisualization } from "./sleep/SleepChartVisualization";
import { SleepStats } from "./sleep/SleepStats";
import { SleepChartControls } from "./sleep/SleepChartControls";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Share, Moon } from "lucide-react";
import { shareElement, getWeekCaption } from "@/utils/share/chartShare";

interface SleepChartProps {
  activities: Activity[];
}

export const SleepChart = ({ activities }: SleepChartProps) => {
  const { t } = useLanguage();
  const [showFullDay, setShowFullDay] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const sleepChartRef = useRef<HTMLDivElement>(null);
  
  const { sleepData, averageDailySummary } = useSleepData(activities, showFullDay, currentWeekOffset);

  const onShare = async () => {
    if (!sleepChartRef.current) return;
    try {
      await shareElement(sleepChartRef.current, 'Weekly Sleep Schedule', getWeekCaption(currentWeekOffset));
    } catch (e) {
      console.error('Share failed', e);
    }
  };
  
  // Generate interpretation based on sleep patterns
  const getSleepScheduleInterpretation = () => {
    // Analyze recent nap activities directly
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const weekNaps = activities.filter(a => 
      a.type === 'nap' && 
      a.details.startTime && 
      a.details.endTime &&
      a.loggedAt && 
      new Date(a.loggedAt) >= last7Days
    );
    
    if (weekNaps.length === 0) {
      return "Building your sleep story — patterns emerge over time.";
    }
    
    // Analyze morning naps (before noon)
    const morningNaps = weekNaps.filter(nap => {
      const timeParts = nap.details.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeParts) return false;
      let hour = parseInt(timeParts[1]);
      const period = timeParts[3];
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return hour < 12;
    });
    
    // Check consistency of morning nap timing
    const morningNapHours = morningNaps.map(nap => {
      const timeParts = nap.details.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!timeParts) return 0;
      let hour = parseInt(timeParts[1]);
      const period = timeParts[3];
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return hour;
    });
    
    if (morningNapHours.length >= 3) {
      const avgTime = morningNapHours.reduce((a, b) => a + b, 0) / morningNapHours.length;
      const variance = morningNapHours.reduce((sum, time) => sum + Math.pow(time - avgTime, 2), 0) / morningNapHours.length;
      
      if (variance < 1) {
        return "Morning naps are becoming more predictable — a lovely sign of stability.";
      }
    }
    
    // Check for consolidated sleep patterns
    const napDurations = weekNaps.map(nap => {
      const start = new Date(`2000/01/01 ${nap.details.startTime}`);
      const end = new Date(`2000/01/01 ${nap.details.endTime}`);
      let diff = end.getTime() - start.getTime();
      if (diff < 0) diff += (24 * 60 * 60 * 1000);
      return diff / (1000 * 60 * 60);
    });
    
    const avgDuration = napDurations.reduce((a, b) => a + b, 0) / napDurations.length;
    
    if (avgDuration > 1.5) {
      return "Sleep is consolidating beautifully — longer, more restful stretches.";
    }
    
    return "Your unique sleep rhythm is taking shape — beautiful progress.";
  };

  return (
    <div className="space-y-4">
      {/* Sleep Chart */}
      <div ref={sleepChartRef} className="bg-card/30 backdrop-blur rounded-xl p-6 border border-border/50 transition-all hover:shadow-lg">
        <div className="mb-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Moon className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-base font-sans font-medium text-foreground dark:font-semibold">{t('weeklySleepSchedule')}</h3>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover-scale" onClick={onShare}>
              <Share className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex justify-end">
            <div className="flex bg-muted/30 rounded-lg p-1">
              <Button
                variant={currentWeekOffset === 0 ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentWeekOffset(0)}
                className="h-8 px-3 rounded-md transition-all"
              >
                {t('thisWeek')}
              </Button>
              <Button
                variant={currentWeekOffset === 1 ? "default" : "ghost"}
                size="sm"
                onClick={() => setCurrentWeekOffset(1)}
                className="h-8 px-3 rounded-md transition-all"
              >
                {t('lastWeek')}
              </Button>
            </div>
          </div>
        </div>
        
        <SleepChartVisualization 
          sleepData={sleepData}
          showFullDay={showFullDay}
        />
        
        <div className="mt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullDay(!showFullDay)}
            className="text-muted-foreground text-caption hover:text-foreground"
          >
            {showFullDay ? t('showCondensed') : t('showFullDay')}
          </Button>
        </div>
      </div>
    </div>
  );
};