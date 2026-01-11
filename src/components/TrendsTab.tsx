import { Activity } from "./ActivityCard";
import { useState, useCallback } from "react";
import { useHousehold } from "@/hooks/useHousehold";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { TimelineChart } from "@/components/trends/TimelineChart";
import { TrendsSummaryStrip } from "@/components/trends/TrendsSummaryStrip";
import { TimeRangeSwitcher } from "@/components/trends/TimeRangeSwitcher";
import { TrendsLoadingState } from "@/components/trends/TrendsLoadingState";
import { useTrendsMetrics, generateTrendsSummary } from "@/hooks/useTrendsMetrics";
import { 
  extractNightSleep, 
  extractDayNaps, 
  extractFeedVolume, 
  extractWakeWindows 
} from "@/utils/trendsDataExtractors";

interface TrendsTabProps {
  activities: Activity[];
  travelDayDates?: string[];
}

type TimeRange = '1week' | '6weeks' | '3months';

export const TrendsTab = ({ activities, travelDayDates = [] }: TrendsTabProps) => {
  const { household, loading: householdLoading } = useHousehold();
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  const [timeRange, setTimeRange] = useState<TimeRange>('1week');

  // Get overview metrics from hook
  const overviewMetrics = useTrendsMetrics({
    activities,
    nightSleepStartHour,
    nightSleepEndHour,
    travelDayDates
  });

  // Create bound data extractors
  const boundExtractNightSleep = useCallback(
    (activities: Activity[], date: Date) => 
      extractNightSleep(activities, date, nightSleepStartHour, nightSleepEndHour),
    [nightSleepStartHour, nightSleepEndHour]
  );

  const boundExtractDayNaps = useCallback(
    (activities: Activity[], date: Date) => 
      extractDayNaps(activities, date, nightSleepStartHour, nightSleepEndHour),
    [nightSleepStartHour, nightSleepEndHour]
  );

  const boundExtractFeedVolume = useCallback(
    (activities: Activity[], date: Date) => 
      extractFeedVolume(activities, date),
    []
  );

  const boundExtractWakeWindows = useCallback(
    (activities: Activity[], date: Date) => 
      extractWakeWindows(activities, date, nightSleepStartHour, nightSleepEndHour),
    [nightSleepStartHour, nightSleepEndHour]
  );

  // Show loading state
  if (householdLoading || !household) {
    return <TrendsLoadingState />;
  }

  const babyName = household?.baby_name || 'your baby';

  return (
    <div className="space-y-2 pb-6 pt-2">
      {/* Time Range Switcher */}
      <TimeRangeSwitcher 
        timeRange={timeRange} 
        onTimeRangeChange={setTimeRange} 
      />
      
      {/* Summary Stats Strip */}
      <TrendsSummaryStrip metrics={overviewMetrics} />

      {/* Chart Sections */}
      <div className="space-y-2">
        {/* Night Sleep Chart */}
        <div className="bg-card px-5 py-5">
          <div className="mb-3">
            <span className="text-card-subtitle">Night Sleep</span>
          </div>
          <TimelineChart
            title="Night Sleep"
            activities={activities}
            timeRange={timeRange}
            dataExtractor={boundExtractNightSleep}
            unit="h"
            color="hsl(var(--primary))"
            yAxisFormatter={(v) => `${v.toFixed(0)}h`}
            tooltipFormatter={(v) => v.toFixed(1)}
            babyBirthday={household?.baby_birthday}
            metricType="nightSleep"
            showBaseline={false}
            travelDayDates={travelDayDates}
          />
        </div>

        {/* Day Naps Chart */}
        <div className="bg-card px-5 py-5">
          <div className="mb-3">
            <span className="text-card-subtitle">Day Naps</span>
          </div>
          <TimelineChart
            title="Day Naps"
            activities={activities}
            timeRange={timeRange}
            dataExtractor={boundExtractDayNaps}
            unit="naps"
            color="hsl(var(--accent-foreground))"
            yAxisFormatter={(v) => v.toFixed(0)}
            tooltipFormatter={(v) => v.toFixed(0)}
            babyBirthday={household?.baby_birthday}
            metricType="dayNaps"
            showBaseline={false}
            travelDayDates={travelDayDates}
          />
        </div>

        {/* Feed Volume Chart */}
        <div className="bg-card px-5 py-5">
          <div className="mb-3">
            <span className="text-card-subtitle">Feed Volume</span>
          </div>
          <TimelineChart
            title="Feed Volume"
            activities={activities}
            timeRange={timeRange}
            dataExtractor={boundExtractFeedVolume}
            unit="oz"
            color="hsl(var(--secondary-foreground))"
            yAxisFormatter={(v) => `${v.toFixed(0)}oz`}
            tooltipFormatter={(v) => v.toFixed(0)}
            babyBirthday={household?.baby_birthday}
            metricType="feedVolume"
            showBaseline={false}
            travelDayDates={travelDayDates}
          />
        </div>

        {/* Wake Windows Chart */}
        <div className="bg-card px-5 py-5">
          <div className="mb-3">
            <span className="text-card-subtitle">Wake Windows</span>
          </div>
          <TimelineChart
            title="Wake Windows"
            activities={activities}
            timeRange={timeRange}
            dataExtractor={boundExtractWakeWindows}
            unit="h"
            color="hsl(var(--muted-foreground))"
            yAxisFormatter={(v) => `${v.toFixed(1)}h`}
            tooltipFormatter={(v) => v.toFixed(1)}
            babyBirthday={household?.baby_birthday}
            metricType="wakeWindows"
            showBaseline={false}
            travelDayDates={travelDayDates}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="bg-card px-5 py-5">
        <p className="text-body-muted leading-relaxed">
          {generateTrendsSummary(overviewMetrics, babyName)}
        </p>
      </div>
    </div>
  );
};
