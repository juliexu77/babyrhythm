import { useState, useEffect, useMemo } from "react";
import { Activity } from "@/components/ActivityCard";
import { getRhythmStateMessage } from "@/utils/rhythmStateMessages";
import { isNightSleep as isNightSleepActivity } from "@/utils/napClassification";
import { isNightTime } from "@/utils/nightWindow";
import { getWakeWindowForAge, calculateAgeInWeeks } from "@/utils/ageAppropriateBaselines";

interface UseRhythmArcProps {
  activities: Activity[];
  ongoingNap?: Activity | null;
  nightSleepStartHour: number;
  nightSleepEndHour: number;
  babyBirthday?: string;
}

interface RhythmArcData {
  mode: "nap" | "wake";
  startTime: Date;
  typicalDuration: number;
  currentTime: Date;
  theme: "day" | "night";
  stateMessage: string;
}

export const useRhythmArc = ({
  activities,
  ongoingNap,
  nightSleepStartHour,
  nightSleepEndHour,
  babyBirthday,
}: UseRhythmArcProps): RhythmArcData => {
  // Real-time clock that updates every minute
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  return useMemo(() => {
    try {
      const currentHour = currentTime.getHours();

      // Determine theme (day vs night)
      const isNightTheme =
        nightSleepStartHour > nightSleepEndHour
          ? currentHour >= nightSleepStartHour || currentHour < nightSleepEndHour
          : currentHour >= nightSleepStartHour && currentHour < nightSleepEndHour;

      // Calculate average wake time from recent morning activities
      let averageWakeHour = nightSleepEndHour || 7; // Default to night sleep end hour
      let averageWakeMinute = 0;
      
      // Calculate age-based wake window for state messages
      let ageBasedWakeWindow = 120; // Default 2 hours
      if (babyBirthday) {
        const ageInWeeks = calculateAgeInWeeks(babyBirthday);
        if (ageInWeeks < 4) ageBasedWakeWindow = 45;
        else if (ageInWeeks < 8) ageBasedWakeWindow = 60;
        else if (ageInWeeks < 12) ageBasedWakeWindow = 75;
        else if (ageInWeeks < 16) ageBasedWakeWindow = 90;
        else if (ageInWeeks < 24) ageBasedWakeWindow = 105;
        else if (ageInWeeks < 36) ageBasedWakeWindow = 150; // ~2.5 hours for 6-8 months
        else if (ageInWeeks < 52) ageBasedWakeWindow = 180; // ~3 hours for 9-12 months
        else ageBasedWakeWindow = 240; // 4+ hours for 12+ months
      }
      
      // Try to find average wake time from recent completed night sleeps
      if (activities && activities.length > 0) {
        const recentMorningWakes = activities
          .filter(a => a.type === 'nap' && a.details?.endTime)
          .map(a => {
            const endTimeStr = String(a.details.endTime);
            const match = endTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
            if (match) {
              let hours = parseInt(match[1]);
              const minutes = parseInt(match[2]);
              const period = match[3]?.toUpperCase();
              if (period === 'PM' && hours !== 12) hours += 12;
              if (period === 'AM' && hours === 12) hours = 0;
              // Only consider morning wake times (5-10 AM)
              if (hours >= 5 && hours <= 10) {
                return { hours, minutes };
              }
            }
            return null;
          })
          .filter(Boolean)
          .slice(0, 7); // Last 7 morning wakes
        
        if (recentMorningWakes.length > 0) {
          const avgMinutes = recentMorningWakes.reduce((sum, t) => sum + t!.hours * 60 + t!.minutes, 0) / recentMorningWakes.length;
          averageWakeHour = Math.floor(avgMinutes / 60);
          averageWakeMinute = Math.round(avgMinutes % 60);
        }
      }

      // Get state message with fallback
      const stateMessage = getRhythmStateMessage({
        activities: activities || [],
        currentTime,
        nightSleepStartHour,
        nightSleepEndHour,
        ongoingNap,
        averageWakeHour,
        averageWakeMinute,
        typicalWakeWindowMinutes: ageBasedWakeWindow,
      }) || "Tracking your rhythm";

      // Determine mode and calculate start time + typical duration
      let mode: "nap" | "wake" = "wake";
      let startTime = currentTime;
      let typicalDuration = 120; // Default 2 hours

      if (ongoingNap?.details?.startTime) {
        mode = "nap";
        
        // Parse start time with fallback chain to prevent Invalid Date
        let parsedStartTime: Date | null = null;
        const startTimeStr = String(ongoingNap.details.startTime);
        
        // Try parsing the time string (e.g., "7:44 PM")
        const timeParts = startTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = parseInt(timeParts[2]);
          const period = timeParts[3].toUpperCase();
          
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          // Get base date - use date_local if available to ensure correct local date
          const detailsAny = ongoingNap.details as any;
          let baseDate: Date;
          
          if (detailsAny.date_local) {
            // Parse date_local as local date components to avoid UTC shift
            const [year, month, day] = detailsAny.date_local.split('-').map(Number);
            baseDate = new Date(year, month - 1, day);
          } else {
            // Fallback to logged_at or time
            baseDate = new Date(ongoingNap.loggedAt || ongoingNap.time);
          }
          
          if (!isNaN(baseDate.getTime())) {
            parsedStartTime = new Date(baseDate);
            parsedStartTime.setHours(hours, minutes, 0, 0);
          }
        }
        
        // Fallback chain if parsing failed
        if (!parsedStartTime || isNaN(parsedStartTime.getTime())) {
          const detailsAny = ongoingNap.details as any;
          if (detailsAny.date_local) {
            const [year, month, day] = detailsAny.date_local.split('-').map(Number);
            parsedStartTime = new Date(year, month - 1, day);
          } else if (ongoingNap.loggedAt) {
            parsedStartTime = new Date(ongoingNap.loggedAt);
          } else if (ongoingNap.time) {
            parsedStartTime = new Date(ongoingNap.time);
          } else {
            parsedStartTime = currentTime;
          }
        }
        
        startTime = parsedStartTime;
        
        
        // Determine if this is night sleep using shared utility
        const startHour = startTime.getHours();
        const isNightSleep = isNightTime(startHour, nightSleepStartHour, nightSleepEndHour);
        
        // Use baseline data for typical duration
        let ageBasedDuration = 90; // Default nap duration
        if (babyBirthday) {
          try {
            const ageInWeeks = calculateAgeInWeeks(babyBirthday);
            console.log('🍼 NAP MODE - Age calculation:', { 
              babyBirthday, 
              ageInWeeks, 
              startTime: startTime.toLocaleString(),
              currentTime: currentTime.toLocaleString(),
              isNightSleep 
            });
            
            if (isNightSleep) {
              // Night sleep durations from baseline data (hours -> minutes)
              // From baselineWakeWindows totalSleep field
              if (ageInWeeks < 2) ageBasedDuration = 600; // 10 hours (16-20hrs total, ~10hrs night)
              else if (ageInWeeks < 5) ageBasedDuration = 570; // 9.5 hours (15-18hrs total)
              else if (ageInWeeks < 9) ageBasedDuration = 540; // 9 hours (14-17hrs total)
              else if (ageInWeeks < 13) ageBasedDuration = 540; // 9 hours (14-16hrs total)
              else if (ageInWeeks < 17) ageBasedDuration = 600; // 10 hours (12-15hrs total)
              else if (ageInWeeks < 25) ageBasedDuration = 630; // 10.5 hours (12-15hrs total)
              else if (ageInWeeks < 36) ageBasedDuration = 660; // 11 hours (12-14hrs total)
              else if (ageInWeeks < 53) ageBasedDuration = 660; // 11 hours (11-14hrs total)
              else if (ageInWeeks < 105) ageBasedDuration = 630; // 10.5 hours (11-13hrs total)
              else ageBasedDuration = 600; // 10 hours (10-12hrs total)
            } else {
              // Daytime nap durations from baseline data
              const wakeWindowData = getWakeWindowForAge(ageInWeeks);
              if (wakeWindowData) {
                // Estimate nap length based on age and typical nap count
                const napCountStr = wakeWindowData.napCount;
                const napCount = parseInt(napCountStr.split('-')[0]) || 3;
                
                // Rough nap duration estimates
                if (ageInWeeks < 5) ageBasedDuration = 90; // 1.5 hours
                else if (ageInWeeks < 13) ageBasedDuration = 75; // 1.25 hours
                else if (ageInWeeks < 25) ageBasedDuration = 90; // 1.5 hours
                else if (ageInWeeks < 36) ageBasedDuration = 90; // 1.5 hours
                else if (ageInWeeks < 65) ageBasedDuration = 90; // 1.5 hours for single nap
                else ageBasedDuration = 0; // No naps after 65 weeks typically
              }
            }
          } catch (e) {
            console.error("Error calculating age-appropriate duration:", e);
          }
        }
        typicalDuration = ageBasedDuration;
      } else if (activities && activities.length > 0) {
        // Wake mode - find last nap end time
        const sortedNaps = activities
          .filter((a) => a && a.type === "nap" && a.details?.endTime)
          .sort((a, b) => {
            const aTime = new Date(a.loggedAt || a.time || "").getTime();
            const bTime = new Date(b.loggedAt || b.time || "").getTime();
            return bTime - aTime;
          });

        if (sortedNaps.length > 0) {
          const lastNap = sortedNaps[0];
          const endTimeStr = String(lastNap.details.endTime);
          const timeParts = endTimeStr.split(":").map(Number);
          if (timeParts.length >= 2 && !isNaN(timeParts[0]) && !isNaN(timeParts[1])) {
            const [hours, minutes] = timeParts;
            const napEndDate = new Date(lastNap.loggedAt || lastNap.time || currentTime);
            napEndDate.setHours(hours, minutes, 0, 0);
            startTime = napEndDate;
          }

          // Calculate age-appropriate wake window
          if (babyBirthday) {
            try {
              const birthDate = new Date(babyBirthday);
              const ageInWeeks = Math.floor(
                (currentTime.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 7)
              );
              
              console.log('⏰ WAKE MODE - Age calculation:', { 
                babyBirthday, 
                birthDate: birthDate.toLocaleDateString(),
                currentTime: currentTime.toLocaleString(),
                ageInWeeks,
                lastNapEnd: startTime.toLocaleString()
              });

              // Age-based wake windows (in minutes)
              if (ageInWeeks < 4) typicalDuration = 45;
              else if (ageInWeeks < 8) typicalDuration = 60;
              else if (ageInWeeks < 12) typicalDuration = 75;
              else if (ageInWeeks < 16) typicalDuration = 90;
              else if (ageInWeeks < 24) typicalDuration = 105;
              else if (ageInWeeks < 36) typicalDuration = 120;
              else if (ageInWeeks < 52) typicalDuration = 150;
              else typicalDuration = 180;
            } catch (e) {
              console.error("Error calculating age-appropriate wake window:", e);
            }
          }
        } else {
          // No naps logged - use first activity of day or morning wake
          const todayActivities = activities.filter((a) => {
            if (!a) return false;
            const actDate = new Date(a.loggedAt || a.time || "");
            return actDate.toDateString() === currentTime.toDateString();
          });

          if (todayActivities.length > 0) {
            // Use earliest activity today as proxy for wake time
            const sortedToday = [...todayActivities].sort(
              (a, b) =>
                new Date(a.loggedAt || a.time || "").getTime() -
                new Date(b.loggedAt || b.time || "").getTime()
            );
            startTime = new Date(sortedToday[0].loggedAt || sortedToday[0].time || currentTime);
          } else {
            // Absolute fallback: assume 7 AM wake
            startTime = new Date(currentTime);
            startTime.setHours(7, 0, 0, 0);
          }
        }
      }

      return {
        mode,
        startTime,
        typicalDuration,
        currentTime,
        theme: isNightTheme ? "night" : "day",
        stateMessage,
      };
    } catch (error) {
      console.error("Error in useRhythmArc:", error);
      // Return safe defaults if something breaks
      return {
        mode: "wake" as const,
        startTime: new Date(),
        typicalDuration: 120,
        currentTime,
        theme: "day" as const,
        stateMessage: "Tracking your rhythm",
      };
    }
  }, [
    currentTime,
    activities,
    ongoingNap,
    nightSleepStartHour,
    nightSleepEndHour,
    babyBirthday,
  ]);
};
