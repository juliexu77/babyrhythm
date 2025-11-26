import { Activity } from "@/components/ActivityCard";
import { differenceInMinutes } from "date-fns";
import { getActivityEventDate } from "@/utils/activityDate";
import { Sun, Moon } from "lucide-react";
import { getWakeWindowForAge, calculateAgeInWeeks } from "@/utils/ageAppropriateBaselines";

interface CurrentMomentArcProps {
  activities: Activity[];
  babyName?: string;
  ongoingNap?: Activity | null;
  nightSleepStartHour: number;
  nightSleepEndHour: number;
  babyBirthday?: string;
}

// Get the most recent meaningful activity
const getMostRecentActivity = (activities: Activity[]): Activity | null => {
  if (activities.length === 0) return null;
  
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
    return currentHour >= nightSleepEndHour || currentHour < nightSleepStartHour;
  } else {
    return currentHour >= nightSleepEndHour && currentHour < nightSleepStartHour;
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
  
  if (ongoingNap) {
    const startTime = ongoingNap.details?.startTime;
    if (startTime) {
      const [hours, minutes] = startTime.split(':').map(Number);
      const startDate = new Date(now);
      startDate.setHours(hours, minutes, 0, 0);
      const napMinutes = differenceInMinutes(now, startDate);
      
      const isInNightWindow = !isDay;
      
      if (napMinutes < 5) {
        if (isInNightWindow) {
          return "Down for the night";
        }
        return "Just fell asleep";
      }
      
      if (isInNightWindow) {
        return "Soundly asleep";
      }
      
      const todayNaps = activities.filter(a => {
        const activityDate = new Date(a.loggedAt || '');
        const today = new Date();
        return a.type === 'nap' && 
          activityDate.toDateString() === today.toDateString() &&
          a.details?.endTime;
      });
      
      const isFirstNap = todayNaps.length === 0;
      
      if (isFirstNap) {
        return "First nap";
      }
      
      if (napMinutes < 20) {
        return "Quick snooze";
      } else if (napMinutes > 90) {
        return "Long snooze";
      }
      
      // Cat nap: only between 4:30 PM and 6:30 PM
      const nowMinutes = now.getMinutes();
      const currentTimeMinutes = currentHour * 60 + nowMinutes;
      const catNapStart = 16 * 60 + 30; // 4:30 PM
      const catNapEnd = 18 * 60 + 30; // 6:30 PM
      
      if (currentTimeMinutes >= catNapStart && currentTimeMinutes < catNapEnd) {
        return "Cat nap";
      } else if (currentHour >= 12 && currentHour < 17) {
        return "Afternoon nap";
      } else {
        return "Nap in progress";
      }
    }
    return "Nap in progress";
  }
  
  const recentActivity = getMostRecentActivity(activities);
  if (!recentActivity) {
    if (currentHour >= 5 && currentHour < 10) {
      return "Starting the morning";
    } else if (currentHour >= 19 || currentHour < 5) {
      return "Night stretch";
    }
    return "Awake";
  }
  
  const activityTime = new Date(recentActivity.loggedAt || '');
  const minutesSince = differenceInMinutes(now, activityTime);
  
  if (recentActivity.type === 'nap') {
    const endTime = recentActivity.details?.endTime;
    const startTime = recentActivity.details?.startTime;
    const isNightTime = currentHour >= 19 || currentHour < 5;
    
    if (endTime) {
      if (startTime) {
        const [startHours, startMinutes] = startTime.split(':').map(Number);
        const [endHours, endMinutes] = endTime.split(':').map(Number);
        const startDate = new Date(now);
        startDate.setHours(startHours, startMinutes, 0, 0);
        const endDate = new Date(now);
        endDate.setHours(endHours, endMinutes, 0, 0);
        const napDuration = differenceInMinutes(endDate, startDate);
        
        if (minutesSince < 10) {
          if (isNightTime) {
            if (minutesSince < 3) {
              return "Just woke up";
            } else if (napDuration < 30) {
              return "Quick wake-up";
            } else {
              return "Little midnight moment";
            }
          }
          
          if (napDuration < 20) {
            return "Just woke up from quick snooze";
          } else if (napDuration > 90) {
            return "Just woke up from long snooze";
          }
          return "Just woke up";
        }
      }
      
      if (minutesSince < 10) {
        if (isNightTime) {
          return "Late-night wake";
        }
        return "Just woke up";
      } else if (minutesSince < 30) {
        return "Nap just ended";
      }
    } else if (!ongoingNap) {
      if (minutesSince < 10) {
        return "Just woke up";
      }
    }
  }
  
  if (recentActivity.type === 'feed') {
    const quantity = recentActivity.details?.quantity;
    const unit = recentActivity.details?.unit;
    const minutesLeft = recentActivity.details?.minutesLeft;
    const minutesRight = recentActivity.details?.minutesRight;
    const isNightTime = currentHour >= 19 || currentHour < 5;
    
    const todayFeeds = activities.filter(a => {
      const activityDate = new Date(a.loggedAt || '');
      const today = new Date();
      return a.type === 'feed' && 
        activityDate.toDateString() === today.toDateString();
    }).length;
    
    if (minutesSince < 10) {
      if (isNightTime) {
        if (minutesSince < 3) {
          return "Just had a night feed";
        } else if (minutesSince < 6) {
          return "Night feed wrapped up";
        } else {
          return "Topped up for the night";
        }
      }
      
      if (todayFeeds === 3) {
        return "Third feed today! 🎉";
      } else if (todayFeeds === 5) {
        return "Fifth feed today! 🌟";
      }
      
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
  
  if (recentActivity.type === 'diaper') {
    if (minutesSince < 10) {
      const diaperType = recentActivity.details?.diaperType;
      if (diaperType === 'poopy' || diaperType === 'both') {
        return "Just pooped";
      }
      return "Fresh diaper";
    }
  }
  
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
    
    if (!isNaN(awakeMinutes) && awakeMinutes >= 0) {
      if (awakeMinutes < 15) {
        return "Just started awake time";
      } else if (awakeMinutes > 150) {
        return `Long stretch awake · ${getDurationString(awakeMinutes)}`;
      } else if (awakeMinutes > 120) {
        return "Getting sleepy";
      } else if (awakeMinutes > 60) {
        return `Awake · ${getDurationString(awakeMinutes)}`;
      }
      return `Awake · ${getDurationString(awakeMinutes)}`;
    }
  }
  
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const nightSleepStartMinute = 0;
  const bedtimeMinutes = nightSleepStartHour * 60 + nightSleepStartMinute;
  let minutesUntilBedtime = bedtimeMinutes - currentMinutes;
  
  if (minutesUntilBedtime < 0) {
    minutesUntilBedtime += 24 * 60;
  }
  
  if (minutesUntilBedtime > 0 && minutesUntilBedtime <= 60) {
    return "Bedtime coming soon";
  }
  
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
  nightSleepEndHour,
  babyBirthday
}: CurrentMomentArcProps) => {
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinutes = now.getMinutes();
  const isDay = isDaytime(currentHour, nightSleepStartHour, nightSleepEndHour);
  
  const currentState = getCurrentState(activities, ongoingNap || null, nightSleepStartHour, nightSleepEndHour);
  
  // NEW LOGIC: Calculate arc position based on wake window battery
  const calculateArcPosition = (): number => {
    // If baby is asleep (nap in progress), track nap progress
    if (ongoingNap?.details?.startTime) {
      const [hours, minutes] = ongoingNap.details.startTime.split(':').map(Number);
      const startDate = new Date(now);
      startDate.setHours(hours, minutes, 0, 0);
      const napMinutes = differenceInMinutes(now, startDate);
      
      // Target nap length: 1.5 hours for naps, use it as the recommended window
      const targetNapMinutes = 90;
      const progress = napMinutes / targetNapMinutes;
      
      // Clamp between 0 and 1.3 (allow slight overfill)
      return Math.min(Math.max(progress, 0), 1.3);
    }
    
    // If baby is awake, track wake window battery
    // Find the last wake event (most recent nap end time)
    const lastSleep = activities
      .filter(a => a.type === 'nap' && a.details?.endTime)
      .sort((a, b) => {
        const aTime = new Date(a.loggedAt || '').getTime();
        const bTime = new Date(b.loggedAt || '').getTime();
        return bTime - aTime;
      })[0];
    
    if (lastSleep?.details?.endTime) {
      const [hours, minutes] = lastSleep.details.endTime.split(':').map(Number);
      const wakeDate = getActivityEventDate(lastSleep);
      wakeDate.setHours(hours, minutes, 0, 0);
      const minutesElapsed = differenceInMinutes(now, wakeDate);
      
      // Get recommended wake window based on baby's age
      let recommendedWindow = 150; // Default: 2.5 hours
      if (babyBirthday) {
        const ageInWeeks = calculateAgeInWeeks(babyBirthday);
        const wakeWindowData = getWakeWindowForAge(ageInWeeks);
        if (wakeWindowData?.wakeWindows?.[0]) {
          // Parse wake window string like "2-2.5hrs" or "1.5-2hrs"
          const windowStr = wakeWindowData.wakeWindows[0];
          const match = windowStr.match(/([\d.]+)(?:-[\d.]+)?h/);
          if (match) {
            const hours = parseFloat(match[1]);
            recommendedWindow = hours * 60;
          }
        }
      }
      
      // Calculate progress (0 = just woke, 0.8 = sweet spot, 1.0 = end of window, >1.0 = overtired)
      const progress = minutesElapsed / recommendedWindow;
      
      // Clamp between 0 and 1.5 (allow overfill visualization)
      return Math.min(Math.max(progress, 0), 1.5);
    }
    
    // Fallback: no recent sleep data, assume mid-window
    return 0.5;
  };
  
  const arcPosition = calculateArcPosition();
  
  // Calculate icon position on the arc (0 = left, 1 = right)
  // Clamp position for display between 0 and 1 for icon placement
  const clampedPosition = Math.min(arcPosition, 1.0);
  const arcAngle = Math.PI * (1 - clampedPosition); // π to 0 (left to right)
  const arcRadius = 180;
  const centerX = 200;
  const centerY = 210;
  
  const iconX = centerX - Math.cos(arcAngle) * arcRadius;
  const iconY = centerY - Math.sin(arcAngle) * arcRadius;
  
  // Check if in twilight zone (sweet spot at 80% of wake window)
  const inTwilightZone = arcPosition >= 0.8 && arcPosition <= 1.0;
  
  // Check if overtired (beyond 100% of wake window)
  const isOvertired = arcPosition > 1.0;
  
  // Create path for trailing fill (from start to current position)
  const createTrailPath = (): string => {
    const startAngle = Math.PI; // Start at left (180°)
    // Clamp to max 1.0 for trail path (we'll render overtired separately)
    const trailPosition = Math.min(clampedPosition, 1.0);
    const currentAngle = Math.PI * (1 - trailPosition);
    
    // Create arc path
    const startX = centerX - Math.cos(startAngle) * arcRadius;
    const startY = centerY - Math.sin(startAngle) * arcRadius;
    
    const endX = centerX - Math.cos(currentAngle) * arcRadius;
    const endY = centerY - Math.sin(currentAngle) * arcRadius;
    
    const largeArcFlag = trailPosition > 0.5 ? 1 : 0;
    
    return `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArcFlag} 1 ${endX} ${endY} L ${centerX} ${centerY} Z`;
  };
  
  const trailPath = createTrailPath();
  
  return (
    <div className="px-0 pb-2 relative z-10">
      <div className="relative w-full flex flex-col items-center">
        <svg
          viewBox="0 0 400 240"
          className="w-full"
          style={{ maxWidth: '100%' }}
        >
          <defs>
            {/* Daytime gradients */}
            <linearGradient id="dayBaseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(30 40% 92%)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="hsl(15 45% 88%)" stopOpacity="0.35" />
            </linearGradient>
            
            <linearGradient id="dayTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(40 60% 88%)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(35 55% 85%)" stopOpacity="0.6" />
            </linearGradient>
            
            <linearGradient id="dayTwilightGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(25 50% 80%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(15 45% 75%)" stopOpacity="0.5" />
            </linearGradient>
            
            {/* Overtired gradient - red/orange warning */}
            <linearGradient id="overtiredGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(15 70% 65%)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="hsl(0 60% 60%)" stopOpacity="0.8" />
            </linearGradient>
            
            {/* Nighttime gradients */}
            <linearGradient id="nightBaseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(240 25% 75%)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(260 18% 80%)" stopOpacity="0.3" />
            </linearGradient>
            
            <linearGradient id="nightTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(245 30% 70%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(255 22% 75%)" stopOpacity="0.45" />
            </linearGradient>
            
            {/* Icon glows */}
            <radialGradient id="sunGlow">
              <stop offset="0%" stopColor="hsl(45 90% 60%)" stopOpacity="0.6" />
              <stop offset="100%" stopColor="hsl(45 90% 60%)" stopOpacity="0" />
            </radialGradient>
            
            <radialGradient id="moonGlow">
              <stop offset="0%" stopColor="hsl(240 40% 80%)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(240 40% 80%)" stopOpacity="0" />
            </radialGradient>
            
            {/* Overtired warning glow */}
            <radialGradient id="overtiredGlow">
              <stop offset="0%" stopColor="hsl(0 70% 60%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(0 70% 60%)" stopOpacity="0" />
            </radialGradient>
          </defs>
          
          {/* Base arc path */}
          <path
            d="M 20 210 A 180 180 0 0 1 380 210"
            fill="none"
            stroke={isDay ? "url(#dayBaseGradient)" : "url(#nightBaseGradient)"}
            strokeWidth="8"
            strokeLinecap="round"
          />
          
          {/* Twilight zone (sweet spot at 80-100%) */}
          {inTwilightZone && isDay && !isOvertired && (
            <path
              d="M 308 210 A 180 180 0 0 1 380 210"
              fill="none"
              stroke="url(#dayTwilightGradient)"
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}
          
          {/* Overtired zone (>100% of wake window) */}
          {isOvertired && isDay && (
            <path
              d="M 308 210 A 180 180 0 0 1 380 210"
              fill="none"
              stroke="url(#overtiredGradient)"
              strokeWidth="10"
              strokeLinecap="round"
            />
          )}
          
          {/* Trailing fill showing progress */}
          <path
            d={trailPath}
            fill={isOvertired ? "url(#overtiredGradient)" : (isDay ? "url(#dayTrailGradient)" : "url(#nightTrailGradient)")}
            opacity="0.8"
          />
          
          {/* Icon glow effect */}
          <circle
            cx={iconX}
            cy={iconY}
            r="24"
            fill={isOvertired ? "url(#overtiredGlow)" : (isDay ? "url(#sunGlow)" : "url(#moonGlow)")}
          />
          
          {/* Icon - Solid filled circle or moon */}
          <g transform={`translate(${iconX}, ${iconY})`}>
            {isDay ? (
              <circle
                r="10"
                fill={isOvertired ? "hsl(0 70% 55%)" : "hsl(45 85% 55%)"}
                style={{
                  filter: isOvertired 
                    ? 'drop-shadow(0 0 8px hsla(0, 70%, 60%, 0.6))' 
                    : 'drop-shadow(0 0 8px hsla(45, 90%, 60%, 0.5))'
                }}
              />
            ) : (
              <>
                <circle
                  r="12"
                  fill="hsl(var(--background))"
                  stroke="hsl(240 30% 75%)"
                  strokeWidth="2"
                />
                <Moon className="w-5 h-5" style={{ 
                  transform: 'translate(-10px, -10px)',
                  color: 'hsl(240 30% 75%)'
                }} />
              </>
            )}
          </g>
          
          {/* Zone indicator text */}
          {isOvertired && isDay && (
            <text
              x="340"
              y="225"
              textAnchor="middle"
              className="text-[9px] font-semibold"
              fill="hsl(0 70% 55%)"
            >
              Overtired
            </text>
          )}
          {inTwilightZone && isDay && !isOvertired && (
            <text
              x="340"
              y="225"
              textAnchor="middle"
              className="text-[9px] font-medium fill-muted-foreground"
            >
              Wind down
            </text>
          )}
        </svg>
        
        {/* State text positioned in center - use serif for editorial look */}
        <div className="absolute" style={{ top: '48%', transform: 'translateY(-50%)' }}>
          <p className="text-[26px] font-serif font-normal text-foreground tracking-tight text-center leading-tight" 
             style={{ fontVariationSettings: '"SOFT" 100' }}>
            {currentState}
          </p>
        </div>
      </div>
    </div>
  );
};
