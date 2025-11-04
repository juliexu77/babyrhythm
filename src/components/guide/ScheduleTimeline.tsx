import { Moon, Sun, Milk, Bed, Clock, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useMemo } from "react";
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

export const ScheduleTimeline = ({ schedule, babyName }: ScheduleTimelineProps) => {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  
  // Debug: Log schedule events to verify feeds are included
  console.log('📋 ScheduleTimeline - Events:', schedule.events.map(e => ({ 
    time: e.time, 
    type: e.type, 
    notes: e.notes 
  })));
  console.log('📋 Feed count in schedule:', schedule.events.filter(e => e.type === 'feed').length);
  
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
  
  // Format time - don't round for bedtime/wake predictions
  const formatTime = (timeStr: string, skipRounding: boolean = false): string => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return timeStr;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const period = match[3].toUpperCase();
    
    // Skip rounding for wake/bedtime predictions - show exact times
    if (skipRounding) {
      return `${hours}:${minutes.toString().padStart(2, '0')} ${period}`;
    }
    
    // Round to nearest 15 minutes for nap times
    const roundedMinutes = Math.round(minutes / 15) * 15;
    const adjustedHours = roundedMinutes === 60 ? hours + 1 : hours;
    const finalMinutes = roundedMinutes === 60 ? 0 : roundedMinutes;
    
    return `${adjustedHours}:${finalMinutes.toString().padStart(2, '0')} ${period}`;
  };

  // Calculate end time from start time and duration
  const calculateEndTime = (startTime: string, duration: string): string => {
    const startMinutes = parseTime(startTime);
    const durationMatch = duration.match(/(\d+)h?\s*(\d+)?m?/);
    if (!durationMatch) return startTime;
    
    const hours = parseInt(durationMatch[1]) || 0;
    const mins = parseInt(durationMatch[2]) || 0;
    const durationMinutes = hours * 60 + mins;
    
    const endMinutes = startMinutes + durationMinutes;
    const endHours = Math.floor(endMinutes / 60) % 24;
    const endMins = endMinutes % 60;
    const period = endHours >= 12 ? 'PM' : 'AM';
    const displayHours = endHours > 12 ? endHours - 12 : (endHours === 0 ? 12 : endHours);
    
    return `${displayHours}:${endMins.toString().padStart(2, '0')} ${period}`;
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

  // Group related activities
  const groupedActivities: GroupedActivity[] = [];
  
  console.log('🔄 Starting to group activities...');
  
  let napCounter = 0;
  for (let i = 0; i < schedule.events.length; i++) {
    const event = schedule.events[i];
    const nextEvent = schedule.events[i + 1];
    
    // Morning routine (wake + morning feed)
    if (event.type === 'wake' && nextEvent?.type === 'feed' && nextEvent.notes?.includes('Morning')) {
      groupedActivities.push({
        id: `morning-${i}`,
        type: 'morning',
        time: event.time,
        feedTime: nextEvent.time,
        title: 'Morning routine'
      });
      i++; // Skip the next feed since we grouped it
    }
    // Nap block (nap + post-nap feed)
    else if (event.type === 'nap') {
      const minutes = parseTime(event.time);
      const isNightWindow = minutes >= 20 * 60 || minutes < 8 * 60; // 8:00 PM - 8:00 AM

      if (isNightWindow) {
        // Reclassify naps in the night window as night sleep so they are not counted as day naps
        console.log('🌙 Reclassifying nap as night sleep in ScheduleTimeline:', { time: event.time, notes: event.notes });
        const endIsWake = nextEvent?.type === 'wake';
        groupedActivities.push({
          id: `night-${i}`,
          type: 'bedtime',
          time: event.time,
          endTime: endIsWake ? nextEvent!.time : undefined,
          title: 'Night sleep'
        });
        // Do not increment napCounter for night sleep
        // Do not skip next event so morning routines still group correctly
      } else {
        napCounter++;
        // Look ahead for any feed (not just post-nap feed with specific notes)
        const upcomingFeed = nextEvent?.type === 'feed' ? nextEvent : null;
        groupedActivities.push({
          id: `nap-${i}`,
          type: 'nap-block',
          time: event.time,
          napDuration: event.duration || '1h 30m',
          feedTime: upcomingFeed?.time,
          napNumber: napCounter,
          title: `Nap ${napCounter}`
        });
        if (upcomingFeed) i++; // Skip the feed since we grouped it
      }
    }
    // Bedtime routine (bedtime feed + bed)
    else if (event.type === 'feed' && event.notes?.includes('Bedtime') && nextEvent?.type === 'bed') {
      groupedActivities.push({
        id: `bedtime-${i}`,
        type: 'bedtime',
        time: event.time,
        endTime: nextEvent.time,
        feedTime: event.time, // Include feed time so it displays
        title: 'Bedtime routine'
      });
      i++; // Skip the bed event since we grouped it
    }
    // Standalone bed event (bedtime without preceding feed)
    else if (event.type === 'bed') {
      groupedActivities.push({
        id: `bedtime-${i}`,
        type: 'bedtime',
        time: event.time,
        title: 'Bedtime'
      });
    }
    // Standalone wake or feed events
    else if (event.type === 'wake') {
      groupedActivities.push({
        id: `wake-${i}`,
        type: 'morning',
        time: event.time,
        title: 'Wake up'
      });
    }
    else if (event.type === 'feed') {
      // Show feed with proper icon
      groupedActivities.push({
        id: `feed-${i}`,
        type: 'morning',
        time: event.time,
        feedTime: event.time, // Mark as a feed-only event
        title: event.notes || 'Feed'
      });
    }
  }
  
  console.log('✅ Grouped activities:', groupedActivities.map(a => ({ 
    id: a.id, 
    type: a.type, 
    time: a.time, 
    title: a.title,
    feedTime: a.feedTime 
  })));
  console.log('🍼 Total feed events in grouped activities:', 
    groupedActivities.filter(a => a.feedTime).length);
  
  // Calculate summary - track expected vs actual feeds
  const napCount = groupedActivities.filter(a => a.type === 'nap-block').length;
  const expectedFeedCount = schedule.events.filter(e => e.type === 'feed').length;
  const actualFeedCount = groupedActivities.filter(a => a.feedTime).length;
  const bedtimeActivity = [...groupedActivities].reverse().find(a => a.type === 'bedtime');
  
  // Determine model state display
  const getModelStateDisplay = () => {
    if (schedule.accuracyScore === undefined || schedule.accuracyScore === 0) {
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
    const lastEventTime = bedtimeActivity ? parseTime(bedtimeActivity.endTime || bedtimeActivity.time) : parseTime(groupedActivities[groupedActivities.length - 1].time);
    
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
  
  return (
    <div className="space-y-4">
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
      
      {/* Header with confidence badge and model state */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {babyName}'s Predicted Schedule
        </h3>
        <div className="flex items-center gap-2">
          {modelState && (
            <div className="relative">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1 group">
                    <Badge variant={modelState.variant} className="text-xs cursor-pointer hover:bg-accent">
                      {modelState.text}
                    </Badge>
                    {modelState.showTooltip && (
                      <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-all group-data-[state=open]:rotate-180" />
                    )}
                  </button>
                </CollapsibleTrigger>
                {modelState.showTooltip && (
                  <CollapsibleContent className="absolute right-0 top-full mt-2 z-10 w-72 p-3 bg-card border border-border rounded-lg shadow-lg text-xs text-muted-foreground space-y-2">
                    <p className="font-medium text-foreground">How this works:</p>
                    <p>
                      We compare predicted times vs. when you actually log activities. Predictions within ±30 minutes count as accurate.
                    </p>
                    <p>
                      As you log more activities, the schedule adapts in real-time using today&apos;s actual wake time and patterns.
                    </p>
                    {schedule.accuracyScore !== undefined && schedule.accuracyScore < 80 && (
                      <p className="text-primary font-medium">
                        The model is learning {babyName}&apos;s unique patterns. Accuracy improves with each logged activity!
                      </p>
                    )}
                  </CollapsibleContent>
                )}
              </Collapsible>
            </div>
          )}
        </div>
      </div>
      
      
      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">
          {schedule.basedOn}
        </p>
        {schedule.adjustmentNote && (
          <div className="flex items-center gap-2 p-2 bg-primary/10 border border-primary/20 rounded-lg animate-fade-in">
            <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
            <p className="text-xs text-primary font-semibold">
              {schedule.adjustmentNote}
            </p>
          </div>
        )}
      </div>
      
      {/* Timeline view with time blocks */}
      <div className="space-y-1">
        
        {(() => {
          // Filter to only show wake, naps, and bedtime
          const essentialActivities = groupedActivities.filter(a => 
            (a.type === 'morning' && !a.feedTime) || // Wake up only (not feeds)
            a.type === 'nap-block' || 
            a.type === 'bedtime'
          );
          
          // Group by time blocks
          let currentBlock: string | null = null;
          
          // Keep only the last bedtime entry to avoid duplicates
          const deduplicatedActivities = essentialActivities.filter((activity, idx, arr) => {
            if (activity.type === 'bedtime') {
              // Find the last bedtime index
              const lastBedtimeIdx = arr.map(a => a.type).lastIndexOf('bedtime');
              return idx === lastBedtimeIdx; // Only keep the last one
            }
            return true; // Keep all non-bedtime activities
          });
          
          return deduplicatedActivities.map((activity, idx) => {
            // Determine time block for visual grouping
            const timeBlock = getTimeBlock(activity.time);
            const showBlockDivider = currentBlock !== null && currentBlock !== timeBlock;
            currentBlock = timeBlock;
            
            // Find matching event for confidence/reasoning
            const matchingEvent = schedule.events.find(e => e.time === activity.time);
            const eventTime = parseTime(activity.time);
            const isPast = eventTime < currentMinutes;
            const isCurrent = !isPast && idx === deduplicatedActivities.findIndex(a => parseTime(a.time) >= currentMinutes);
            
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
                  <div key={activity.id} className={`relative ${confidenceOpacity} transition-opacity rounded-lg p-3 ${blockBgColor}`}>
                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full ${isPast ? 'bg-amber-500/20 border-2 border-amber-500/40' : 'bg-amber-500/10 border-2 border-amber-500/30'} flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm`}>
                          <Sun className="w-4 h-4 text-amber-600" />
                        </div>
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">
                            {formatTime(activity.time, true)}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            Wake up
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activity.type === 'nap-block' && (
                  <div key={activity.id} className={`relative ${confidenceOpacity} transition-opacity rounded-lg p-3 ${blockBgColor}`}>
                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full ${isPast ? 'bg-blue-500/20 border-2 border-blue-500/40' : 'bg-blue-500/10 border-2 border-blue-500/30'} flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm`}>
                          <Moon className="w-4 h-4 text-blue-600" />
                        </div>
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">
                              {formatTime(activity.time)} - {calculateEndTime(activity.time, activity.napDuration || '1h 30m')}
                            </span>
                            <span className="text-xs font-medium text-foreground">
                              {activity.title}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {activity.type === 'bedtime' && (
                  <div key={activity.id} className={`relative ${confidenceOpacity} transition-opacity rounded-lg p-3 ${blockBgColor}`}>
                    <div className="flex items-start gap-3 group">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full ${isPast ? 'bg-purple-500/20 border-2 border-purple-500/40' : 'bg-purple-500/10 border-2 border-purple-500/30'} flex items-center justify-center flex-shrink-0 relative z-10 shadow-sm`}>
                          <Bed className="w-4 h-4 text-purple-600" />
                        </div>
                      </div>
                      <div className="flex-1 pb-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-semibold text-foreground">
                            {formatTime(activity.time, true)}
                          </span>
                          <span className="text-xs font-medium text-muted-foreground">
                            Bedtime
                          </span>
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
    </div>
  );
};
