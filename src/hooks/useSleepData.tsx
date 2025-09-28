import { Activity } from "@/components/ActivityCard";
import { useHousehold } from "./useHousehold";
import { calculateAgeInWeeks } from "@/utils/huckleberrySchedules";
import { SleepDataDay, AverageDailySummary } from "@/types/sleep";

export const useSleepData = (activities: Activity[], showFullDay: boolean, currentWeekOffset: number) => {
  const { household } = useHousehold();
  const ageInWeeks = household?.baby_birthday ? calculateAgeInWeeks(household.baby_birthday) : 0;

  const generateSleepData = (): SleepDataDay[] => {
    const days = 7;
    const data: SleepDataDay[] = [];
    const today = new Date();
    today.setDate(today.getDate() - (currentWeekOffset * 7));
    
    // Time range: 6am-9pm (15 hours) by default, or full 24 hours if expanded
    const startHour = showFullDay ? 0 : 6;
    const endHour = showFullDay ? 24 : 21;
    const totalHours = endHour - startHour;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      // Use consistent local date formatting
      const localDateStr = date.toDateString();
      const localDate = new Date(localDateStr);
      const dateStr = localDate.getFullYear() + '-' + 
                     String(localDate.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(localDate.getDate()).padStart(2, '0');
      
      // Filter nap activities for this specific date
      const dayNaps = activities.filter(a => {
      if (a.type !== "nap") return false;
      if (!a.loggedAt) return false;
      
      // Use consistent date grouping approach - convert to local date string first
      const activityDate = new Date(a.loggedAt);
      const localDateStr = activityDate.toDateString();
      const localDate = new Date(localDateStr);
      const activityDateKey = localDate.getFullYear() + '-' + 
                             String(localDate.getMonth() + 1).padStart(2, '0') + '-' + 
                             String(localDate.getDate()).padStart(2, '0');
      return dateStr === activityDateKey;
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
      
      const dayData: SleepDataDay = {
        date: date.toLocaleDateString("en-US", { weekday: "short" }),
        fullDate: date,
        sleepBlocks,
        hasData: dayNaps.length > 0,
        startHour,
        totalHours
      };
      
      data.push(dayData);
    }
    
    return data;
  };

  const getAverageDailySummary = (): AverageDailySummary => {
    // Group activities by calendar date
    const activityByDate: Record<string, Activity[]> = {};
    
    activities.forEach(activity => {
      if (!activity.loggedAt) return; // Skip activities without loggedAt timestamp
      
      // Use consistent date grouping approach - convert to local date string first
      const activityDate = new Date(activity.loggedAt);
      const localDateStr = activityDate.toDateString();
      const localDate = new Date(localDateStr);
      const dateKey = localDate.getFullYear() + '-' + 
                     String(localDate.getMonth() + 1).padStart(2, '0') + '-' + 
                     String(localDate.getDate()).padStart(2, '0');
      
      if (!activityByDate[dateKey]) {
        activityByDate[dateKey] = [];
      }
      activityByDate[dateKey].push(activity);
    });
    
    const dates = Object.keys(activityByDate);
    if (dates.length === 0) {
      return { feeds: 0, diapers: 0 };
    }
    
    let totalFeeds = 0;
    let totalDiapers = 0;
    
    dates.forEach(date => {
      const dayActivities = activityByDate[date];
      
      const dayFeeds = dayActivities.filter(a => a.type === "feed");
      const dayDiapers = dayActivities.filter(a => a.type === "diaper");
      
      totalFeeds += dayFeeds.length;
      totalDiapers += dayDiapers.length;
    });
    
    const avgFeeds = dates.length > 0 ? Math.round(totalFeeds / dates.length) : 0;
    const avgDiapers = dates.length > 0 ? Math.round(totalDiapers / dates.length) : 0;
    
    return {
      feeds: avgFeeds,
      diapers: avgDiapers
    };
  };

  return {
    ageInWeeks,
    sleepData: generateSleepData(),
    averageDailySummary: getAverageDailySummary()
  };
};