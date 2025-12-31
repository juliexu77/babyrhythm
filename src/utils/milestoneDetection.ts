import { Activity } from "@/components/ActivityCard";

export interface Milestone {
  id: string;
  type: 'sleep' | 'nap' | 'wakeWindow' | 'feed' | 'general';
  title: string;
  emoji: string;
}

// Parse time string to minutes for duration calculation
const parseTimeToMinutes = (timeStr: string): number => {
  const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return 0;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  return hours * 60 + minutes;
};

// Calculate sleep duration in hours
const calculateSleepDuration = (startTime: string, endTime: string): number => {
  const startMinutes = parseTimeToMinutes(startTime);
  let endMinutes = parseTimeToMinutes(endTime);
  
  // Handle overnight
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }
  
  return (endMinutes - startMinutes) / 60;
};

// Calculate wake window duration in hours (time between last sleep end and current activity)
const calculateWakeWindow = (activity: Activity, allActivities: Activity[]): number | null => {
  const activityTime = new Date(activity.loggedAt || '').getTime();
  
  // Find the most recent completed sleep before this activity
  const previousSleeps = allActivities
    .filter(a => 
      a.type === 'nap' && 
      a.details?.endTime &&
      new Date(a.loggedAt || '').getTime() < activityTime
    )
    .sort((a, b) => new Date(b.loggedAt || '').getTime() - new Date(a.loggedAt || '').getTime());
  
  if (previousSleeps.length === 0) return null;
  
  const lastSleep = previousSleeps[0];
  const lastSleepDate = new Date(lastSleep.loggedAt || '');
  const endTime = lastSleep.details?.endTime;
  
  if (!endTime) return null;
  
  // Parse end time and combine with date
  const match = endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (!match) return null;
  
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const period = match[3].toUpperCase();
  
  if (period === 'PM' && hours !== 12) hours += 12;
  if (period === 'AM' && hours === 12) hours = 0;
  
  const sleepEndTime = new Date(lastSleepDate);
  sleepEndTime.setHours(hours, minutes, 0, 0);
  
  // Calculate duration in hours
  const durationMs = activityTime - sleepEndTime.getTime();
  return durationMs / (1000 * 60 * 60);
};

// Get all completed naps before a given activity
const getCompletedNapsBefore = (activity: Activity, allActivities: Activity[]): Activity[] => {
  const activityTime = new Date(activity.loggedAt || '').getTime();
  return allActivities.filter(a => 
    a.type === 'nap' && 
    a.details?.startTime && 
    a.details?.endTime &&
    new Date(a.loggedAt || '').getTime() < activityTime
  );
};

// Get all completed night sleeps before a given activity
const getNightSleepsBefore = (activity: Activity, allActivities: Activity[]): Activity[] => {
  const activityTime = new Date(activity.loggedAt || '').getTime();
  return allActivities.filter(a => 
    a.type === 'nap' && 
    a.details?.isNightSleep &&
    a.details?.startTime && 
    a.details?.endTime &&
    new Date(a.loggedAt || '').getTime() < activityTime
  );
};

