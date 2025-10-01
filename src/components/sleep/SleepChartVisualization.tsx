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
            {sleepData.map((day, dayIndex) => (
              <div key={day.fullDate.getTime()} className="relative">
                {/* Sleep bars - render continuous blocks */}
                {day.sleepBlocks.map((block, hourIndex) => {
                  if (!block.isAsleep) return null;
                  
                  // Only render if this is the start of a continuous sleep block
                  // Skip if the previous block was also asleep (already rendered as part of that block)
                  if (hourIndex > 0 && day.sleepBlocks[hourIndex - 1].isAsleep) return null;
                  
                  // Find the end of this continuous sleep block
                  let blockEnd = hourIndex;
                  while (blockEnd < day.sleepBlocks.length - 1 && day.sleepBlocks[blockEnd + 1].isAsleep) {
                    blockEnd++;
                  }
                  
                  // Collect all naps from this continuous block
                  const blockNaps: Activity[] = [];
                  for (let i = hourIndex; i <= blockEnd; i++) {
                    day.sleepBlocks[i].naps.forEach(nap => {
                      if (!blockNaps.some(n => n.id === nap.id)) {
                        blockNaps.push(nap);
                      }
                    });
                  }
                  
                  const blockLength = blockEnd - hourIndex + 1;
                  const blockHeight = (blockLength / (showFullDay ? 24 : 15)) * 100;
                  const blockTop = (hourIndex / (showFullDay ? 24 : 15)) * 100;
                  
                  return (
                    <div
                      key={`sleep-block-${hourIndex}-${blockEnd}`}
                      className="absolute w-full bg-gradient-to-b from-nap to-nap/80 rounded-sm border border-nap/20 cursor-pointer hover:opacity-80 transition-opacity"
                      style={{
                        top: `${blockTop}%`,
                        height: `${blockHeight}%`,
                        minHeight: '2px',
                      }}
                      onClick={() => setSelectedNaps({ naps: blockNaps, day: day.date })}
                      title={`Tap to view details`}
                    />
                  );
                })}
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