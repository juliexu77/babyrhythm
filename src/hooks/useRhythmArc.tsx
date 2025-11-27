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
    const currentHour = currentTime.getHours();

    // Determine theme (day vs night)
    const isNightTheme =
      nightSleepStartHour > nightSleepEndHour
        ? currentHour >= nightSleepStartHour || currentHour < nightSleepEndHour
        : currentHour >= nightSleepStartHour && currentHour < nightSleepEndHour;

    // Get state message
    const stateMessage = getRhythmStateMessage({
      activities,
      currentTime,
      nightSleepStartHour,
      nightSleepEndHour,
      ongoingNap,
    });

    // Determine mode and calculate start time + typical duration
    let mode: "nap" | "wake" = "wake";
    let startTime = currentTime;
    let typicalDuration = 120; // Default 2 hours

    if (ongoingNap?.details?.startTime) {
      // Nap mode
      mode = "nap";
      const [hours, minutes] = ongoingNap.details.startTime.split(":").map(Number);
      startTime = new Date(currentTime);
      startTime.setHours(hours, minutes, 0, 0);
      typicalDuration = 90; // 1.5 hours for naps
    } else {
      // Wake mode - find last nap end time
      const sortedNaps = activities
        .filter((a) => a.type === "nap" && a.details?.endTime)
        .sort((a, b) => {
          const aTime = new Date(a.loggedAt || "").getTime();
          const bTime = new Date(b.loggedAt || "").getTime();
          return bTime - aTime;
        });

      if (sortedNaps.length > 0) {
        const lastNap = sortedNaps[0];
        const [hours, minutes] = lastNap.details.endTime.split(":").map(Number);
        const napEndDate = new Date(lastNap.loggedAt || "");
        napEndDate.setHours(hours, minutes, 0, 0);
        startTime = napEndDate;

        // Calculate age-appropriate wake window
        if (babyBirthday) {
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
        }
      } else {
        // No naps logged - use first activity of day or morning wake
        const todayActivities = activities.filter((a) => {
          const actDate = new Date(a.loggedAt || a.time);
          return actDate.toDateString() === currentTime.toDateString();
        });

        if (todayActivities.length > 0) {
          // Use earliest activity today as proxy for wake time
          const sortedToday = [...todayActivities].sort(
            (a, b) =>
              new Date(a.loggedAt || a.time).getTime() -
              new Date(b.loggedAt || b.time).getTime()
          );
          startTime = new Date(sortedToday[0].loggedAt || sortedToday[0].time);
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
  }, [
    currentTime,
    activities,
    ongoingNap,
    nightSleepStartHour,
    nightSleepEndHour,
    babyBirthday,
  ]);
};
