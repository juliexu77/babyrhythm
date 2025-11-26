import { Activity } from "@/components/ActivityCard";
import { differenceInMinutes, format } from "date-fns";
import { getActivityEventDate } from "@/utils/activityDate";

interface CurrentMomentArcProps {
  activities: Activity[];
  babyName?: string;
  ongoingNap?: Activity | null;
  nightSleepStartHour: number;
  nightSleepEndHour: number;
}

// Get the most recent meaningful activity
const getMostRecentActivity = (activities: Activity[]): Activity | null => {
  if (activities.length === 0) return null;
  
  // Sort by loggedAt descending
  const sorted = [...activities].sort((a, b) => {
    const aTime = new Date(a.loggedAt || '').getTime();
    const bTime = new Date(b.loggedAt || '').getTime();
    return bTime - aTime;
  });
  
  return sorted[0] || null;
};

// Determine if we're in daytime or nighttime
const isDaytime = (currentHour: number, nightSleepStartHour: number, nightSleepEndHour: number): boolean => {
  if (nightSleepEndHour > nightSleepStartHour) {
    // Normal case: e.g., 19:00 to 7:00
    return currentHour >= nightSleepEndHour && currentHour < nightSleepStartHour;
  } else {
    // Wrapped case: e.g., 22:00 to 6:00
    return currentHour >= nightSleepEndHour || currentHour < nightSleepStartHour;
  }
};

// Calculate duration string
const getDurationString = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
};

