import { type PredictedSchedule } from "@/utils/schedulePredictor";

interface TodayAtGlanceProps {
  schedule: PredictedSchedule;
}

export const TodayAtGlance = ({ schedule }: TodayAtGlanceProps) => {
  const napCount = schedule.events.filter(e => e.type === 'nap').length;
  const feedCount = schedule.events.filter(e => e.type === 'feed').length;
  const bedtimeEvent = schedule.events.find(e => e.type === 'bed');
  
  const parts: string[] = [];
  
  // Add naps
  if (napCount > 0) {
    parts.push(`${napCount} ${napCount === 1 ? 'nap' : 'naps'}`);
  }
  
  // Add feeds
  if (feedCount > 0) {
    parts.push(`${feedCount} ${feedCount === 1 ? 'feed' : 'feeds'}`);
  }
  
  // Add bedtime
  if (bedtimeEvent) {
    parts.push(`bedtime at ${bedtimeEvent.time}`);
  }
  
  // If no data, don't render anything
  if (parts.length === 0) {
    return null;
  }
  
  return (
    <div className="px-4 py-3 bg-accent/10 rounded-lg border border-border/40">
      <p className="text-sm text-foreground">
        <span className="font-medium">Today: </span>
        {parts.join(', ')}
      </p>
    </div>
  );
};
