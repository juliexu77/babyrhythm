import { useState, useEffect, useMemo } from "react";
import { Activity } from "@/components/ActivityCard";
import { getRhythmStateMessage } from "@/utils/rhythmStateMessages";

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

      // Get state message with fallback
      const stateMessage = getRhythmStateMessage({
        activities: activities || [],
        currentTime,
        nightSleepStartHour,
        nightSleepEndHour,
        ongoingNap,
      }) || "Tracking your rhythm";

      // Determine mode and calculate start time + typical duration
      let mode: "nap" | "wake" = "wake";
      let startTime = currentTime;
      let typicalDuration = 120; // Default 2 hours

      if (ongoingNap?.details?.startTime) {
        // Check if this is night sleep or a nap
        mode = "nap";
        
        // Use the activity's time field which is already in local timezone
        const activityTime = new Date(ongoingNap.time);
        const startTimeStr = String(ongoingNap.details.startTime);
        
        // Parse the time string (e.g., "7:44 PM")
        const timeParts = startTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        
        if (timeParts) {
          let hours = parseInt(timeParts[1]);
          const minutes = parseInt(timeParts[2]);
          const period = timeParts[3].toUpperCase();
          
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          // Use the date from activity.time but set the hours/minutes from startTime
          startTime = new Date(activityTime);
          startTime.setHours(hours, minutes, 0, 0);
        }
        
        
        
        // Determine if this is night sleep based on start time
        const startHour = startTime.getHours();
        const isNightSleep = nightSleepStartHour > nightSleepEndHour
          ? startHour >= nightSleepStartHour || startHour < nightSleepEndHour
          : startHour >= nightSleepStartHour && startHour < nightSleepEndHour;
        
        // Calculate age-based typical duration
        let ageBasedDuration = 90; // Default nap duration
        if (babyBirthday) {
          try {
            const birthDate = new Date(babyBirthday);
            const ageInMonths = Math.floor(
              (currentTime.getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
            );
            
            if (isNightSleep) {
              // Age-appropriate night sleep durations (in minutes)
              if (ageInMonths < 1) ageBasedDuration = 480; // 8 hours
              else if (ageInMonths < 2) ageBasedDuration = 540; // 9 hours
              else if (ageInMonths < 4) ageBasedDuration = 600; // 10 hours
              else if (ageInMonths < 6) ageBasedDuration = 630; // 10.5 hours
              else if (ageInMonths < 9) ageBasedDuration = 660; // 11 hours
              else if (ageInMonths < 12) ageBasedDuration = 660; // 11 hours
              else ageBasedDuration = 630; // 10.5 hours
            } else {
              // Age-appropriate nap durations (in minutes)
              if (ageInMonths < 1) ageBasedDuration = 120; // 2 hours
              else if (ageInMonths < 2) ageBasedDuration = 105; // 1.75 hours
              else if (ageInMonths < 4) ageBasedDuration = 90; // 1.5 hours
              else if (ageInMonths < 6) ageBasedDuration = 90; // 1.5 hours
              else if (ageInMonths < 9) ageBasedDuration = 75; // 1.25 hours
              else if (ageInMonths < 12) ageBasedDuration = 75; // 1.25 hours
              else ageBasedDuration = 90; // 1.5 hours
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