// Get the current state line based on activities and time
const getCurrentState = (
  activities: Activity[],
  ongoingNap: Activity | null,
  nightSleepStartHour: number,
  nightSleepEndHour: number
): string => {
  const now = new Date();
  const currentHour = now.getHours();
  const isDay = isDaytime(currentHour, nightSleepStartHour, nightSleepEndHour);
  
  // If there's an ongoing nap, prioritize that
  if (ongoingNap) {
    const startTime = ongoingNap.details?.startTime;
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(now);
      startDate.setHours(hours, minutes, 0, 0);
      const napMinutes = differenceInMinutes(now, startDate);
      
      // Check if this is night sleep (outside daytime hours)
      const isNightTime = currentHour >= 19 || currentHour < 5;
      
      if (napMinutes < 5) {
        if (isNightTime) {
          return "Down for the night";
        }
        return "Just fell asleep";
      }
      
      // Delightful variations based on duration first
      if (napMinutes < 20) {
        return "Quick snooze";
      } else if (napMinutes > 90) {
        return "Long snooze";
      }
      
      // Time-based delightful variations (use current hour, not start time hour)
      if (currentHour >= 5 && currentHour < 12) {
        return "Morning snooze";
      } else if (currentHour >= 15 && currentHour < 18) {
        return "Cat nap";
      } else if (currentHour >= 12 && currentHour < 17) {
        return "Afternoon nap";
      } else if (currentHour >= 19 || currentHour < 5) {
        return "Sleeping peacefully";
      } else {
        return "Nap in progress";
      }
    }
    return "Nap in progress";
  }
  
  // Get most recent activity
  const recentActivity = getMostRecentActivity(activities);
  if (!recentActivity) {
    // No activity yet
    if (currentHour >= 5 && currentHour < 10) {
      return "Starting the morning";
    } else if (currentHour >= 19 || currentHour < 5) {
      return "Night stretch";
    }
    return "Awake";
  }
  
  const activityTime = new Date(recentActivity.loggedAt || '');
  const minutesSince = differenceInMinutes(now, activityTime);
  
  // SLEEP STATES
  if (recentActivity.type === 'nap') {
    const endTime = recentActivity.details?.endTime;
    const startTime = recentActivity.details?.startTime;
    const isNightTime = currentHour >= 19 || currentHour < 5;
    
    if (endTime) {
      // Calculate nap duration for delightful variations
      if (startTime) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        const startDate = new Date(now);
        startDate.setHours(startHours, startMinutes, 0, 0);
        const endDate = new Date(now);
        endDate.setHours(endHours, endMinutes, 0, 0);
        const napDuration = differenceInMinutes(endDate, startDate);
        
        if (minutesSince < 10) {
          // Night wake-ups
          if (isNightTime) {
            if (minutesSince < 3) {
              return "Just woke up";
            } else if (napDuration < 30) {
              return "Quick wake-up";
            } else {
              return "Little midnight moment";
            }
          }
          
          // Add context based on nap length
          if (napDuration < 20) {
            return "Just woke up from quick snooze";
          } else if (napDuration > 90) {
            return "Just woke up from long snooze";
          }
          return "Just woke up";
        }
      }
      
      // Nap has ended
      if (minutesSince < 10) {
        if (isNightTime) {
          return "Late-night wake";
        }
        return "Just woke up";
      } else if (minutesSince < 30) {
        return "Nap just ended";
      }
    } else if (!ongoingNap) {
      // Nap was logged but no ongoing nap - might be a completed nap
      if (minutesSince < 10) {
        return "Just woke up";
      }
    }
  }
  
  // FEED & SOLIDS STATES
  if (recentActivity.type === 'feed') {
    const quantity = recentActivity.details?.quantity;
    const unit = recentActivity.details?.unit;
    const minutesLeft = recentActivity.details?.minutesLeft;
    const minutesRight = recentActivity.details?.minutesRight;
    const isNightTime = currentHour >= 19 || currentHour < 5;
    
    // Count today's feeds for milestone celebrations
    const todayFeeds = activities.filter(a => {
      const activityDate = new Date(a.loggedAt || '');
      const today = new Date();
      return a.type === 'feed' && 
        activityDate.toDateString() === today.toDateString();
    }).length;
    
    if (minutesSince < 10) {
      // Night feed messages
      if (isNightTime) {
        if (minutesSince < 3) {
          return "Just had a night feed";
        } else if (minutesSince < 6) {
          return "Night feed wrapped up";
        } else {
          return "Topped up for the night";
        }
      }
      
      // Celebrate feed milestones
      if (todayFeeds === 3) {
        return "Third feed today! 🎉";
      } else if (todayFeeds === 5) {
        return "Fifth feed today! 🌟";
      }
      
      // Full belly for larger feeds
      const quantityNum = quantity ? parseFloat(quantity) : 0;
      const nursingMinutes = (minutesLeft ? parseInt(minutesLeft) : 0) + (minutesRight ? parseInt(minutesRight) : 0);
      
      const isLargeFeed = (unit === 'ml' && quantityNum >= 150) || 
                         (unit === 'oz' && quantityNum >= 5) ||
                         nursingMinutes >= 20;
      
      if (isLargeFeed) {
        if (nursingMinutes > 0) {
          return `Full belly · ${nursingMinutes}min`;
        } else if (quantity && unit) {
          return `Full belly · ${quantity}${unit}`;
        }
      }
      
      const feedType = recentActivity.details?.feedType;
      if (feedType === 'bottle') {
        return "Just had a bottle";
      } else if (feedType === 'nursing') {
        return "Just nursed";
      }
      return "Finished a feed";
    }
  }
  
  if (recentActivity.type === 'solids') {
    const foodDescription = recentActivity.details?.solidDescription;
    if (minutesSince < 15) {
      if (foodDescription) {
        // Check if this is the first time this food appears
        const previousSolids = activities.filter(a => 
          a.type === 'solids' && 
          a.id !== recentActivity.id &&
          new Date(a.loggedAt || '') < activityTime
        );
        const isFirstTime = !previousSolids.some(a => a.details?.solidDescription === foodDescription);
        
        if (isFirstTime) {
          return `First taste of ${foodDescription}!`;
        }
        return `Ate solids · ${foodDescription}`;
      }
      return "Just ate solids";
    }
  }
  
  // DIAPER STATES
  if (recentActivity.type === 'diaper') {
    if (minutesSince < 10) {
      const diaperType = recentActivity.details?.diaperType;
      if (diaperType === 'poopy' || diaperType === 'both') {
        return "Just pooped";
      }
      return "Fresh diaper";
    }
  }
  
  // AWARE / ROUTINE STATES
  // Find the last sleep activity to calculate awake time
  const lastSleep = activities
    .filter(a => a.type === 'nap')
    .sort((a, b) => {
      const aTime = new Date(a.loggedAt || '').getTime();
      const bTime = new Date(b.loggedAt || '').getTime();
      return bTime - aTime;
    })[0];
  
  if (lastSleep && lastSleep.details?.endTime) {
    const endTime = lastSleep.details.endTime;
    const [hours, minutes] = endTime.split(':').map(Number);
    const wakeDate = getActivityEventDate(lastSleep);
    wakeDate.setHours(hours, minutes, 0, 0);
    const awakeMinutes = differenceInMinutes(now, wakeDate);
    
    if (awakeMinutes < 15) {
      return "Just started awake time";
    } else if (awakeMinutes > 150) {
      return `Long stretch awake · ${getDurationString(awakeMinutes)}`;
    } else if (awakeMinutes > 120) {
      // Getting sleepy after 2+ hours awake
      return "Getting sleepy";
    } else if (awakeMinutes > 60) {
      return `Awake · ${getDurationString(awakeMinutes)}`;
    }
    return `Awake · ${getDurationString(awakeMinutes)}`;
  }
  
  // Check if bedtime is approaching (within 1 hour of night sleep start)
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const nightSleepStartMinute = 0; // Using nightSleepStartHour only, assuming on the hour
  const bedtimeMinutes = nightSleepStartHour * 60 + nightSleepStartMinute;
  let minutesUntilBedtime = bedtimeMinutes - currentMinutes;
  
  // Handle midnight crossing
  if (minutesUntilBedtime < 0) {
    minutesUntilBedtime += 24 * 60;
  }
  
  if (minutesUntilBedtime > 0 && minutesUntilBedtime <= 60) {
    return "Bedtime coming soon";
  }
  
  // Time-based fallbacks
  if (currentHour >= 5 && currentHour < 9) {
    return "Starting the morning";
  } else if (currentHour >= 17 && currentHour < 20) {
    return "Ending the day";
  } else if (currentHour >= 20 || currentHour < 5) {
    if (currentHour >= 22 || currentHour < 2) {
      return "Overnight window";
    }
    return "Night stretch";
  }
  
  return "Awake";
};

