import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { format, subDays, startOfDay } from "date-fns";

interface NapData {
  date: string;
  naps: { startMinutes: number; durationMinutes: number }[];
}

interface WeeklyRhythmProps {
  activities: any[];
  babyName: string;
}

export const WeeklyRhythm = ({ activities, babyName }: WeeklyRhythmProps) => {
  const [isOpen, setIsOpen] = useState(true);

  // Get last 7 days of nap data
  const getLast7DaysNaps = (): NapData[] => {
    const today = startOfDay(new Date());
    const days: NapData[] = [];

    console.log('🔍 WeeklyRhythm - Total activities:', activities.length);
    console.log('🔍 WeeklyRhythm - Sample activities:', activities.slice(0, 3));

    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      // Filter naps for this day
      const dayNaps = activities
        .filter(a => {
          if (a.type !== 'nap') return false;
          const activityDate = format(new Date(a.logged_at), 'yyyy-MM-dd');
          const hasEndTime = a.details?.endTime;
          console.log(`📊 Nap on ${activityDate}: hasEndTime=${hasEndTime}, details:`, a.details);
          return activityDate === dateStr && hasEndTime;
        })
        .map(a => {
          const start = new Date(a.logged_at);
          const end = new Date(a.details.endTime);
          const startMinutes = start.getHours() * 60 + start.getMinutes();
          const durationMinutes = Math.round((end.getTime() - start.getTime()) / 60000);
          return { startMinutes, durationMinutes };
        })
        .sort((a, b) => a.startMinutes - b.startMinutes);

      console.log(`📅 ${dateStr}: ${dayNaps.length} naps`);
      days.push({ date: dateStr, naps: dayNaps });
    }

    return days;
  };

  const weekData = getLast7DaysNaps();

  // Calculate bar width based on duration (relative to max duration)
  const maxDuration = Math.max(...weekData.flatMap(d => d.naps.map(n => n.durationMinutes)), 120);
  const getBarWidth = (duration: number) => {
    const minWidth = 20; // minimum width in pixels
    const maxWidth = 60; // maximum width in pixels
    return minWidth + ((duration / maxDuration) * (maxWidth - minWidth));
  };

  return (
    <div className="mx-2 mb-6 rounded-xl bg-gradient-to-b from-card-ombre-3-dark to-card-ombre-3 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-border/20 overflow-hidden">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* Header */}
        <div className="px-4 py-5 border-b border-border/30">
          <CollapsibleTrigger className="w-full" onClick={() => setIsOpen(!isOpen)}>
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-medium text-foreground/70 uppercase tracking-wider">
                This Week&apos;s Rhythm
              </h3>
              <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
        </div>

        {/* Nap Barcode Visualization */}
        <CollapsibleContent>
          <div className="px-4 pb-5 pt-4 space-y-3">
            {weekData.map((day) => {
              const dayLabel = format(new Date(day.date), 'EEE');
              const hasNaps = day.naps.length > 0;
              
              return (
                <div key={day.date} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-muted-foreground w-8 flex-shrink-0">
                    {dayLabel}
                  </span>
                  <div className="flex-1 flex items-center gap-1.5 min-h-[16px]">
                    {hasNaps ? (
                      day.naps.map((nap, idx) => (
                        <div
                          key={idx}
                          className="h-[15px] bg-primary/80 rounded-full transition-all"
                          style={{ width: `${getBarWidth(nap.durationMinutes)}px` }}
                          title={`${Math.round(nap.durationMinutes)} min nap`}
                        />
                      ))
                    ) : (
                      <span className="text-[10px] text-muted-foreground/50">No naps logged</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
};
