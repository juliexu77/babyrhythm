import { Activity } from "./ActivityCard";
import { useState } from "react";
import { getWakeWindowForAge, calculateAgeInWeeks } from "@/utils/huckleberrySchedules";
import { useBabyProfile } from "@/hooks/useBabyProfile";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface SleepChartProps {
  activities: Activity[];
}

export const SleepChart = ({ activities }: SleepChartProps) => {
  const [showFullDay, setShowFullDay] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);
  const { babyProfile: dbBabyProfile } = useBabyProfile();

  // Get baby's age for recommendations - prioritize database
  const getBabyProfile = () => {
    if (dbBabyProfile) {
      return dbBabyProfile;
    } else {
      // Fallback to localStorage for guest users
      const profile = localStorage.getItem('babyProfile');
      return profile ? JSON.parse(profile) : null;
    }
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
        
        // Convert activity time to a proper date for comparison
        // Since activities only have time strings like "10:30 AM", we need to check if they're from the correct date
        // For now, we'll assume all activities are from today since the data doesn't include full timestamps
        // TODO: This should be improved to use proper logged_at timestamps from the database
        
        const today = new Date().toISOString().split('T')[0];
        // If the activity is from today and we're looking at today's data, include it
        if (dateStr === today) {
          return true;
        }
        
        // For historical dates, we would need proper timestamp data
        // For now, only show data for today
        return false;
      });
      
      // Create sleep blocks for the time range
      const sleepBlocks = Array(totalHours).fill(false);
      
      dayNaps.forEach(nap => {
        if (nap.details.startTime && nap.details.endTime) {
          // Parse time strings like "10:30 AM"
          const parseTime = (timeStr: string) => {
            const cleaned = timeStr.trim();
            const [time, period] = cleaned.split(' ');
            if (!time || !period) return null;
            
            const [hoursStr, minutesStr] = time.split(':');
            if (!hoursStr || !minutesStr) return null;
            
            let hours = parseInt(hoursStr);
            const minutes = parseInt(minutesStr);
            
            if (period.toUpperCase() === 'PM' && hours !== 12) hours += 12;
            if (period.toUpperCase() === 'AM' && hours === 12) hours = 0;
            
            return { hours, minutes };
          };
          
          const startTime = parseTime(nap.details.startTime);
          const endTime = parseTime(nap.details.endTime);
          
          if (!startTime || !endTime) return;
          
          // Create precise time blocks for continuous sleep bars
          const startTimeInMinutes = startTime.hours * 60 + startTime.minutes;
          const endTimeInMinutes = endTime.hours * 60 + endTime.minutes;
          const rangeStartInMinutes = (showFullDay ? 0 : 6) * 60;
          const rangeEndInMinutes = (showFullDay ? 24 : 21) * 60;
          
          // Handle case where end time is next day (sleep overnight)
          let actualEndTime = endTimeInMinutes;
          if (endTimeInMinutes < startTimeInMinutes) {
            actualEndTime = endTimeInMinutes + (24 * 60); // Add 24 hours
          }
          
          // Map to hour blocks and fill all hours in the sleep period
          for (let minute = startTimeInMinutes; minute < actualEndTime; minute += 30) {
            // Map current minute to chart hour
            let chartMinute = minute;
            if (chartMinute >= 24 * 60) {
              chartMinute = chartMinute - (24 * 60); // Wrap to next day
            }
            
            if (chartMinute >= rangeStartInMinutes && chartMinute < rangeEndInMinutes) {
              const hourIndex = Math.floor((chartMinute - rangeStartInMinutes) / 60);
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

  // Get average daily summary data instead of today's data
  const getAverageDailySummary = () => {
    // Group activities by calendar date
    const activityByDate: { [date: string]: Activity[] } = {};
    
    activities.forEach(activity => {
      // For activities with logged_at (database activities), use that date
      let activityDate;
      if ('logged_at' in activity && typeof activity.logged_at === 'string') {
        activityDate = new Date(activity.logged_at).toISOString().split('T')[0];
      } else {
        // For local activities, assume today
        activityDate = new Date().toISOString().split('T')[0];
      }
      
      if (!activityByDate[activityDate]) {
        activityByDate[activityDate] = [];
      }
      activityByDate[activityDate].push(activity);
    });
    
    const dates = Object.keys(activityByDate);
    if (dates.length === 0) {
      return { feeds: 0, feedUnit: 'oz', diapers: 0 };
    }
    
    let totalFeedQuantity = 0;
    let totalDiapers = 0;
    let feedCount = 0;
    
    dates.forEach(date => {
      const dayActivities = activityByDate[date];
      
      const dayFeeds = dayActivities.filter(a => a.type === "feed");
      const dayDiapers = dayActivities.filter(a => a.type === "diaper");
      
      dayFeeds.forEach(feed => {
        if (feed.details.quantity) {
          totalFeedQuantity += parseFloat(feed.details.quantity) || 0;
          feedCount++;
        }
      });
      
      totalDiapers += dayDiapers.length;
    });
    
    const avgFeeds = dates.length > 0 ? Math.round(totalFeedQuantity / dates.length) : 0;
    const avgDiapers = dates.length > 0 ? Math.round(totalDiapers / dates.length) : 0;
    
    return {
      feeds: avgFeeds,
      feedUnit: avgFeeds > 50 ? 'ml' : 'oz',
      diapers: avgDiapers
    };
  };

  const sleepData = generateSleepData();
  const averageDailySummary = getAverageDailySummary();
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

  // Get available week options
  const getWeekOptions = () => {
    const options = [];
    for (let i = 0; i < 12; i++) { // Show up to 12 weeks back
      if (i === 0) {
        options.push({ label: "This Week", value: 0 });
      } else if (i === 1) {
        options.push({ label: "Last Week", value: 1 });
      } else {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        options.push({ 
          label: startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: i 
        });
      }
    }
    return options;
  };

  const weekOptions = getWeekOptions();
  const currentWeekLabel = weekOptions.find(option => option.value === currentWeekOffset)?.label || "This Week";

  return (
    <div className="space-y-6">
      {/* Sleep Chart */}
      <div className="bg-card rounded-xl p-6 shadow-card border border-border">
        {/* Header with Sleep title and toggles */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-serif font-semibold text-foreground">Sleep</h2>
          
          <div className="flex items-center gap-2">
            {/* This Week / Last Week buttons */}
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

            {/* Additional weeks dropdown */}
            {currentWeekOffset > 1 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    {currentWeekLabel}
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-popover border border-border">
                  {weekOptions.slice(2).map((option) => (
                    <DropdownMenuItem 
                      key={option.value}
                      onClick={() => setCurrentWeekOffset(option.value)}
                      className={currentWeekOffset === option.value ? "bg-accent" : ""}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {/* Show full day toggle */}
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFullDay(!showFullDay)}
            className="text-muted-foreground text-sm hover:text-foreground"
          >
            {showFullDay ? "Show condensed (6am-9pm)" : "Show full day (12am-12am)"}
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


      {/* Average Daily Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <h4 className="text-sm text-muted-foreground mb-2">Avg Daily Feeds</h4>
          <div className="text-3xl font-serif font-bold text-foreground">
            {averageDailySummary.feeds}
            <span className="text-lg text-muted-foreground ml-1">{averageDailySummary.feedUnit}</span>
          </div>
        </div>
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <h4 className="text-sm text-muted-foreground mb-2">Avg Daily Diapers</h4>
          <div className="text-3xl font-serif font-bold text-foreground">
            {averageDailySummary.diapers}
          </div>
        </div>
      </div>
    </div>
  );
};