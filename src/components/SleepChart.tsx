import { Activity } from "./ActivityCard";
import { useState } from "react";
import { getWakeWindowForAge, calculateAgeInWeeks } from "@/utils/huckleberrySchedules";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface SleepChartProps {
  activities: Activity[];
}

export const SleepChart = ({ activities }: SleepChartProps) => {
  const [showFullDay, setShowFullDay] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Get baby's age for recommendations
  const getBabyProfile = () => {
    const profile = localStorage.getItem('babyProfile');
    return profile ? JSON.parse(profile) : null;
  };

  const babyProfile = getBabyProfile();
  const ageInWeeks = babyProfile?.birthday ? calculateAgeInWeeks(babyProfile.birthday) : 0;

  // Calculate sleep data for the selected week
  const generateSleepData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    today.setDate(today.getDate() - (currentWeekOffset * 7));
    
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
          const [startHour, startMin] = nap.details.startTime.split(':').map(Number);
          const [endHour, endMin] = nap.details.endTime.split(':').map(Number);
          
          // Create precise time blocks for continuous sleep bars
          const startTimeInMinutes = startHour * 60 + startMin;
          const endTimeInMinutes = endHour * 60 + endMin;
          const rangeStartInMinutes = (showFullDay ? 0 : 6) * 60;
          const rangeEndInMinutes = (showFullDay ? 24 : 21) * 60;
          
          // Map to hour blocks and fill all hours in the sleep period
          for (let minute = startTimeInMinutes; minute < endTimeInMinutes; minute += 60) {
            if (minute >= rangeStartInMinutes && minute < rangeEndInMinutes) {
              const hourIndex = Math.floor((minute - rangeStartInMinutes) / 60);
              if (hourIndex >= 0 && hourIndex < totalHours) {
                sleepBlocks[hourIndex] = true;
              }
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
  const wakeWindowData = getWakeWindowForAge(ageInWeeks);
  const todaysSummary = getTodaysSummary();
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

  // Get week date range for display
  const getWeekDateRange = () => {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() - (currentWeekOffset * 7));
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    return `${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })}-${endOfWeek.getDate()}`;
  };

  return (
    <div className="space-y-6">
      {/* Sleep Chart */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        {/* Week Navigation */}
        <div className="flex items-center justify-between mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentWeekOffset(currentWeekOffset + 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="text-center">
            <div className="text-lg font-medium text-foreground">
              {getWeekDateRange()}
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentWeekOffset(Math.max(0, currentWeekOffset - 1))}
            disabled={currentWeekOffset === 0}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
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

        {/* Sleep chart grid with hour lines */}
        <div className="grid grid-cols-[60px_1fr] gap-4 relative">
          {/* Time labels */}
          <div className="flex flex-col justify-between py-2" style={{ height: showFullDay ? '480px' : '360px' }}>
            {Array.from({ length: showFullDay ? 25 : 16 }, (_, i) => {
              const hour = showFullDay ? i : i + 6;
              let timeLabel = '';
              if (hour === 0) timeLabel = '12am';
              else if (hour < 12) timeLabel = `${hour}am`;
              else if (hour === 12) timeLabel = '12pm';
              else timeLabel = `${hour - 12}pm`;
              
              return (
                <div key={i} className="text-xs text-muted-foreground text-right">
                  {timeLabel}
                </div>
              );
            })}
          </div>

          {/* Sleep blocks with hour grid lines */}
          <div className="relative" style={{ height: showFullDay ? '480px' : '360px' }}>
            {/* Hour grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
              {Array.from({ length: showFullDay ? 25 : 16 }, (_, i) => (
                <div key={i} className="h-px bg-border/20" />
              ))}
            </div>
            
            {/* Sleep blocks */}
            <div className="grid gap-2 h-full" style={{ gridTemplateColumns: `repeat(${sleepData.length}, 1fr)` }}>
              {sleepData.map((day, dayIndex) => (
                <div key={dayIndex} className="relative">
                  {/* Sleep bars */}
                  {day.sleepBlocks.map((isAsleep, hourIndex) => {
                    if (!isAsleep) return null;
                    
                    // Find continuous sleep blocks
                    let blockStart = hourIndex;
                    let blockEnd = hourIndex;
                    while (blockEnd < day.sleepBlocks.length - 1 && day.sleepBlocks[blockEnd + 1]) {
                      blockEnd++;
                    }
                    
                    // Only render if this is the start of a block
                    if (blockStart !== hourIndex) return null;
                    
                    const blockHeight = ((blockEnd - blockStart + 1) / day.totalHours) * 100;
                    const blockTop = (blockStart / day.totalHours) * 100;
                    
                    return (
                      <div
                        key={`${hourIndex}-block`}
                        className="absolute w-full bg-primary rounded-sm"
                        style={{
                          top: `${blockTop}%`,
                          height: `${blockHeight}%`,
                        }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Wake Windows Section */}
      {wakeWindowData && (
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <h3 className="text-lg font-serif font-semibold text-foreground mb-4">
            Typical Wake Windows ({Math.floor(ageInWeeks)} weeks old)
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Wake Windows</div>
              <div className="text-2xl font-medium text-foreground">
                {wakeWindowData.wakeWindows.join(", ")}
              </div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Expected Naps</div>
              <div className="text-2xl font-medium text-foreground">
                {wakeWindowData.napCount} per day
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-border">
            <div className="text-sm text-muted-foreground">Total Sleep Need</div>
            <div className="text-lg font-medium text-foreground">
              {wakeWindowData.totalSleep}
            </div>
          </div>
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