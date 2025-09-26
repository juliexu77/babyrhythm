import { Activity } from "./ActivityCard";
import { useState } from "react";
import { getNextNapRecommendation, calculateAgeInWeeks } from "@/utils/huckleberrySchedules";

interface SleepChartProps {
  activities: Activity[];
}

export const SleepChart = ({ activities }: SleepChartProps) => {
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [showFullDay, setShowFullDay] = useState(false);

  // Get baby's age for recommendations
  const getBabyProfile = () => {
    const profile = localStorage.getItem('babyProfile');
    return profile ? JSON.parse(profile) : null;
  };

  const babyProfile = getBabyProfile();
  const ageInWeeks = babyProfile?.birthday ? calculateAgeInWeeks(babyProfile.birthday) : 0;

  // Calculate sleep data for the past 4-7 days
  const generateSleepData = () => {
    const days = viewMode === 'week' ? 7 : 4;
    const data = [];
    const today = new Date();
    
    // Time range: 6am-9pm (15 hours) by default, or full 24 hours if expanded
    const startHour = showFullDay ? 0 : 6;
    const endHour = showFullDay ? 24 : 21;
    const totalHours = endHour - startHour;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter nap activities for this specific date
      const dayNaps = activities.filter(a => {
        if (a.type !== "nap") return false;
        // Since activities don't have logged_at, assume they're all from today for now
        const today = new Date().toISOString().split('T')[0];
        return dateStr === today;
      });
      
      // Create sleep blocks for the time range
      const sleepBlocks = Array(totalHours).fill(false);
      
      dayNaps.forEach(nap => {
        if (nap.details.startTime && nap.details.endTime) {
          const startHour = parseInt(nap.details.startTime.split(':')[0]);
          const startMin = parseInt(nap.details.startTime.split(':')[1]);
          const endHour = parseInt(nap.details.endTime.split(':')[0]);
          const endMin = parseInt(nap.details.endTime.split(':')[1]);
          
          const startBlock = Math.floor(startHour + startMin / 60);
          const endBlock = Math.ceil(endHour + endMin / 60);
          
          // Map to our time range (starting from startHour)
          for (let block = startBlock; block < endBlock; block++) {
            const adjustedBlock = block - startHour;
            if (adjustedBlock >= 0 && adjustedBlock < totalHours) {
              sleepBlocks[adjustedBlock] = true;
            }
          }
        }
      });
      
      data.push({
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        fullDate: date,
        sleepBlocks,
        hasData: dayNaps.length > 0,
        startHour,
        totalHours
      });
    }
    
    return data;
  };

  // Calculate average wake window for days with data
  const calculateAverageWakeWindow = () => {
    const sleepData = generateSleepData();
    const daysWithData = sleepData.filter(day => day.hasData);
    
    if (daysWithData.length === 0) return "No data";
    
    let totalWakeTime = 0;
    let totalDays = 0;
    
    daysWithData.forEach(day => {
      let wakeTime = 0;
      // Count wake time in the visible time range
      for (let hour = 0; hour < day.totalHours; hour++) {
        if (!day.sleepBlocks[hour]) {
          wakeTime++;
        }
      }
      totalWakeTime += wakeTime;
      totalDays++;
    });
    
    if (totalDays === 0) return "No data";
    
    const avgWakeHours = totalWakeTime / totalDays;
    const hours = Math.floor(avgWakeHours);
    const minutes = Math.round((avgWakeHours - hours) * 60);
    
    return `${hours}h ${minutes}m`;
  };

  // Get today's summary data
  const getTodaysSummary = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const todayFeeds = activities.filter(a => {
      if (a.type !== "feed") return false;
      // Since activities don't have logged_at, assume they're all from today
      return true;
    });
    
    const todayDiapers = activities.filter(a => {
      if (a.type !== "diaper") return false;
      // Since activities don't have logged_at, assume they're all from today
      return true;
    });
    
    let totalFeeds = 0;
    todayFeeds.forEach(feed => {
      if (feed.details.quantity) {
        totalFeeds += parseFloat(feed.details.quantity) || 0;
      }
    });
    
    return {
      feeds: Math.round(totalFeeds),
      feedUnit: totalFeeds > 50 ? 'ml' : 'oz',
      diapers: todayDiapers.length
    };
  };

  const sleepData = generateSleepData();
  const averageWakeWindow = calculateAverageWakeWindow();
  const todaysSummary = getTodaysSummary();
  const nextNapRecommendation = getNextNapRecommendation(ageInWeeks);
  const hasAnyData = sleepData.some(day => day.hasData);

  // Generate time labels based on current view
  const generateTimeLabels = () => {
    const startHour = showFullDay ? 0 : 6;
    const endHour = showFullDay ? 24 : 21;
    const labels = [];
    
    for (let hour = startHour; hour < endHour; hour += showFullDay ? 4 : 3) {
      if (hour === 0) {
        labels.push('12am');
      } else if (hour < 12) {
        labels.push(`${hour}am`);
      } else if (hour === 12) {
        labels.push('12pm');
      } else {
        labels.push(`${hour - 12}pm`);
      }
    }
    
    return labels;
  };

  const timeLabels = generateTimeLabels();

  return (
    <div className="space-y-6">
      {/* Sleep Chart */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-semibold text-foreground">Sleep</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('week')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'week' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'month' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              4 Days
            </button>
          </div>
        </div>

        {/* Expand/Collapse Button */}
        <div className="mb-4">
          <button
            onClick={() => setShowFullDay(!showFullDay)}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {showFullDay ? 'Show daytime only (6am-9pm)' : 'Show full day (12am-12am)'}
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-[60px_1fr] gap-4 mb-2">
          <div></div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sleepData.length}, 1fr)` }}>
            {sleepData.map((day, index) => (
              <div key={index} className="text-center text-sm font-medium text-foreground">
                {day.date}
              </div>
            ))}
          </div>
        </div>

        {/* Sleep chart grid */}
        <div className="grid grid-cols-[60px_1fr] gap-4">
          {/* Time labels */}
          <div className="flex flex-col justify-between py-2" style={{ height: showFullDay ? '384px' : '240px' }}>
            {timeLabels.map((time, index) => (
              <div key={index} className="text-xs text-muted-foreground text-right">
                {time}
              </div>
            ))}
          </div>

          {/* Sleep blocks */}
          <div className="grid gap-2" style={{ 
            gridTemplateColumns: `repeat(${sleepData.length}, 1fr)`,
            height: showFullDay ? '384px' : '240px'
          }}>
            {sleepData.map((day, dayIndex) => (
              <div 
                key={dayIndex} 
                className="grid gap-0.5"
                style={{ gridTemplateRows: `repeat(${day.totalHours}, 1fr)` }}
              >
                {day.sleepBlocks.map((isAsleep, hourIndex) => (
                  <div
                    key={hourIndex}
                    className={`w-full rounded-sm ${
                      isAsleep 
                        ? 'bg-primary opacity-80' 
                        : 'bg-muted/30'
                    }`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Prediction Section - Only show if there's data */}
      {hasAnyData && (
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <h3 className="text-lg font-serif font-semibold text-foreground mb-4">Prediction</h3>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm text-muted-foreground">Next nap window: </span>
              <span className="text-base font-medium text-foreground">
                {nextNapRecommendation.nextNapTime || "No recommendation"}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">Avg wake window</div>
              <div className="text-base font-medium text-foreground">{averageWakeWindow}</div>
            </div>
          </div>
          {nextNapRecommendation.reason && (
            <p className="text-xs text-muted-foreground mt-2">{nextNapRecommendation.reason}</p>
          )}
        </div>
      )}

      {/* Today's Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <h4 className="text-sm text-muted-foreground mb-2">Today's Feeds</h4>
          <div className="text-3xl font-serif font-bold text-foreground">
            {todaysSummary.feeds}
            <span className="text-lg text-muted-foreground ml-1">{todaysSummary.feedUnit}</span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <h4 className="text-sm text-muted-foreground mb-2">Today's Diapers</h4>
          <div className="text-3xl font-serif font-bold text-foreground">
            {todaysSummary.diapers}
          </div>
        </div>
      </div>
    </div>
  );
};