export const CurrentMomentArc = ({
  activities,
  babyName,
  ongoingNap,
  nightSleepStartHour,
  nightSleepEndHour
}: CurrentMomentArcProps) => {
  const now = new Date();
  const currentHour = now.getHours();
  const isDay = isDaytime(currentHour, nightSleepStartHour, nightSleepEndHour);
  
  const currentState = getCurrentState(activities, ongoingNap || null, nightSleepStartHour, nightSleepEndHour);
  
  return (
    <div className="px-4 pb-0">
      <div className="relative w-full flex flex-col items-center pt-0 pb-2">
        {/* Arc SVG */}
        <svg
          viewBox="0 0 200 110"
          className="w-full"
          style={{ maxWidth: '340px' }}
        >
          <defs>
            {/* Daytime gradient: light to dark (left to right) with fading ends */}
            <linearGradient id="dayGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(var(--pp-lavender))" stopOpacity="0" />
              <stop offset="10%" stopColor="hsl(var(--pp-lavender))" stopOpacity="0.5" />
              <stop offset="25%" stopColor="hsl(var(--pp-lavender))" stopOpacity="0.7" />
              <stop offset="50%" stopColor="hsl(var(--pp-lavender))" stopOpacity="0.85" />
              <stop offset="75%" stopColor="hsl(var(--pp-lavender))" stopOpacity="1" />
              <stop offset="90%" stopColor="hsl(var(--pp-lavender))" stopOpacity="0.9" />
              <stop offset="100%" stopColor="hsl(var(--pp-lavender))" stopOpacity="0" />
            </linearGradient>
            
            {/* Nighttime gradient: dark to light (left to right) with fading ends - twilight feel */}
            <linearGradient id="nightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(220 20% 30%)" stopOpacity="0" />
              <stop offset="10%" stopColor="hsl(220 20% 30%)" stopOpacity="0.8" />
              <stop offset="25%" stopColor="hsl(220 20% 30%)" stopOpacity="0.9" />
              <stop offset="50%" stopColor="hsl(220 20% 30%)" stopOpacity="0.85" />
              <stop offset="75%" stopColor="hsl(220 25% 40%)" stopOpacity="0.7" />
              <stop offset="90%" stopColor="hsl(220 25% 40%)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(220 25% 40%)" stopOpacity="0" />
            </linearGradient>
          </defs>
          
          {/* True semicircle arc with thicker stroke (70% thicker) */}
          <path
            d={isDay 
              ? "M 20 100 A 80 80 0 0 1 180 100"  // Daytime: semicircle arc upward
              : "M 20 10 A 80 80 0 0 0 180 10"     // Nighttime: inverted semicircle arc downward
            }
            fill="none"
            stroke={`url(#${isDay ? 'day' : 'night'}Gradient)`}
            strokeWidth="8.5"
            strokeLinecap="round"
          />
        </svg>
        
        {/* State text positioned inside the arc - bigger and bolder */}
        <p className="absolute text-base font-bold text-foreground tracking-wide text-center" 
           style={{ 
             top: isDay ? '58%' : '32%',
             left: '50%',
             transform: 'translateX(-50%)'
           }}>
          {currentState}
        </p>
      </div>
    </div>
  );
};
