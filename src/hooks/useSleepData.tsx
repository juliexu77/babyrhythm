import { Activity } from "@/components/ActivityCard";
import { useHousehold } from "./useHousehold";
import { calculateAgeInWeeks } from "@/utils/huckleberrySchedules";
import { SleepDataDay, AverageDailySummary, SleepBlock } from "@/types/sleep";
import { useLanguage } from "@/contexts/LanguageContext";
import { getActivityEventDate } from "@/utils/activityDate";

export const useSleepData = (activities: Activity[], showFullDay: boolean, currentWeekOffset: number) => {
  const { household } = useHousehold();
  const { language } = useLanguage();
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
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter nap activities for this specific date OR previous day (for overnight naps)
      const dayNaps = activities.filter(a => {
        if (a.type !== "nap") return false;
        if (!a.loggedAt) return false;
        if (!a.details.startTime || !a.details.endTime) return false;
        
        const activityDate = getActivityEventDate(a as any);
        const localActivityDate = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
        const localTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        
        // Check if activity is on this date
        if (localActivityDate.getTime() === localTargetDate.getTime()) return true;
        
        // Check if activity is from previous day but extends into this day (overnight)
        const previousDate = new Date(date);
        previousDate.setDate(previousDate.getDate() - 1);
        const localPreviousDate = new Date(previousDate.getFullYear(), previousDate.getMonth(), previousDate.getDate());
        
        if (localActivityDate.getTime() === localPreviousDate.getTime()) {
          // Check if it's an overnight nap
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
          
          const startTime = parseTime(a.details.startTime);
          const endTime = parseTime(a.details.endTime);
          if (!startTime || !endTime) return false;
          
          // If end time is before start time, it's overnight
          return (endTime.hours * 60 + endTime.minutes) < (startTime.hours * 60 + startTime.minutes);
        }
        
        return false;
      });
      
      // Create sleep blocks for the time range with metadata
      const sleepBlocks: SleepBlock[] = Array(totalHours).fill(null).map(() => ({ 
        isAsleep: false, 
        naps: [] 
      }));
      
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
          
          // Check if this nap is from previous day (overnight)
          const activityDate = new Date(nap.loggedAt!);
          const localActivityDate = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
          const localTargetDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
          const isFromPreviousDay = localActivityDate.getTime() !== localTargetDate.getTime();
          
          // Create precise time blocks for continuous sleep bars
          let startTimeInMinutes = startTime.hours * 60 + startTime.minutes;
          let endTimeInMinutes = endTime.hours * 60 + endTime.minutes;
          const rangeStartInMinutes = (showFullDay ? 0 : 6) * 60;
          const rangeEndInMinutes = (showFullDay ? 24 : 21) * 60;
          
          // Handle overnight naps
          if (endTimeInMinutes < startTimeInMinutes) {
            // This is an overnight nap
            if (isFromPreviousDay) {
              // We're showing the morning portion on current day
              // Start from midnight and go to end time
              startTimeInMinutes = 0;
            } else {
              // We're showing the evening portion on the nap's logged day
              // End at midnight
              endTimeInMinutes = 24 * 60;
            }
          }
          
          // Map to hour blocks and fill all hours in the sleep period
          for (let minute = startTimeInMinutes; minute < endTimeInMinutes; minute += 30) {
            if (minute >= rangeStartInMinutes && minute < rangeEndInMinutes) {
              const hourIndex = Math.floor((minute - rangeStartInMinutes) / 60);
              if (hourIndex >= 0 && hourIndex < totalHours) {
                sleepBlocks[hourIndex].isAsleep = true;
                if (!sleepBlocks[hourIndex].naps.some(n => n.id === nap.id)) {
                  sleepBlocks[hourIndex].naps.push(nap);
                }
              }
            }
          }
        }
      });
      
      const dayData: SleepDataDay = {
        date: date.toLocaleDateString(language === 'zh' ? "zh-CN" : "en-US", { weekday: "short" }).slice(0, 3),
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
      
      const activityDate = getActivityEventDate(activity as any);
      const dateKey = activityDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      
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