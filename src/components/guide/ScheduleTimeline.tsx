import { Moon, Sun, Milk, Bed, Clock, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

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
      napCounter++;
      const postNapFeed = nextEvent?.type === 'feed' && nextEvent.notes?.includes('Post-nap') ? nextEvent : null;
      groupedActivities.push({
        id: `nap-${i}`,
        type: 'nap-block',
        time: event.time,
        napDuration: event.duration || '1h 30m',
        feedTime: postNapFeed?.time,
        napNumber: napCounter,
        title: `Nap ${napCounter}`
      });
      if (postNapFeed) i++; // Skip the post-nap feed if grouped
    }
    // Bedtime routine (bedtime feed + bed)
    else if (event.type === 'feed' && event.notes?.includes('Bedtime') && nextEvent?.type === 'bed') {
      groupedActivities.push({
        id: `bedtime-${i}`,
        type: 'bedtime',
        time: event.time,
        endTime: nextEvent.time,
        title: 'Bedtime routine'
      });
      i++; // Skip the bed event since we grouped it
    }
    // Standalone events (shouldn't happen often with our grouping logic)
    else if (event.type === 'feed') {
      groupedActivities.push({
        id: `feed-${i}`,
        type: 'morning', // Use morning type for styling
        time: event.time,
        title: 'Feed'
      });
    }
  }
  
  // Calculate summary
  const napCount = groupedActivities.filter(a => a.type === 'nap-block').length;
  const feedCount = schedule.events.filter(e => e.type === 'feed').length;
  const bedtimeActivity = groupedActivities.find(a => a.type === 'bedtime');
  
  return (
    <div className="space-y-4">
      {/* Header with confidence badge and accuracy */}
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {babyName}'s Predicted Schedule
        </h3>
        <div className="flex items-center gap-2">
          {schedule.accuracyScore !== undefined && schedule.accuracyScore > 0 && (
            <div className="relative">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-1 group">
                    <Badge variant="outline" className="text-xs cursor-pointer hover:bg-accent">
                      {schedule.accuracyScore}% accurate
                    </Badge>
                    <ChevronDown className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-all group-data-[state=open]:rotate-180" />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent className="absolute right-0 top-full mt-2 z-10 w-72 p-3 bg-card border border-border rounded-lg shadow-lg text-xs text-muted-foreground space-y-2">
                  <p className="font-medium text-foreground">How accuracy works:</p>
                  <p>
                    We compare predicted times vs. when you actually log activities. Predictions within ±30 minutes count as accurate.
                  </p>
                  <p>
                    As you log more activities, the schedule adapts in real-time using today&apos;s actual wake time and patterns, improving accuracy over time.
                  </p>
                  <p className="text-primary font-medium">
                    {schedule.accuracyScore}% means predictions are still learning your baby&apos;s unique rhythm!
                  </p>
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
          <Badge variant={schedule.confidence === 'high' ? 'default' : 'secondary'}>
            {schedule.confidence} confidence
          </Badge>
        </div>
      </div>
      
      {/* Summary at the top - now hidden since AI summary replaces it */}
      <div className="hidden p-3 bg-primary/5 rounded-lg border border-primary/10">
        <p className="text-sm text-foreground font-medium">
          Today: {napCount} nap{napCount !== 1 ? 's' : ''}, {feedCount} feed{feedCount !== 1 ? 's' : ''}{bedtimeActivity ? `, bedtime at ${bedtimeActivity.endTime}` : ''}
        </p>
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
      
      {/* Timeline view */}
      <div className="space-y-3 relative">
        {groupedActivities.map((activity, idx) => {
          // Find matching event for confidence/reasoning
          const matchingEvent = schedule.events.find(e => e.time === activity.time);
          const eventTime = parseTime(activity.time);
          const isPast = eventTime < currentMinutes;
          const isCurrent = !isPast && idx === groupedActivities.findIndex(a => parseTime(a.time) >= currentMinutes);
          
          // Confidence styling
          const confidenceOpacity = matchingEvent?.confidence === 'high' ? 'opacity-100' : 
                                     matchingEvent?.confidence === 'medium' ? 'opacity-80' : 'opacity-60';
          
          if (activity.type === 'morning') {
            return (
              <div key={activity.id} className={`relative ${confidenceOpacity} transition-opacity`}>
                {isCurrent && (
                  <div className="absolute -left-4 top-0 flex items-center gap-2 animate-fade-in z-10">
                    <Clock className="w-4 h-4 text-primary animate-pulse" />
                    <div className="h-0.5 w-[calc(100%+2rem)] bg-gradient-to-r from-primary via-primary/80 to-transparent animate-pulse" />
                  </div>
                )}
                <div className="flex items-start gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full ${isPast ? 'bg-amber-500/20' : 'bg-amber-500/10'} flex items-center justify-center flex-shrink-0`}>
                      <Sun className="w-4 h-4 text-amber-600" />
                    </div>
                    <div className="w-0.5 h-4 bg-border/40" />
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">
                        {activity.time}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        {activity.title}
                      </span>
                      {matchingEvent?.confidence && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          {matchingEvent.confidence}
                        </Badge>
                      )}
                    </div>
                    {activity.feedTime && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                        <Milk className="w-3 h-3" />
                        <span>Feed at {activity.feedTime}</span>
                      </div>
                    )}
                    {matchingEvent?.reasoning && (
                      <Collapsible open={expandedEvents.has(activity.id)}>
                        <CollapsibleTrigger 
                          onClick={() => toggleExpanded(activity.id)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <ChevronDown className={`w-3 h-3 transition-transform ${expandedEvents.has(activity.id) ? 'rotate-180' : ''}`} />
                          Why this time?
                        </CollapsibleTrigger>
                        <CollapsibleContent className="text-xs text-muted-foreground mt-1 pl-4 border-l-2 border-primary/20">
                          {matchingEvent.reasoning}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          
          if (activity.type === 'nap-block') {
            return (
              <div key={activity.id} className={`relative ${confidenceOpacity} transition-opacity`}>
                {isCurrent && (
                  <div className="absolute -left-4 top-0 flex items-center gap-2 animate-fade-in z-10">
                    <Clock className="w-4 h-4 text-primary animate-pulse" />
                    <div className="h-0.5 w-[calc(100%+2rem)] bg-gradient-to-r from-primary via-primary/80 to-transparent animate-pulse" />
                  </div>
                )}
                <div className="flex items-start gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full ${isPast ? 'bg-blue-500/20' : 'bg-blue-500/10'} flex items-center justify-center flex-shrink-0`}>
                      <Moon className="w-4 h-4 text-blue-600" />
                    </div>
                    {activity.id !== groupedActivities[groupedActivities.length - 1].id && (
                      <div className="w-0.5 h-8 bg-border/40" />
                    )}
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-bold text-foreground">
                        {activity.time}
                      </span>
                      <span className="text-xs font-medium text-foreground uppercase tracking-wide">
                        {activity.title}
                      </span>
                      <span className="text-xs font-medium text-blue-600">
                        {activity.napDuration}
                      </span>
                      {matchingEvent?.confidence && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          {matchingEvent.confidence}
                        </Badge>
                      )}
                    </div>
                    {activity.feedTime && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                        <Milk className="w-3 h-3" />
                        <span>Feed at {activity.feedTime}</span>
                      </div>
                    )}
                    {matchingEvent?.reasoning && (
                      <Collapsible open={expandedEvents.has(activity.id)}>
                        <CollapsibleTrigger 
                          onClick={() => toggleExpanded(activity.id)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <ChevronDown className={`w-3 h-3 transition-transform ${expandedEvents.has(activity.id) ? 'rotate-180' : ''}`} />
                          Why this time?
                        </CollapsibleTrigger>
                        <CollapsibleContent className="text-xs text-muted-foreground mt-1 pl-4 border-l-2 border-primary/20">
                          {matchingEvent.reasoning}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          
          if (activity.type === 'bedtime') {
            return (
              <div key={activity.id} className={`relative ${confidenceOpacity} transition-opacity`}>
                {isCurrent && (
                  <div className="absolute -left-4 top-0 flex items-center gap-2 animate-fade-in z-10">
                    <Clock className="w-4 h-4 text-primary animate-pulse" />
                    <div className="h-0.5 w-[calc(100%+2rem)] bg-gradient-to-r from-primary via-primary/80 to-transparent animate-pulse" />
                  </div>
                )}
                <div className="flex items-start gap-3 group">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full ${isPast ? 'bg-purple-500/20' : 'bg-purple-500/10'} flex items-center justify-center flex-shrink-0`}>
                      <Bed className="w-4 h-4 text-purple-600" />
                    </div>
                  </div>
                  <div className="flex-1 pb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-semibold text-foreground">
                        {activity.time}
                      </span>
                      <span className="text-xs text-muted-foreground uppercase tracking-wide">
                        {activity.title}
                      </span>
                      {matchingEvent?.confidence && (
                        <Badge variant="outline" className="text-[10px] h-4">
                          {matchingEvent.confidence}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                      <Bed className="w-3 h-3" />
                      <span>Bedtime at {activity.endTime}</span>
                    </div>
                    {matchingEvent?.reasoning && (
                      <Collapsible open={expandedEvents.has(activity.id)}>
                        <CollapsibleTrigger 
                          onClick={() => toggleExpanded(activity.id)}
                          className="flex items-center gap-1 text-xs text-primary hover:underline mt-1"
                        >
                          <ChevronDown className={`w-3 h-3 transition-transform ${expandedEvents.has(activity.id) ? 'rotate-180' : ''}`} />
                          Why this time?
                        </CollapsibleTrigger>
                        <CollapsibleContent className="text-xs text-muted-foreground mt-1 pl-4 border-l-2 border-primary/20">
                          {matchingEvent.reasoning}
                        </CollapsibleContent>
                      </Collapsible>
                    )}
                  </div>
                </div>
              </div>
            );
          }
          
          return null;
        })}
      </div>
    </div>
  );
};
