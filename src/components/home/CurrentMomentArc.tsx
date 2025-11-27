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
  const isDay = isDaytime(currentHour, nightSleepStartHour, nightSleepEndHour);
  const currentState = getCurrentState(activities, ongoingNap || null, nightSleepStartHour, nightSleepEndHour);
  
  // 1. Calculate Progress (0.0 to 1.0+)
  const calculateArcPosition = (): number => {
    // NAP LOGIC
    if (ongoingNap?.details?.startTime) {
      const [hours, minutes] = ongoingNap.details.startTime.split(':').map(Number);
      const startDate = new Date(now);
      startDate.setHours(hours, minutes, 0, 0);
      const napMinutes = differenceInMinutes(now, startDate);
      const targetNapMinutes = 90; // 1.5 hour target
      // Clamp nap progress
      return Math.min(Math.max(napMinutes / targetNapMinutes, 0), 1.2);
    }
    
    // WAKE WINDOW LOGIC
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
      
      let recommendedWindow = 150; // Default 2.5h
      if (babyBirthday) {
        const ageInWeeks = calculateAgeInWeeks(babyBirthday);
        const wakeWindowData = getWakeWindowForAge(ageInWeeks);
        if (wakeWindowData?.wakeWindows?.[0]) {
          const windowStr = wakeWindowData.wakeWindows[0];
          const match = windowStr.match(/([\d.]+)(?:-[\d.]+)?h/);
          if (match) recommendedWindow = parseFloat(match[1]) * 60;
        }
      }
      return Math.min(Math.max(minutesElapsed / recommendedWindow, 0), 1.5);
    }
    
    return 0.25; // Default starting position if no data - visible on arc
  };
  
  const arcPosition = calculateArcPosition();
  const clampedPosition = Math.min(arcPosition, 1.0); // Stop movement at end of arc for icon

  // Debug logging
  console.log('🎯 CurrentMomentArc debug:', {
    arcPosition,
    clampedPosition,
    hasOngoingNap: !!ongoingNap,
    activitiesCount: activities.length,
    babyBirthday
  });

  // --- FIXED LAYOUT CONSTANTS ---
  // Widen the viewBox width to 500 (was 460) to add internal side padding
  const viewBoxWidth = 500;
  const viewBoxHeight = 200; // Further reduced for tighter spacing
  const centerX = 250; // Exact center of new width
  const centerY = 180; // Adjusted for reduced height
  const arcRadius = 180;

  // --- ARC RANGE: Cut bottom 10% (extended from 20%) ---
  // Start angle: 0.9 * PI (162°) - left side
  // End angle: 0.1 * PI (18°) - right side
  const startAngle = Math.PI * 0.9;
  const endAngle = Math.PI * 0.1;
  const angleRange = startAngle - endAngle; // 0.8 * PI (144°)

  // --- FIXED MATH (Left to Right on shortened arc) ---
  // Map position (0 to 1) to angle range (startAngle to endAngle)
  const arcAngle = startAngle - (clampedPosition * angleRange);

  // Calculate icon position on arc - MUST match arc path coordinates exactly
  const iconX = centerX + Math.cos(arcAngle) * arcRadius;
  const iconY = centerY - Math.sin(arcAngle) * arcRadius;
  
  console.log('🎯 Icon position:', {
    arcPosition: clampedPosition.toFixed(2),
    arcAngle: (arcAngle * 180 / Math.PI).toFixed(1) + '°',
    iconX: iconX.toFixed(1),
    iconY: iconY.toFixed(1),
    onArc: 'yes (constrained to arc path)'
  });
  
  const inTwilightZone = arcPosition >= 0.8 && arcPosition <= 1.0;
  const isOvertired = arcPosition > 1.0;
  
  // --- FIXED TRAIL PATH LOGIC (shortened arc) ---
  const createTrailPath = (): string => {
    // Start Point (Left side of shortened arc)
    const startX = centerX + Math.cos(startAngle) * arcRadius;
    const startY = centerY - Math.sin(startAngle) * arcRadius;
    
    // End Point (Current Icon Position on shortened arc)
    const currentAngle = startAngle - (Math.min(arcPosition, 1.0) * angleRange);
    const endX = centerX + Math.cos(currentAngle) * arcRadius;
    const endY = centerY - Math.sin(currentAngle) * arcRadius;
    
    // Use small arc flag (0) since 144° < 180°, sweep clockwise (1)
    return `M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 0 1 ${endX} ${endY}`;
  };
  
  const trailPath = createTrailPath();

  return (
    <div className="px-0 pb-0 relative z-10">
      <div className="relative w-full flex flex-col items-center">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full"
          style={{ maxWidth: '100%', overflow: 'visible' }}
        >
          <defs>
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
            <linearGradient id="overtiredGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(15 70% 65%)" stopOpacity="0.7" />
              <stop offset="100%" stopColor="hsl(0 60% 60%)" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="nightBaseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(240 25% 75%)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="hsl(260 18% 80%)" stopOpacity="0.3" />
            </linearGradient>
            <linearGradient id="nightTrailGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="hsl(245 30% 70%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(255 22% 75%)" stopOpacity="0.45" />
            </linearGradient>
            <radialGradient id="sunGlow">
              <stop offset="0%" stopColor="#FFD580" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#FFD580" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="moonGlow">
              <stop offset="0%" stopColor="hsl(240 40% 80%)" stopOpacity="0.5" />
              <stop offset="100%" stopColor="hsl(240 40% 80%)" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="overtiredGlow">
              <stop offset="0%" stopColor="hsl(0 70% 60%)" stopOpacity="0.4" />
              <stop offset="100%" stopColor="hsl(0 70% 60%)" stopOpacity="0" />
            </radialGradient>
          </defs>
          
          {/* Base Arc Background (shortened) */}
          <path
            d={`M ${centerX + Math.cos(startAngle) * arcRadius} ${centerY - Math.sin(startAngle) * arcRadius} A ${arcRadius} ${arcRadius} 0 0 1 ${centerX + Math.cos(endAngle) * arcRadius} ${centerY - Math.sin(endAngle) * arcRadius}`}
            fill="none"
            stroke={isDay ? "url(#dayBaseGradient)" : "url(#nightBaseGradient)"}
            strokeWidth="8"
            strokeLinecap="round"
          />
          
          {/* Twilight zone (sweet spot at 80-100%) */}
          {inTwilightZone && isDay && !isOvertired && (
            <path
              d={`M ${centerX + Math.cos(startAngle - 0.8 * angleRange) * arcRadius} ${centerY - Math.sin(startAngle - 0.8 * angleRange) * arcRadius} A ${arcRadius} ${arcRadius} 0 0 1 ${centerX + Math.cos(endAngle) * arcRadius} ${centerY - Math.sin(endAngle) * arcRadius}`}
              fill="none"
              stroke="url(#dayTwilightGradient)"
              strokeWidth="8"
              strokeLinecap="round"
            />
          )}
          
          {/* Overtired zone (>100% of wake window) */}
          {isOvertired && isDay && (
            <path
              d={`M ${centerX + Math.cos(startAngle - 0.8 * angleRange) * arcRadius} ${centerY - Math.sin(startAngle - 0.8 * angleRange) * arcRadius} A ${arcRadius} ${arcRadius} 0 0 1 ${centerX + Math.cos(endAngle) * arcRadius} ${centerY - Math.sin(endAngle) * arcRadius}`}
              fill="none"
              stroke="url(#overtiredGradient)"
              strokeWidth="10"
              strokeLinecap="round"
            />
          )}
          
          {/* Trail Fill (Progress) */}
          <path
            d={trailPath}
            fill="none"
            stroke={isOvertired ? "url(#overtiredGradient)" : (isDay ? "url(#dayTrailGradient)" : "url(#nightTrailGradient)")}
            strokeWidth="8"
            strokeLinecap="round"
            opacity="0.8"
          />
          
          {/* Icon Glow */}
          <circle
            cx={iconX}
            cy={iconY}
            r="24"
            fill={isOvertired ? "url(#overtiredGlow)" : (isDay ? "url(#sunGlow)" : "url(#moonGlow)")}
          />
          
          {/* The Icon Itself */}
          <g transform={`translate(${iconX}, ${iconY})`}>
            {isDay ? (
              <circle
                r="10"
                fill={isOvertired ? "hsl(0 70% 55%)" : "#FFB347"}
                style={{
                  filter: isOvertired 
                    ? 'drop-shadow(0 0 8px hsla(0, 70%, 60%, 0.6))' 
                    : 'drop-shadow(0 0 10px rgba(255, 213, 128, 0.6))'
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
              x={centerX + Math.cos(endAngle) * arcRadius - 40}
              y={centerY - Math.sin(endAngle) * arcRadius + 25}
              textAnchor="middle"
              className="text-[9px] font-semibold"
              fill="hsl(0 70% 55%)"
            >
              Overtired
            </text>
          )}
          {inTwilightZone && isDay && !isOvertired && (
            <text
              x={centerX + Math.cos(endAngle) * arcRadius - 40}
              y={centerY - Math.sin(endAngle) * arcRadius + 25}
              textAnchor="middle"
              className="text-[9px] font-medium fill-muted-foreground"
            >
              Wind down
            </text>
          )}
        </svg>
        
        {/* State Text - Centered Absolute */}
        <div className="absolute top-[60%] left-0 right-0 px-8 text-center transform -translate-y-1/2">
          <p className="text-[20px] font-serif font-normal text-foreground tracking-tight text-center leading-snug max-w-[280px] mx-auto" 
             style={{ fontVariationSettings: '"SOFT" 100' }}>
            {currentState}
          </p>
        </div>
      </div>
    </div>
  );
};
