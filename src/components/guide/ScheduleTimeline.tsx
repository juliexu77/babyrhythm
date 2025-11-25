import { Moon, Sun, Milk, Bed, Clock, ChevronDown, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useMemo, useEffect, useRef } from "react";
import { checkDSTTransition } from "@/utils/dstDetection";

interface ScheduleEvent {
  time: string;
  type: 'wake' | 'nap' | 'feed' | 'bed';
  duration?: string;
  notes?: string;
  confidence?: 'high' | 'medium' | 'low';
  reasoning?: string;
  actualTime?: string;
  actualDuration?: string;
}

interface PredictedSchedule {
  events: ScheduleEvent[];
  confidence: 'high' | 'medium' | 'low';
  basedOn: string;
  accuracyScore?: number;
  lastUpdated?: string;
  adjustmentNote?: string;
}

interface ScheduleTimelineProps {
  schedule: PredictedSchedule;
  babyName: string;
  onRecalculate?: () => void;
  isTransitioning?: boolean;
  transitionNapCounts?: { current: number; transitioning: number };
  showAlternate?: boolean;
  onToggleAlternate?: (desiredNapCount: number) => void;
  mainScheduleNapCount?: number;
  alternateScheduleNapCount?: number;
  isAdjusting?: boolean;
  adjustmentContext?: string;
  transitionWindow?: { from: number; to: number; label: string } | null;
  todayActualNapCount?: number;
}

interface GroupedActivity {
  id: string;
  type: 'morning' | 'nap-block' | 'bedtime';
  time: string;
  endTime?: string;
  napDuration?: string;
  feedTime?: string;
  napNumber?: number;
  title: string;
}

