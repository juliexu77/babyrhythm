import { Activity } from "@/components/ActivityCard";

export interface SleepPeriod {
  start: Date;
  end: Date;
  type: 'nap' | 'overnight';
  activity: Activity;
}

export interface DaySleepData {
  date: string;
  dayOfWeek: string;
  sleepPeriods: SleepPeriod[];
  totalSleepMinutes: number;
}

export const useSleepData = () => {
  const parseTime = (timeStr: string): number => {
    const [time, period] = timeStr.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let hour24 = hours;
    if (period === 'PM' && hours !== 12) hour24 += 12;
    if (period === 'AM' && hours === 12) hour24 = 0;
    return hour24 * 60 + minutes;
  };

  const generateSleepData = (
    activities: Activity[], 
    currentWeekOffset: number = 0,
    showFullDay: boolean = false
  ): DaySleepData[] => {
    const days = 7;
    const data: DaySleepData[] = [];
    const today = new Date();
    today.setDate(today.getDate() - (currentWeekOffset * 7));
    
    const startHour = showFullDay ? 0 : 6;
    const endHour = showFullDay ? 24 : 21;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Filter nap activities for this specific date
      const dayNaps = activities.filter(a => {
        if (a.type !== "nap") return false;
        if (!a.loggedAt) return false;
        
        const activityDate = new Date(a.loggedAt).toISOString().split('T')[0];
        return dateStr === activityDate;
      });
      
      const sleepPeriods: SleepPeriod[] = [];
      let totalSleepMinutes = 0;
      
      dayNaps.forEach(nap => {
        if (nap.details.startTime && nap.details.endTime) {
          const startMinutes = parseTime(nap.details.startTime);
          const endMinutes = parseTime(nap.details.endTime);
          
          // Filter based on time range
          const startHour = Math.floor(startMinutes / 60);
          const endHour = Math.floor(endMinutes / 60);
          
          if (showFullDay || 
              (startHour >= 6 && startHour < 21) || 
              (endHour >= 6 && endHour < 21)) {
            
            const duration = endMinutes > startMinutes 
              ? endMinutes - startMinutes 
              : (24 * 60) - startMinutes + endMinutes;
            
            const type: 'nap' | 'overnight' = startHour >= 18 || startHour < 6 ? 'overnight' : 'nap';
            
            sleepPeriods.push({
              start: new Date(`${dateStr}T${String(Math.floor(startMinutes / 60)).padStart(2, '0')}:${String(startMinutes % 60).padStart(2, '0')}:00`),
              end: new Date(`${dateStr}T${String(Math.floor(endMinutes / 60)).padStart(2, '0')}:${String(endMinutes % 60).padStart(2, '0')}:00`),
              type,
              activity: nap
            });
            
            totalSleepMinutes += duration;
          }
        }
      });
      
      data.push({
        date: dateStr,
        dayOfWeek: date.toLocaleDateString('en', { weekday: 'short' }),
        sleepPeriods,
        totalSleepMinutes
      });
    }
    
    return data;
  };

  const calculateSleepStats = (data: DaySleepData[]) => {
    const totalSleep = data.reduce((sum, day) => sum + day.totalSleepMinutes, 0);
    const averageSleep = totalSleep / data.length;
    const napCounts = data.map(day => day.sleepPeriods.filter(p => p.type === 'nap').length);
    const averageNaps = napCounts.reduce((sum, count) => sum + count, 0) / napCounts.length;
    
    return {
      totalSleep,
      averageSleep,
      averageNaps: Math.round(averageNaps * 10) / 10,
      daysWithData: data.filter(day => day.sleepPeriods.length > 0).length
    };
  };

  return {
    generateSleepData,
    calculateSleepStats,
    parseTime
  };
};