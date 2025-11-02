import { Moon, Sun, Milk, Bed } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ScheduleEvent {
  time: string;
  type: 'wake' | 'nap' | 'feed' | 'bed';
  duration?: string;
  notes?: string;
}

interface PredictedSchedule {
  events: ScheduleEvent[];
  confidence: 'high' | 'medium' | 'low';
  basedOn: string;
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
      {/* Header with confidence badge */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground uppercase tracking-wider">
          {babyName}'s Predicted Schedule
        </h3>
        <Badge variant={schedule.confidence === 'high' ? 'default' : 'secondary'}>
          {schedule.confidence} confidence
        </Badge>
      </div>
      
      {/* Summary at the top */}
      <div className="p-3 bg-primary/5 rounded-lg border border-primary/10">
        <p className="text-sm text-foreground font-medium">
          Today: {napCount} nap{napCount !== 1 ? 's' : ''}, {feedCount} feed{feedCount !== 1 ? 's' : ''}{bedtimeActivity ? `, bedtime at ${bedtimeActivity.endTime}` : ''}
        </p>
      </div>
      
      <p className="text-xs text-muted-foreground">
        {schedule.basedOn}
      </p>
      
      {/* Timeline view */}
      <div className="space-y-3">
        {groupedActivities.map((activity) => {
          if (activity.type === 'morning') {
            return (
              <div key={activity.id} className="flex items-start gap-3 group">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 flex items-center justify-center flex-shrink-0">
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
                  </div>
                  {activity.feedTime && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                      <Milk className="w-3 h-3" />
                      <span>Feed at {activity.feedTime}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }
          
          if (activity.type === 'nap-block') {
            return (
              <div key={activity.id} className="flex items-start gap-3 group">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 flex items-center justify-center flex-shrink-0">
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
                  </div>
                  {activity.feedTime && (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                      <Milk className="w-3 h-3" />
                      <span>Feed at {activity.feedTime}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          }
          
          if (activity.type === 'bedtime') {
            return (
              <div key={activity.id} className="flex items-start gap-3 group">
                <div className="flex flex-col items-center">
                  <div className="w-8 h-8 rounded-full bg-purple-500/10 flex items-center justify-center flex-shrink-0">
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
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground pl-1">
                    <Bed className="w-3 h-3" />
                    <span>Bedtime at {activity.endTime}</span>
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