// Detect milestones for a given activity
export const detectMilestones = (
  activity: Activity, 
  allActivities: Activity[]
): Milestone[] => {
  const milestones: Milestone[] = [];
  
  // Only check completed naps/sleeps
  if (activity.type === 'nap' && activity.details?.startTime && activity.details?.endTime) {
    const duration = calculateSleepDuration(activity.details.startTime, activity.details.endTime);
    const isNightSleep = activity.details?.isNightSleep;
    
    if (isNightSleep) {
      // Night sleep milestones
      const previousNightSleeps = getNightSleepsBefore(activity, allActivities);
      const previousDurations = previousNightSleeps.map(n => 
        calculateSleepDuration(n.details.startTime!, n.details.endTime!)
      );
      const maxPrevious = previousDurations.length > 0 ? Math.max(...previousDurations) : 0;
      
      // Longest night sleep ever
      if (duration > maxPrevious && previousDurations.length >= 3) {
        milestones.push({
          id: 'longest-night-sleep',
          type: 'sleep',
          title: 'Longest night sleep!',
          emoji: '🏆'
        });
      }
      
      // First night sleep over thresholds
      const thresholds = [
        { hours: 12, title: 'First 12+ hour night!' },
        { hours: 10, title: 'First 10+ hour night!' },
        { hours: 8, title: 'First 8+ hour night!' },
        { hours: 6, title: 'First 6+ hour night!' },
      ];
      
      for (const threshold of thresholds) {
        if (duration >= threshold.hours) {
          const previousOver = previousDurations.filter(d => d >= threshold.hours);
          if (previousOver.length === 0) {
            milestones.push({
              id: `first-night-over-${threshold.hours}`,
              type: 'sleep',
              title: threshold.title,
              emoji: '🌙'
            });
            break; // Only show highest threshold
          }
        }
      }
    } else {
      // Daytime nap milestones
      const previousNaps = getCompletedNapsBefore(activity, allActivities)
        .filter(n => !n.details?.isNightSleep);
      const previousDurations = previousNaps.map(n => 
        calculateSleepDuration(n.details.startTime!, n.details.endTime!)
      );
      const maxPrevious = previousDurations.length > 0 ? Math.max(...previousDurations) : 0;
      
      // Longest nap ever
      if (duration > maxPrevious && previousDurations.length >= 5) {
        milestones.push({
          id: 'longest-nap',
          type: 'nap',
          title: 'Longest nap ever!',
          emoji: '🏆'
        });
      }
      
      // First nap over thresholds
      const napThresholds = [
        { hours: 3, title: 'First 3+ hour nap!' },
        { hours: 2, title: 'First 2+ hour nap!' },
        { hours: 1.5, title: 'First 90+ minute nap!' },
        { hours: 1, title: 'First 1+ hour nap!' },
      ];
      
      for (const threshold of napThresholds) {
        if (duration >= threshold.hours) {
          const previousOver = previousDurations.filter(d => d >= threshold.hours);
          if (previousOver.length === 0) {
            milestones.push({
              id: `first-nap-over-${threshold.hours}`,
              type: 'nap',
              title: threshold.title,
              emoji: '😴'
            });
            break;
          }
        }
      }
    }
  }
  
  // First solids milestone
  if (activity.type === 'solids') {
    const previousSolids = allActivities.filter(a => 
      a.type === 'solids' && 
      new Date(a.loggedAt || '').getTime() < new Date(activity.loggedAt || '').getTime()
    );
    
    if (previousSolids.length === 0) {
      milestones.push({
        id: 'first-solids',
        type: 'feed',
        title: 'First solid food!',
        emoji: '🥄'
      });
    }
    
    // First allergen introduction
    const allergens = activity.details?.allergens as string[] || [];
    if (allergens.length > 0) {
      const previousAllergens = new Set<string>();
      previousSolids.forEach(s => {
        (s.details?.allergens as string[] || []).forEach(a => previousAllergens.add(a));
      });
      
      const newAllergens = allergens.filter(a => !previousAllergens.has(a));
      if (newAllergens.length > 0) {
        milestones.push({
          id: `first-allergen-${newAllergens[0]}`,
          type: 'feed',
          title: `First ${newAllergens[0]} introduction!`,
          emoji: '🎯'
        });
      }
    }
  }
  
  // Feed volume milestones
  if (activity.type === 'feed' && activity.details?.quantity) {
    const quantity = parseFloat(activity.details.quantity);
    const unit = activity.details.unit || 'oz';
    const ozQuantity = unit === 'ml' ? quantity / 29.5735 : quantity;
    
    const previousFeeds = allActivities.filter(a => 
      a.type === 'feed' && 
      a.details?.quantity &&
      new Date(a.loggedAt || '').getTime() < new Date(activity.loggedAt || '').getTime()
    );
    
    const previousOz = previousFeeds.map(f => {
      const q = parseFloat(f.details.quantity!);
      const u = f.details.unit || 'oz';
      return u === 'ml' ? q / 29.5735 : q;
    });
    
    const maxPrevious = previousOz.length > 0 ? Math.max(...previousOz) : 0;
    
    // Largest feed ever (after at least 10 feeds)
    if (ozQuantity > maxPrevious && previousOz.length >= 10 && ozQuantity >= 4) {
      milestones.push({
        id: 'largest-feed',
        type: 'feed',
        title: 'Largest feed ever!',
        emoji: '🍼'
      });
    }
    
    // Feed count milestones
    const feedCount = previousFeeds.length + 1;
    const feedMilestones = [1000, 500, 250, 100, 50];
    for (const milestone of feedMilestones) {
      if (feedCount === milestone) {
        milestones.push({
          id: `feed-count-${milestone}`,
          type: 'general',
          title: `${milestone}th feed logged!`,
          emoji: '🎉'
        });
        break;
      }
    }
  }
  
  // Wake window milestones - detect when starting a nap after a long wake window
  if (activity.type === 'nap' && activity.details?.startTime) {
    const wakeWindow = calculateWakeWindow(activity, allActivities);
    
    if (wakeWindow !== null && wakeWindow > 0) {
      // Calculate all previous wake windows
      const previousNaps = allActivities.filter(a => 
        a.type === 'nap' && 
        a.details?.startTime &&
        new Date(a.loggedAt || '').getTime() < new Date(activity.loggedAt || '').getTime()
      );
      
      const previousWakeWindows = previousNaps
        .map(nap => calculateWakeWindow(nap, allActivities))
        .filter((ww): ww is number => ww !== null && ww > 0);
      
      // Wake window thresholds (in hours)
      const wakeWindowThresholds = [
        { hours: 5, title: 'First 5+ hour wake window!' },
        { hours: 4, title: 'First 4+ hour wake window!' },
        { hours: 3, title: 'First 3+ hour wake window!' },
        { hours: 2, title: 'First 2+ hour wake window!' },
      ];
      
      for (const threshold of wakeWindowThresholds) {
        if (wakeWindow >= threshold.hours) {
          const previousOver = previousWakeWindows.filter(ww => ww >= threshold.hours);
          if (previousOver.length === 0) {
            milestones.push({
              id: `first-wake-window-over-${threshold.hours}`,
              type: 'wakeWindow',
              title: threshold.title,
              emoji: '⏰'
            });
            break; // Only show highest threshold
          }
        }
      }
      
      // Longest wake window ever (after at least 7 data points)
      if (previousWakeWindows.length >= 7) {
        const maxPreviousWW = Math.max(...previousWakeWindows);
        if (wakeWindow > maxPreviousWW && wakeWindow >= 2) {
          milestones.push({
            id: 'longest-wake-window',
            type: 'wakeWindow',
            title: 'Longest wake window!',
            emoji: '🏆'
          });
        }
      }
    }
  }
  
  // Activity count milestones
  const activityCount = allActivities.filter(a => 
    new Date(a.loggedAt || '').getTime() <= new Date(activity.loggedAt || '').getTime()
  ).length;
  
  const countMilestones = [1000, 500, 250, 100];
  for (const milestone of countMilestones) {
    if (activityCount === milestone) {
      milestones.push({
        id: `activity-count-${milestone}`,
        type: 'general',
        title: `${milestone} activities tracked!`,
        emoji: '🌟'
      });
      break;
    }
  }
  
  return milestones;
};
