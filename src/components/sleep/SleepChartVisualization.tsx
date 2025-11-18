import { SleepDataDay } from "@/types/sleep";
import { Activity } from "@/components/ActivityCard";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Moon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface SleepChartVisualizationProps {
  sleepData: SleepDataDay[];
  showFullDay: boolean;
}

export const SleepChartVisualization = ({ sleepData, showFullDay }: SleepChartVisualizationProps) => {
  const { t } = useLanguage();
  const [selectedNaps, setSelectedNaps] = useState<{ naps: Activity[], day: string } | null>(null);
  return (
    <>
      {/* Day headers */}
      <div className="grid grid-cols-[60px_1fr] gap-4 mb-2">
        <div></div>
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${sleepData.length}, 1fr)` }}>
          {sleepData.map((day, index) => (
            <div key={day.fullDate.getTime()} className="text-center text-caption font-medium text-foreground">
              {day.date}
            </div>
          ))}
        </div>
      </div>

      {/* Sleep chart grid with hour lines */}
      <div className="grid grid-cols-[60px_1fr] gap-4 relative">
        {/* Time labels */}
        <div className="flex flex-col justify-between py-2" style={{ height: showFullDay ? '480px' : '360px' }}>
          {Array.from({ length: showFullDay ? 25 : 16 }, (_, i) => {
            const hour = showFullDay ? i : i + 6;
            let timeLabel = '';
            if (hour === 0) timeLabel = '12am';
            else if (hour < 12) timeLabel = `${hour}am`;
            else if (hour === 12) timeLabel = '12pm';
            else timeLabel = `${hour - 12}pm`;
            
            return (
              <div key={`hour-${hour}`} className="text-label text-muted-foreground text-right">
                {timeLabel}
              </div>
            );
          })}
        </div>

        {/* Sleep blocks with hour grid lines */}
        <div className="relative" style={{ height: showFullDay ? '480px' : '360px' }}>
          {/* Hour grid lines */}
          <div className="absolute inset-0 flex flex-col justify-between pointer-events-none">
            {Array.from({ length: showFullDay ? 25 : 16 }, (_, i) => (
              <div key={i} className="h-px bg-border/20" />
            ))}
          </div>
          
          {/* Sleep blocks */}
          <div className="grid gap-2 h-full" style={{ gridTemplateColumns: `repeat(${sleepData.length}, 1fr)` }}>
            {sleepData.map((day) => (
              <div key={day.fullDate.getTime()} className="relative">
                {(() => {
                  // Collect unique naps that overlap this day
                  const uniqueNaps: Activity[] = [];
                  day.sleepBlocks.forEach((blk) => {
                    blk.naps.forEach((nap) => {
                      if (!uniqueNaps.some((n) => n.id === nap.id)) uniqueNaps.push(nap);
                    });
                  });

                  // Helper to parse "10:30 AM" -> minutes since midnight
                  const parseTime = (timeStr: string) => {
                    const cleaned = timeStr.trim();
                    const [time, period] = cleaned.split(" ");
                    if (!time || !period) return null;
                    const [hStr, mStr] = time.split(":");
                    if (!hStr || !mStr) return null;
                    let h = parseInt(hStr, 10);
                    const m = parseInt(mStr, 10);
                    if (period.toUpperCase() === "PM" && h !== 12) h += 12;
                    if (period.toUpperCase() === "AM" && h === 12) h = 0;
                    return h * 60 + m;
                  };

                  const rangeStart = (showFullDay ? 0 : 6) * 60;
                  const rangeEnd = (showFullDay ? 24 : 21) * 60;
                  const totalRange = rangeEnd - rangeStart;
                  const targetDate = new Date(day.fullDate.getFullYear(), day.fullDate.getMonth(), day.fullDate.getDate());

                  return uniqueNaps.map((nap) => {
                    if (!nap.details.startTime || !nap.details.endTime) return null;
                    const start = parseTime(nap.details.startTime);
                    const end = parseTime(nap.details.endTime);
                    if (start === null || end === null) return null;

                    const loggedAt = nap.loggedAt ? new Date(nap.loggedAt) : null;
                    const napDate = loggedAt ? new Date(loggedAt.getFullYear(), loggedAt.getMonth(), loggedAt.getDate()) : null;

                    let segStart = start;
                    let segEnd = end;

                    // Handle overnight by splitting logically per day
                    if (end < start) {
                      // If the nap started on this day (logged_at matches), show evening portion until midnight
                      if (napDate && napDate.getTime() === targetDate.getTime()) {
                        segEnd = 24 * 60;
                      } else {
                        // Otherwise, show morning portion from midnight to end
                        segStart = 0;
                      }
                    }

                    // Clip to visible range
                    segStart = Math.max(segStart, rangeStart);
                    segEnd = Math.min(segEnd, rangeEnd);
                    if (segEnd <= segStart) return null;

                    const top = ((segStart - rangeStart) / totalRange) * 100;
                    const height = ((segEnd - segStart) / totalRange) * 100;

                    return (
                      <div
                        key={`nap-${nap.id}-${day.fullDate.getTime()}`}
                        className="absolute w-full bg-feed rounded-sm border border-feed/20 cursor-pointer hover:opacity-90 transition-opacity"
                        style={{ top: `${top}%`, height: `${height}%`, minHeight: "2px" }}
                        onClick={() => setSelectedNaps({ naps: [nap], day: day.date })}
                        title={`Tap to view details`}
                      />
                    );
                  });
                })()}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Sleep Details Sheet */}
      <Sheet open={selectedNaps !== null} onOpenChange={(open) => !open && setSelectedNaps(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-nap" />
              {t('sleepOn')} {selectedNaps?.day}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {selectedNaps?.naps.map((nap) => (
              <div key={nap.id} className="p-4 rounded-lg bg-muted/30 border border-border">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">{t('sleepSession')}</span>
                  <span className="text-sm text-muted-foreground">{nap.time}</span>
                </div>
                {nap.details.startTime && nap.details.endTime && (
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('start')}:</span>
                      <span className="font-medium">{nap.details.startTime}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{t('end')}:</span>
                      <span className="font-medium">{nap.details.endTime}</span>
                    </div>
                  </div>
                )}
                {nap.details.note && (
                  <div className="mt-2 pt-2 border-t border-border">
                    <p className="text-sm text-muted-foreground">{nap.details.note}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};