import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Keyboard } from "lucide-react";

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
    const dates = [];
    const today = new Date();
    for (let i = -90; i <= 3; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
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
  const isProgrammaticDateScroll = useRef(false);

  // Create extended arrays for infinite scrolling
  const hours = [
    ...Array.from({ length: 12 }, (_, i) => i + 1), // Original 1-12
    ...Array.from({ length: 12 }, (_, i) => i + 1), // Duplicate for continuity
    ...Array.from({ length: 12 }, (_, i) => i + 1)  // Another duplicate
  ];
  const minutes = [
    ...Array.from({ length: 60 }, (_, i) => i), // Original 0-59
    ...Array.from({ length: 60 }, (_, i) => i), // Duplicate for continuity  
    ...Array.from({ length: 60 }, (_, i) => i)  // Another duplicate
  ];
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
    baseSectionSize?: number
  ) => {
    if (ref.current) {
      const itemHeight = 48;
      const sectionSize = baseSectionSize || (items.length / 3);
      const valueIndex = items.slice(0, sectionSize).indexOf(value);
      if (valueIndex >= 0) {
        const middleIndex = sectionSize + valueIndex;
        if (programmaticRef) programmaticRef.current = true;
        ref.current.scrollTop = middleIndex * itemHeight;
        // Allow scroll event to fire, then clear programmatic flag
        requestAnimationFrame(() => {
          if (programmaticRef) programmaticRef.current = false;
        });
      }
    }
  };

  useEffect(() => {
    // Scroll to selected values whenever they change (programmatic)
    scrollToValue(hourRef, selectedHour, hours, isProgrammaticHourScroll, 12);
    scrollToValue(minuteRef, selectedMinute, minutes, isProgrammaticMinuteScroll, 60);
    
    // Scroll to selected date (programmatic)
    if (dateRef.current) {
      const itemHeight = 48;
      isProgrammaticDateScroll.current = true;
      dateRef.current.scrollTop = selectedDateIndex * itemHeight;
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
    if (ref.current) {
      const itemHeight = 48;
      const scrollTop = ref.current.scrollTop;
      const index = Math.round(scrollTop / itemHeight);
      const totalItems = items.length;
      const sectionSize = totalItems / 3; // Each section has 12 items
      
      // Handle infinite scrolling by wrapping around
      if (index < sectionSize * 0.5) {
        // Near top, jump to middle section
        ref.current.scrollTop = (index + sectionSize) * itemHeight;
        return;
      } else if (index >= sectionSize * 2.5) {
        // Near bottom, jump to middle section
        ref.current.scrollTop = (index - sectionSize) * itemHeight;
        return;
      }
      
      const clampedIndex = Math.max(0, Math.min(index, totalItems - 1));
      const actualValue = items[clampedIndex % sectionSize];
      setHasUserInteracted(true);
      setter(actualValue);
    }
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
          <Button variant="ghost" size="sm" className="gap-2">
            <Keyboard className="h-4 w-4" />
            <span className="text-sm">Keypad</span>
          </Button>
        </DrawerHeader>
        
        <div className="flex gap-2 items-center justify-center py-8 px-4">
          {/* Date picker */}
          <div className="flex flex-col items-center flex-1">
            <div 
              ref={dateRef}
              className="h-48 w-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
              onScroll={() => {
                if (isProgrammaticDateScroll.current) return;
                if (dateRef.current) {
                  const itemHeight = 48;
                  const scrollTop = dateRef.current.scrollTop;
                  const index = Math.round(scrollTop / itemHeight);
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
                {dates.map((date, index) => (
                  <div
                    key={index}
                    className={`h-12 flex items-center justify-center text-base font-medium cursor-pointer transition-colors snap-center whitespace-nowrap ${
                      selectedDateIndex === index 
                        ? 'text-foreground font-bold' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    {formatDateLabel(date)}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Hour picker */}
          <div className="flex flex-col items-center flex-1">
            <div 
              ref={hourRef}
              className="h-48 w-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
              onScroll={() => handleScroll(hourRef, hours, setSelectedHour, isProgrammaticHourScroll)}
              onMouseDown={() => setHasUserInteracted(true)}
              onTouchStart={() => setHasUserInteracted(true)}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex flex-col">
                {hours.map((hour, index) => (
                  <div
                    key={`hour-${index}`}
                    className={`h-12 flex items-center justify-center text-base font-medium cursor-pointer transition-colors snap-center ${
                      selectedHour === hour 
                        ? 'text-foreground font-bold' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    {hour}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Minute picker */}
          <div className="flex flex-col items-center flex-1">
            <div 
              ref={minuteRef}
              className="h-48 w-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
              onScroll={() => handleScroll(minuteRef, minutes, setSelectedMinute, isProgrammaticMinuteScroll)}
              onMouseDown={() => setHasUserInteracted(true)}
              onTouchStart={() => setHasUserInteracted(true)}
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex flex-col">
                {minutes.map((minute, index) => (
                  <div
                    key={`minute-${index}`}
                    className={`h-12 flex items-center justify-center text-base font-medium cursor-pointer transition-colors snap-center ${
                      selectedMinute === minute 
                        ? 'text-foreground font-bold' 
                        : 'text-muted-foreground'
                    }`}
                  >
                    {minute.toString().padStart(2, '0')}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* AM/PM picker */}
          <div className="flex flex-col items-center flex-1">
            <div 
              className="h-48 w-full overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
              <div className="flex flex-col">
                {periods.map((period, index) => (
                  <div
                    key={`period-${index}`}
                    className={`h-12 flex items-center justify-center text-base font-medium cursor-pointer transition-colors snap-center ${
                      selectedPeriod === period 
                        ? 'text-foreground font-bold' 
                        : 'text-muted-foreground'
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
          </div>
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