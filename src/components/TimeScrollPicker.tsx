import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";

interface TimeScrollPickerProps {
  value?: string;
  selectedDate?: Date;
  onChange: (time: string) => void;
  onDateChange?: (date: Date) => void;
  label?: string;
}

export const TimeScrollPicker = ({ value, selectedDate, onChange, onDateChange, label }: TimeScrollPickerProps) => {
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  const [showExpandedPicker, setShowExpandedPicker] = useState(false);
  
  const getInitialParts = () => {
    if (value) {
      const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        const minuteParsed = parseInt(match[2]);
        return {
          hour: parseInt(match[1]),
          minute: Math.min(59, Math.max(0, minuteParsed)),
          period: match[3].toUpperCase() as "AM" | "PM",
        };
      }
    }
    const now = new Date();
    return {
      hour: now.getHours() % 12 || 12,
      minute: now.getMinutes(),
      period: (now.getHours() >= 12 ? "PM" : "AM") as "AM" | "PM",
    };
  };
  const initial = getInitialParts();
  const [selectedHour, setSelectedHour] = useState(initial.hour);
  const [selectedMinute, setSelectedMinute] = useState(initial.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(initial.period);

  // Generate dates array (past 90 days, today, next 3 days)
  const generateDates = () => {
    const dates: Date[] = [];
    const today = new Date();
    // Use noon to avoid DST/midnight timezone shifts when adding days
    today.setHours(12, 0, 0, 0);
    for (let i = -90; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      date.setHours(12, 0, 0, 0);
      dates.push(date);
    }
    return dates;
  };

  const [dates] = useState(generateDates());
  const [selectedDateIndex, setSelectedDateIndex] = useState(() => {
    if (selectedDate) {
      const index = dates.findIndex(date => 
        date.toDateString() === selectedDate.toDateString()
      );
      return index >= 0 ? index : 90; // Default to today (index 90)
    }
    return 90; // Today is at index 90
  });

  // Update time picker state when value prop changes (for editing activities)
  useEffect(() => {
    if (value) {
      const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) {
        setSelectedHour(parseInt(match[1]));
        const minuteParsed = parseInt(match[2]);
        const minuteSafe = Math.min(59, Math.max(0, minuteParsed));
        setSelectedMinute(minuteSafe);
        setSelectedPeriod(match[3].toUpperCase() as "AM" | "PM");
        setHasUserInteracted(false); // Reset interaction flag
      }
    }
  }, [value]);

  // Update date picker when selectedDate prop changes
  useEffect(() => {
    if (selectedDate) {
      const index = dates.findIndex(date => 
        date.toDateString() === selectedDate.toDateString()
      );
      if (index >= 0) {
        setSelectedDateIndex(index);
        setHasUserInteracted(false); // Reset interaction flag
      }
    }
  }, [selectedDate, dates]);

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);
  const isProgrammaticHourScroll = useRef(false);
  const isProgrammaticMinuteScroll = useRef(false);
  const isProgrammaticPeriodScroll = useRef(false);
  const isProgrammaticDateScroll = useRef(false);

  // Constants for consistent wheel behavior
  const ITEM_HEIGHT = 40; // must match h-10
  const VIEWPORT_HEIGHT = 176; // h-44 = 11rem = 176px
  const SPACER = (VIEWPORT_HEIGHT - ITEM_HEIGHT) / 2; // 68px

  // Simple finite lists with proper snapping
  const hours = Array.from({ length: 12 }, (_, i) => i + 1);
  const minutes = Array.from({ length: 60 }, (_, i) => i);
  const periods = ["AM", "PM"];

  // Call onChange once on mount with initial values
  useEffect(() => {
    // Only emit initial time if no value was provided (new entry)
    if (!value) {
      const minuteSafe = Math.min(59, Math.max(0, selectedMinute));
      const timeString = `${selectedHour}:${minuteSafe.toString().padStart(2, '0')} ${selectedPeriod}`;
      onChange(timeString);
    }
  }, []); // Only on mount

  useEffect(() => {
    // Update time when user interacts
    if (hasUserInteracted) {
      const minuteSafe = Math.min(59, Math.max(0, selectedMinute));
      if (minuteSafe !== selectedMinute) setSelectedMinute(minuteSafe);
      const timeString = `${selectedHour}:${minuteSafe.toString().padStart(2, '0')} ${selectedPeriod}`;
      onChange(timeString);
    }
  }, [selectedHour, selectedMinute, selectedPeriod, onChange, hasUserInteracted]);

  useEffect(() => {
    // Update selected date when index changes
    if (hasUserInteracted && onDateChange) {
      onDateChange(dates[selectedDateIndex]);
    }
  }, [selectedDateIndex, dates, onDateChange, hasUserInteracted]);

  const scrollToValue = (
    ref: React.RefObject<HTMLDivElement>,
    value: number,
    items: any[],
    programmaticRef?: React.MutableRefObject<boolean>,
  ) => {
    if (!ref.current) return;
    const index = items.indexOf(value);
    if (index < 0) return;
    if (programmaticRef) programmaticRef.current = true;
    ref.current.scrollTop = SPACER + index * ITEM_HEIGHT;
    requestAnimationFrame(() => {
      if (programmaticRef) programmaticRef.current = false;
    });
  };

  useEffect(() => {
    // Scroll to selected values whenever they change (programmatic)
    scrollToValue(hourRef, selectedHour, hours, isProgrammaticHourScroll);
    scrollToValue(minuteRef, selectedMinute, minutes, isProgrammaticMinuteScroll);
    
    // Scroll to selected date (programmatic)
    if (dateRef.current) {
      isProgrammaticDateScroll.current = true;
      dateRef.current.scrollTop = SPACER + selectedDateIndex * ITEM_HEIGHT;
      requestAnimationFrame(() => {
        isProgrammaticDateScroll.current = false;
      });
    }
  }, [selectedHour, selectedMinute, selectedDateIndex]);

  const handleScroll = (
    ref: React.RefObject<HTMLDivElement>,
    items: any[],
    setter: (value: any) => void,
    programmaticRef?: React.MutableRefObject<boolean>
  ) => {
    if (programmaticRef?.current) return;
    if (!ref.current) return;

    const scrollTop = ref.current.scrollTop;
    const rawIndex = Math.round((scrollTop - SPACER) / ITEM_HEIGHT);
    const clampedIndex = Math.max(0, Math.min(rawIndex, items.length - 1));
    const actualValue = items[clampedIndex];

    setHasUserInteracted(true);
    setter(actualValue);
  };

  const { t } = useLanguage();
  
  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return t('today');
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return t('tomorrow');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('yesterday');
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  // Render expanded picker drawer with all 4 columns
  const renderExpandedPicker = () => (
    <Drawer open={showExpandedPicker} onOpenChange={setShowExpandedPicker}>
      <DrawerContent className="max-h-[80vh]">
        <DrawerHeader className="flex flex-row items-center justify-between border-b pb-4">
          <DrawerTitle>{label || t('time')}</DrawerTitle>
        </DrawerHeader>
        
        <div className="relative flex gap-0 items-center justify-center py-6 px-6">
          {/* Date picker */}
          <div className="flex flex-col items-center flex-1 relative">
            <div 
              ref={dateRef}
              className="h-44 w-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory relative z-10"
              onScroll={() => {
                if (isProgrammaticDateScroll.current) return;
                if (dateRef.current) {
                  const scrollTop = dateRef.current.scrollTop;
                  const index = Math.round((scrollTop - SPACER) / ITEM_HEIGHT);
                  const clampedIndex = Math.max(0, Math.min(index, dates.length - 1));
                  setHasUserInteracted(true);
                  setSelectedDateIndex(clampedIndex);
                }
              }}
              onMouseDown={() => setHasUserInteracted(true)}
              onTouchStart={() => setHasUserInteracted(true)}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex flex-col">
                <div style={{ height: `${SPACER}px` }} aria-hidden />
                {dates.map((date, index) => (
                  <div
                    key={index}
                    className={`h-10 flex items-center justify-center text-base cursor-pointer transition-all duration-150 snap-center whitespace-nowrap ${
                      selectedDateIndex === index 
                        ? 'text-foreground' 
                        : 'text-muted-foreground/40'
                    }`}
                  >
                    {formatDateLabel(date)}
                  </div>
                ))}
                <div style={{ height: `${SPACER}px` }} aria-hidden />
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background via-transparent via-40% to-background to-100%" />
          </div>

          {/* Hour picker */}
          <div className="flex flex-col items-center flex-1 relative">
            <div 
              ref={hourRef}
              className="h-44 w-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory relative z-10"
              onScroll={() => handleScroll(hourRef, hours, setSelectedHour, isProgrammaticHourScroll)}
              onMouseDown={() => setHasUserInteracted(true)}
              onTouchStart={() => setHasUserInteracted(true)}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex flex-col">
                {hours.map((hour, index) => (
                  <div
                    key={`hour-${index}`}
                    className={`h-10 flex items-center justify-center text-base cursor-pointer transition-all duration-150 snap-center ${
                      selectedHour === hour 
                        ? 'text-foreground' 
                        : 'text-muted-foreground/40'
                    }`}
                  >
                    {hour}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background via-transparent via-40% to-background to-100%" />
          </div>

          {/* Minute picker */}
          <div className="flex flex-col items-center flex-1 relative">
            <div 
              ref={minuteRef}
              className="h-44 w-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory relative z-10"
              onScroll={() => handleScroll(minuteRef, minutes, setSelectedMinute, isProgrammaticMinuteScroll)}
              onMouseDown={() => setHasUserInteracted(true)}
              onTouchStart={() => setHasUserInteracted(true)}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex flex-col">
                {minutes.map((minute, index) => (
                  <div
                    key={`minute-${index}`}
                    className={`h-10 flex items-center justify-center text-base cursor-pointer transition-all duration-150 snap-center ${
                      selectedMinute === minute 
                        ? 'text-foreground' 
                        : 'text-muted-foreground/40'
                    }`}
                  >
                    {minute.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background via-transparent via-40% to-background to-100%" />
          </div>

          {/* AM/PM picker */}
          <div className="flex flex-col items-center flex-1 relative">
            <div 
              className="h-44 w-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory relative z-10"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex flex-col py-20">
                {periods.map((period, index) => (
                  <div
                    key={`period-${index}`}
                    className={`h-10 flex items-center justify-center text-base cursor-pointer transition-all duration-150 snap-center ${
                      selectedPeriod === period 
                        ? 'text-foreground' 
                        : 'text-muted-foreground/40'
                    }`}
                    onClick={() => {
                      setHasUserInteracted(true);
                      setSelectedPeriod(period as "AM" | "PM");
                      try { 
                        localStorage.setItem('lastUsedPeriod', period); 
                      } catch (e) {}
                    }}
                  >
                    {period}
                  </div>
                ))}
              </div>
            </div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-background via-transparent via-40% to-background to-100%" />
          </div>
        </div>
        
        {/* Selection indicator bar - spans across all columns (like Apple Health) */}
        <div className="absolute left-6 right-6 top-[calc(50%+0.75rem)] -translate-y-1/2 h-10 pointer-events-none">
          <div className="h-full rounded-lg bg-primary/15 border border-primary/20" />
        </div>

        <DrawerFooter className="flex flex-row gap-2 border-t pt-4">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => setShowExpandedPicker(false)}
          >
            {t('cancel') || 'Cancel'}
          </Button>
          <Button 
            className="flex-1"
            onClick={() => setShowExpandedPicker(false)}
          >
            {t('apply') || 'Apply'}
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      
      {/* Simple clickable display */}
      <div 
        className="flex gap-2 border rounded-lg p-3 items-center justify-between bg-background cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => setShowExpandedPicker(true)}
      >
        <span className="text-sm font-medium text-foreground">
          {formatDateLabel(dates[selectedDateIndex])}, {selectedHour}:{selectedMinute.toString().padStart(2, '0')} {selectedPeriod}
        </span>
      </div>

      {/* Expanded picker modal */}
      {renderExpandedPicker()}
    </div>
  );
};