export const ScheduleTimeline = ({ 
  schedule, 
  babyName,
  onRecalculate,
  isTransitioning,
  transitionNapCounts,
  showAlternate,
  onToggleAlternate,
  mainScheduleNapCount,
  alternateScheduleNapCount,
  isAdjusting,
  adjustmentContext,
  transitionWindow,
  todayActualNapCount
}: ScheduleTimelineProps) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);
  const [animateWakeTime, setAnimateWakeTime] = useState(false);
  const previousWakeTimeRef = useRef<string | null>(null);
  
  // Track wake time changes and trigger animation (only for morning wake)
  useEffect(() => {
    const wakeEvent = schedule.events.find(e => e.type === 'wake');
    if (wakeEvent?.time) {
      // Check if this is a morning wake event (reasoning indicates it's actual logged time)
      const isMorningWake = wakeEvent.reasoning?.includes('Actual logged wake time');
      
      if (isMorningWake && previousWakeTimeRef.current && previousWakeTimeRef.current !== wakeEvent.time) {
        // Morning wake time changed - trigger animation
        setAnimateWakeTime(true);
        setTimeout(() => setAnimateWakeTime(false), 2000); // Animation lasts 2 seconds
      }
      previousWakeTimeRef.current = wakeEvent.time;
    }
  }, [schedule.events]);
  
  // Check for DST transition
  const dstInfo = useMemo(() => {
    const result = checkDSTTransition();
    console.log('📅 ScheduleTimeline - DST Info:', result);
    return result;
  }, []);

  // Get current time for progress indicator
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  
  const parseTime = (timeStr: string): number => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };
  
  // Format time - round all times to nearest 10 minutes EXCEPT wake times (12-hour display)
  const formatTime = (timeStr: string, eventType?: string): string => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return timeStr;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    // For wake events, DO NOT round - show exact logged time
    if (eventType === 'wake') {
      // Normalize hours into 12-hour format for display
      let normalized24h = hours;
      if (period === 'AM') {
        if (hours === 12) normalized24h = 0; // 12:xx AM => 00:xx
      } else { // PM
        if (hours !== 12) normalized24h = hours + 12; // 1-11 PM => 13-23
      }
      const displayHour = normalized24h === 0 ? 12 : (normalized24h > 12 ? normalized24h - 12 : normalized24h);
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    
    // For all other times, round to nearest 10 minutes
    const roundedMinutes = Math.round(minutes / 10) * 10;
    if (roundedMinutes === 60) {
      hours += 1;
    }
    const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;

    // Normalize hours into 12-hour format for display
    let normalized24h = hours;
    if (period === 'AM') {
      if (hours === 12) normalized24h = 0; // 12:xx AM => 00:xx
    } else { // PM
      if (hours !== 12) normalized24h = hours + 12; // 1-11 PM => 13-23
    }
    const displayHour = normalized24h === 0 ? 12 : (normalized24h > 12 ? normalized24h - 12 : normalized24h);
    
    return `${displayHour}:${finalMinutes.toString().padStart(2, '0')} ${period}`;
  };

  // Calculate end time and recalculate duration to match rounded times
  const calculateEndTimeAndDuration = (startTime: string, duration: string): { endTime: string; adjustedDuration: string } => {
    console.log('🔍 calculateEndTimeAndDuration called:', { startTime, duration });
    
    // Parse the original start time (unrounded)
    const startMinutes = parseTime(startTime);
    console.log('  startMinutes:', startMinutes);
    
    // Round start time to nearest 10 minutes
    const roundedStartMinutes = Math.round(startMinutes / 10) * 10;
    console.log('  roundedStartMinutes:', roundedStartMinutes);
    
    // Parse duration safely
    const m = duration.trim().match(/^(?:(\d+)\s*h)?\s*(?:(\d+)\s*m)?$/i);
    if (!m) {
      console.log('  ❌ Duration match failed');
      return { endTime: startTime, adjustedDuration: duration };
    }
    
    const hoursPart = m[1] ? parseInt(m[1], 10) : 0;
    const minutesPart = m[2] ? parseInt(m[2], 10) : 0;
    let totalDurationMinutes = hoursPart * 60 + minutesPart;
    
    // Sanity clamp naps between 15 and 240 minutes
    if (totalDurationMinutes < 15) totalDurationMinutes = 15;
    if (totalDurationMinutes > 240) totalDurationMinutes = 240;
    console.log('  duration parsed:', { hoursPart, minutesPart, totalDurationMinutes });
    
    // Calculate end time from rounded start + duration
    const rawEndMinutes = roundedStartMinutes + totalDurationMinutes;
    console.log('  rawEndMinutes:', rawEndMinutes);
    
    // Round end time to nearest 10 minutes
    const roundedEndMinutes = Math.round(rawEndMinutes / 10) * 10;
    console.log('  roundedEndMinutes:', roundedEndMinutes);
    
    // Calculate the actual duration based on rounded times
    const actualDurationMinutes = roundedEndMinutes - roundedStartMinutes;
    console.log('  actualDurationMinutes:', actualDurationMinutes);
    
    // Format end time
    const endHours = Math.floor(roundedEndMinutes / 60) % 24;
    const endMins = roundedEndMinutes % 60;
    const period = endHours >= 12 ? 'PM' : 'AM';
    const displayHours = endHours > 12 ? endHours - 12 : (endHours === 0 ? 12 : endHours);
    const endTime = `${displayHours}:${endMins.toString().padStart(2, '0')} ${period}`;
    
    // Format adjusted duration
    const adjHours = Math.floor(actualDurationMinutes / 60);
    const adjMins = actualDurationMinutes % 60;
    let adjustedDuration = '';
    if (adjHours > 0) {
      adjustedDuration = `${adjHours}h ${adjMins}m`;
    } else {
      adjustedDuration = `${adjMins}m`;
    }
    
    console.log('  ✅ result:', { endTime, adjustedDuration, adjHours, adjMins });
    return { endTime, adjustedDuration };
  };

  // Get time block for an activity
  const getTimeBlock = (timeStr: string): 'morning' | 'midday' | 'afternoon' | 'evening' => {
    const minutes = parseTime(timeStr);
    const hours = minutes / 60;
    
    if (hours >= 6 && hours < 11) return 'morning';
    if (hours >= 11 && hours < 14) return 'midday';
    if (hours >= 14 && hours < 18) return 'afternoon';
    return 'evening';
  };

  const toggleExpanded = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  const handleEventClick = (eventId: string) => {
    setSelectedEvent(prev => prev === eventId ? null : eventId);
  };

  // Get confidence color and indicator
  const getConfidenceIndicator = (confidence?: 'high' | 'medium' | 'low') => {
    switch (confidence) {
      case 'high':
        return { color: 'bg-green-500', dot: '●', label: 'High confidence' };
      case 'medium':
        return { color: 'bg-amber-500', dot: '●', label: 'Medium confidence' };
      case 'low':
        return { color: 'bg-gray-400', dot: '●', label: 'Low confidence' };
      default:
        return { color: 'bg-primary', dot: '●', label: 'Predicted' };
    }
  };

  // Group activities - no feeds to group anymore
  const groupedActivities: GroupedActivity[] = [];
  
  let napCounter = 0;
  for (let i = 0; i < schedule.events.length; i++) {
    const event = schedule.events[i];
    const nextEvent = schedule.events[i + 1];
    
    if (event.type === 'wake') {
      groupedActivities.push({
        id: `wake-${i}`,
        type: 'morning',
        time: event.time,
        title: 'Wake up'
      });
    }
    else if (event.type === 'nap') {
      // Always treat predicted/actual day naps as nap blocks; bedtime comes from explicit 'bed' event
      napCounter++;
      // Calculate properly rounded end time and adjusted duration
      const { adjustedDuration } = calculateEndTimeAndDuration(event.time, event.duration || '1h 30m');
      groupedActivities.push({
        id: `nap-${i}`,
        type: 'nap-block',
        time: event.time,
        napDuration: adjustedDuration,
        napNumber: napCounter,
        title: `Nap ${napCounter}`
      });
    }
    else if (event.type === 'bed') {
      groupedActivities.push({
        id: `bedtime-${i}`,
        type: 'bedtime',
        time: event.time,
        title: 'Bedtime'
      });
    }
  }
  
  const napCount = groupedActivities.filter(a => a.type === 'nap-block').length;
  const bedtimeActivity = [...groupedActivities].reverse().find(a => a.type === 'bedtime');
  
  // Only show accuracy if schedule's nap count matches today's actual naps
  const shouldShowAccuracy = todayActualNapCount === undefined || todayActualNapCount === 0 || todayActualNapCount === napCount;
  
  // Determine model state display
  const getModelStateDisplay = () => {
    if (!shouldShowAccuracy || schedule.accuracyScore === undefined || schedule.accuracyScore === 0) {
      return null;
    }
    
    return {
      text: `${schedule.accuracyScore}% accurate`,
      variant: 'outline' as const,
      showTooltip: true
    };
  };

  const modelState = getModelStateDisplay();
  
  // Calculate day progress for countdown to bedtime
  const getDayProgress = () => {
    if (groupedActivities.length === 0) return { percent: 0, timeUntilBedtime: '', minutesUntilBedtime: 0 };
    
    const firstEventTime = parseTime(groupedActivities[0].time);
    const bedtimeActivity = [...groupedActivities].reverse().find(a => a.type === 'bedtime');
    if (!bedtimeActivity) return { percent: 0, timeUntilBedtime: '', minutesUntilBedtime: 0 };
    const lastEventTime = parseTime(bedtimeActivity.endTime || bedtimeActivity.time);
    
    const dayDuration = lastEventTime - firstEventTime;
    if (dayDuration <= 0) return { percent: 0, timeUntilBedtime: '', minutesUntilBedtime: 0 };
    
    const currentProgress = currentMinutes - firstEventTime;
    const progressPercent = Math.min(Math.max((currentProgress / dayDuration) * 100, 0), 100);
    
    // Calculate time until bedtime
    const minutesUntilBedtime = lastEventTime - currentMinutes;
    let timeUntilBedtime = '';
    if (minutesUntilBedtime > 0) {
      const hours = Math.floor(minutesUntilBedtime / 60);
      const mins = minutesUntilBedtime % 60;
      if (hours > 0) {
        timeUntilBedtime = `${hours}h ${mins}m until bedtime`;
      } else {
        timeUntilBedtime = `${mins}m until bedtime`;
      }
    }
    
    return { percent: progressPercent, timeUntilBedtime, minutesUntilBedtime };
  };
  
  const dayProgress = getDayProgress();
  
  // Helper to round time to nearest 10 minutes
  const roundToNearest10Min = (minutes: number): number => {
    return Math.round(minutes / 10) * 10;
  };

  // Helper to format minutes to time string
  const formatMinutesToTime = (totalMinutes: number): string => {
    const roundedMinutes = roundToNearest10Min(totalMinutes);
    const hours = Math.floor(roundedMinutes / 60) % 24;
    const mins = roundedMinutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours > 12 ? hours - 12 : (hours === 0 ? 12 : hours);
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };


  return (
    <div className="mx-2 space-y-4">
      {/* Day Progress Bar - Countdown to Bedtime - Only show when less than 3 hours away */}
      {groupedActivities.length > 0 && dayProgress.percent < 100 && dayProgress.timeUntilBedtime && dayProgress.minutesUntilBedtime < 180 && (
        <div className="space-y-2 p-3 bg-accent/20 rounded-lg border border-border/40">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Day Progress</span>
            <span className="text-primary font-semibold">
              {dayProgress.timeUntilBedtime}
            </span>
          </div>
          <div className="relative h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="absolute top-0 left-0 h-full bg-gradient-to-r from-primary/60 via-primary to-primary transition-all duration-500 ease-out"
              style={{ width: `${dayProgress.percent}%` }}
            />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted-foreground">
            <span>{Math.round(dayProgress.percent)}% complete</span>
            <span>You've got this! 💪</span>
          </div>
        </div>
      )}
      
      {/* Transition insight row - matching insights card style */}
      {transitionWindow && (
        <div className="flex items-center gap-2.5 px-5 py-2 bg-accent/30 rounded-3xl mb-3 border border-border">
          <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0"></span>
          <p className="text-xs text-primary font-medium">
            Transitioning between {transitionWindow.from} and {transitionWindow.to} naps
          </p>
        </div>
      )}
      
      {/* Transition toggle - unified button with two sides */}
      {isTransitioning && transitionNapCounts && onToggleAlternate && (
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex rounded-lg overflow-hidden border border-border">
            {(() => {
              const lowerCount = Math.min(transitionNapCounts.current, transitionNapCounts.transitioning);
              const higherCount = Math.max(transitionNapCounts.current, transitionNapCounts.transitioning);
              
              // Determine active button based on showAlternate prop and which count is alternate
              // If alternateScheduleNapCount matches lowerCount, then showAlternate=true means lower is active
              const isLowerActive = alternateScheduleNapCount === lowerCount ? showAlternate : !showAlternate;
              const isHigherActive = !isLowerActive;
              
              console.log('🔘 Toggle render state:', {
                lowerCount,
                higherCount,
                showAlternate,
                alternateScheduleNapCount,
                mainScheduleNapCount,
                isLowerActive,
                isHigherActive
              });
              
              return (
                <>
                  <button
                    onClick={() => {
                      console.log('🔘 Lower button clicked:', lowerCount);
                      onToggleAlternate(lowerCount);
                    }}
                    className={`px-4 py-2 text-xs font-medium transition-all border-r border-border ${
                      isLowerActive
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {lowerCount}-nap day
                  </button>
                  <button
                    onClick={() => {
                      console.log('🔘 Higher button clicked:', higherCount);
                      onToggleAlternate(higherCount);
                    }}
                    className={`px-4 py-2 text-xs font-medium transition-all ${
                      isHigherActive
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
                    }`}
                  >
                    {higherCount}-nap day
                  </button>
                </>
              );
            })()}
          </div>
        </div>
      )}
      
      {schedule.adjustmentNote && !isTransitioning && (
        <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg animate-fade-in mb-2">
          <p className="text-xs text-primary font-semibold line-clamp-2">
            {schedule.adjustmentNote
              .replace(/The baby/g, babyName)
              .replace(/the baby/g, babyName)}
          </p>
        </div>
      )}
      
      {/* Timeline view with time blocks - shimmer during adjustment */}
      <div className={`space-y-1 transition-all duration-300 ${
        isAdjusting ? 'opacity-60' : 'opacity-100'
      }`}>
        
        {(() => {
          // Filter to only show wake, naps, and bedtime
          const essentialActivities = groupedActivities.filter(a => 
            (a.type === 'morning' && !a.feedTime) || // Wake up only (not feeds)
            a.type === 'nap-block' || 
            a.type === 'bedtime'
          );
          
          // Group by time blocks
          let currentBlock: string | null = null;
          
          // No need to deduplicate - only one bedtime entry now
          const displayActivities = essentialActivities;
          
          return displayActivities.map((activity, idx) => {
            // Determine time block for visual grouping
            const timeBlock = getTimeBlock(activity.time);
            const showBlockDivider = currentBlock !== null && currentBlock !== timeBlock;
            currentBlock = timeBlock;
            
            // Find matching event for confidence/reasoning
            const matchingEvent = schedule.events.find(e => e.time === activity.time);
            const eventTime = parseTime(activity.time);
            
            // Determine if this is the current activity
            let isCurrent = false;
            if (activity.type === 'nap-block' && activity.napDuration) {
              // For naps: check if current time is within nap start and end
              const { endTime } = calculateEndTimeAndDuration(activity.time, activity.napDuration);
              const napEndMinutes = parseTime(endTime);
              isCurrent = currentMinutes >= eventTime && currentMinutes < napEndMinutes;
            } else {
              // For wake-up/bedtime: check if within 30 minutes before or after
              const timeDiff = Math.abs(currentMinutes - eventTime);
              isCurrent = timeDiff <= 30 && currentMinutes >= eventTime - 30;
            }
            
            const isPast = eventTime < currentMinutes && !isCurrent;
            
            // Confidence styling
            const confidenceOpacity = matchingEvent?.confidence === 'high' ? 'opacity-100' : 
                                       matchingEvent?.confidence === 'medium' ? 'opacity-80' : 'opacity-60';
            
            // Time block background colors
            const blockBgColor = timeBlock === 'morning' ? 'bg-amber-50/50 dark:bg-amber-950/20' :
                                timeBlock === 'midday' ? 'bg-orange-50/50 dark:bg-orange-950/20' :
                                timeBlock === 'afternoon' ? 'bg-blue-50/50 dark:bg-blue-950/20' :
                                'bg-purple-50/50 dark:bg-purple-950/20';
            
            return (
              <>
                {/* Time block divider */}
                {showBlockDivider && (
                  <div className="h-px bg-border/60 my-3" />
                )}
                
                {activity.type === 'morning' && (
                  <div key={activity.id} className={`relative ${confidenceOpacity} transition-all duration-300 py-2 ${
                    isAdjusting ? 'animate-pulse' : ''
                  }`}>
                    <div className="w-full flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full ${isPast ? 'bg-amber-500/20 border-2 border-amber-500/40' : 'bg-amber-500/10 border-2 border-amber-500/30'} flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm transition-all duration-500 ${
                          animateWakeTime ? 'animate-pulse scale-110 border-amber-500/70 shadow-lg shadow-amber-500/30' : ''
                        }`}>
                          <Sun className={`w-4 h-4 text-amber-600 transition-all duration-500 ${
                            animateWakeTime ? 'scale-125' : ''
                          }`} />
                        </div>
                      </div>
                      <div className="flex-1 pb-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-sm font-semibold text-foreground transition-all duration-500 ${
                            animateWakeTime ? 'scale-110 text-amber-600' : ''
                          }`}>
                            {formatTime(activity.time, 'wake')}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            Wake up
                          </span>
                          {isCurrent && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 animate-fade-in">Now</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activity.type === 'nap-block' && (() => {
                  // Calculate wake window AFTER this nap (from nap end to next sleep start)
                  const nextActivity = displayActivities[idx + 1];
                  let wakeWindowText = '';
                  if (nextActivity) {
                    // Get end time of current nap
                    const { endTime: currentNapEnd } = calculateEndTimeAndDuration(activity.time, activity.napDuration || '1h 30m');
                    const currentEndMinutes = parseTime(currentNapEnd);
                    
                    // Get start time of next activity
                    let nextStartTime: string;
                    if (nextActivity.type === 'nap-block' || nextActivity.type === 'bedtime') {
                      nextStartTime = formatTime(nextActivity.time);
                    } else {
                      // Skip if next is not a sleep event
                      nextStartTime = '';
                    }
                    
                    if (nextStartTime) {
                      const nextStartMinutes = parseTime(nextStartTime);
                      let wakeWindowMinutes = nextStartMinutes - currentEndMinutes;
                      
                      // Handle overnight case (next day)
                      if (wakeWindowMinutes < 0) {
                        wakeWindowMinutes += 24 * 60; // Add 24 hours
                      }
                      
                      // Only show if positive and reasonable (< 12 hours)
                      if (wakeWindowMinutes > 0 && wakeWindowMinutes < 12 * 60) {
                        const hours = Math.floor(wakeWindowMinutes / 60);
                        const mins = wakeWindowMinutes % 60;
                        wakeWindowText = hours > 0 ? `${hours}h ${mins}min` : `${mins}min`;
                      }
                    }
                  }
                  
                  return (
                    <div key={activity.id} className={`relative ${confidenceOpacity} transition-all duration-300 py-2 ${
                      isAdjusting ? 'animate-pulse' : ''
                    }`}>
                      <div className="w-full flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className={`w-9 h-9 rounded-full ${isPast ? 'bg-blue-500/20 border-2 border-blue-500/40' : 'bg-blue-500/10 border-2 border-blue-500/30'} flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm`}>
                            <Moon className="w-4 h-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="flex-1 pb-1 text-left">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-foreground">
                                {(() => {
                                  const { endTime, adjustedDuration } = calculateEndTimeAndDuration(activity.time, activity.napDuration || '1h 30m');
                                  return `${formatTime(activity.time)} - ${endTime}`;
                                })()}
                              </span>
                              <span className="text-xs font-medium text-muted-foreground">
                                {activity.title} ({activity.napDuration?.replace('h', 'h ')?.replace('m', 'min') || '1h 30min'})
                              </span>
                              {isCurrent && (
                                <Badge variant="default" className="text-[10px] px-1.5 py-0 animate-fade-in">Now</Badge>
                              )}
                            </div>
                            {wakeWindowText && (
                              <span className="text-xs text-muted-foreground">
                                Wake window: {wakeWindowText}
                              </span>
                          )}
                        </div>
                      </div>
                      </div>
                    </div>
                  );
                })()}
                
                {activity.type === 'bedtime' && (
                  <div key={activity.id} className={`relative ${confidenceOpacity} transition-all duration-300 py-2 ${
                    isAdjusting ? 'animate-pulse' : ''
                  }`}>
                    <div className="w-full flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full ${isPast ? 'bg-purple-500/20 border-2 border-purple-500/40' : 'bg-purple-500/10 border-2 border-purple-500/30'} flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm`}>
                          <Bed className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>
                      <div className="flex-1 pb-1 text-left">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">
                            {formatTime(activity.time)}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            Bedtime
                          </span>
                          {isCurrent && (
                            <Badge variant="default" className="text-[10px] px-1.5 py-0 animate-fade-in">Now</Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            );
          });
        })()}
      </div>
      
      {/* DST Transition Notice - Below Schedule */}
      {dstInfo.isDSTTransitionPeriod && (
        <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 mt-4">
          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-900 dark:text-amber-200 mb-1">
                {dstInfo.transitionType === 'spring-forward' ? '🌸 Spring Forward' : '🍂 Fall Back'} - Daylight Saving Time
              </p>
              <p className="text-xs text-amber-800 dark:text-amber-300">
                {dstInfo.message}
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Update prediction button - animated and alive */}
      {onRecalculate && (
        <div className="mt-4 space-y-2">
          {schedule.lastUpdated && !isAdjusting && (
            <p className="text-[10px] text-center text-muted-foreground">
              Last updated {new Date(schedule.lastUpdated).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
            </p>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onRecalculate}
            className={`w-full text-xs group relative overflow-hidden ${
              isAdjusting 
                ? 'bg-primary/5 border-primary/20' 
                : 'hover:bg-primary/5 hover:border-primary/30 hover:scale-[1.02] transition-all'
            }`}
            disabled={isAdjusting}
          >
            {isAdjusting ? (
              <>
                <div className="w-3 h-3 mr-2 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Clock className="w-3 h-3 mr-2 group-hover:rotate-12 transition-transform" />
                Update prediction
                <div className="absolute inset-0 -z-10 bg-gradient-to-r from-transparent via-primary/10 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-1000" />
              </>
            )}
          </Button>
        </div>
      )}
    </div>
  );
};
