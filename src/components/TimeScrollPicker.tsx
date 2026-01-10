import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";

interface TimeScrollPickerProps {
  value?: string;
  selectedDate?: Date;
  onChange: (time: string) => void;
  onDateChange?: (date: Date) => void;
  label?: string;
}

export const TimeScrollPicker = ({ value, selectedDate, onChange, onDateChange, label }: TimeScrollPickerProps) => {
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  
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
      return index >= 0 ? index : 7; // Default to today (index 7)
    }
    return 7; // Today is at index 7
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
      const itemHeight = 32;
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
      const itemHeight = 32;
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
      const itemHeight = 32;
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

  // Helper to get adjacent values
  const getPrevValue = (currentIndex: number, array: any[]) => {
    const prevIndex = currentIndex > 0 ? currentIndex - 1 : array.length - 1;
    return array[prevIndex];
  };
  
  const getNextValue = (currentIndex: number, array: any[]) => {
    const nextIndex = currentIndex < array.length - 1 ? currentIndex + 1 : 0;
    return array[nextIndex];
  };

  return (
    <div className="space-y-2">
      {label && <Label className="mb-2 block">{label}</Label>}
      
      {/* Combined Date and Time Selector - Strava style */}
      <div className="flex gap-1 rounded-strava bg-muted p-3 items-center justify-center">
        {/* Date - Scrollable */}
        <div className="relative flex flex-col items-center">
          <div className="text-[9px] font-bold tracking-wider text-muted-foreground/40 absolute -top-2 z-10 pointer-events-none">
            {selectedDateIndex > 0 ? formatDateLabel(dates[selectedDateIndex - 1]) : ''}
          </div>
          <div 
            ref={dateRef}
            className="h-8 w-16 overflow-y-scroll overflow-x-hidden scrollbar-hide snap-y snap-mandatory"
          onScroll={() => {
            if (isProgrammaticDateScroll.current) return;
            if (dateRef.current) {
              const itemHeight = 32;
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
                className={`h-8 flex items-center justify-center text-xs font-bold tracking-wider cursor-pointer transition-colors snap-center whitespace-nowrap ${
                  selectedDateIndex === index 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setHasUserInteracted(true);
                  setSelectedDateIndex(index);
                }}
              >
                {formatDateLabel(date)}
              </div>
            ))}
          </div>
          </div>
          <div className="text-[9px] font-bold tracking-wider text-muted-foreground/40 absolute -bottom-2 z-10 pointer-events-none">
            {selectedDateIndex < dates.length - 1 ? formatDateLabel(dates[selectedDateIndex + 1]) : ''}
          </div>
        </div>

        <span className="text-muted-foreground text-sm font-bold">-</span>
        {/* Hours - Scrollable */}
        <div className="relative flex flex-col items-center">
          <div className="text-[9px] font-bold text-muted-foreground/40 absolute -top-2 z-10 pointer-events-none">
            {selectedHour === 1 ? 12 : selectedHour - 1}
          </div>
          <div 
            ref={hourRef}
            className="h-8 w-10 overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={() => handleScroll(hourRef, hours, setSelectedHour, isProgrammaticHourScroll)}
          onMouseDown={() => setHasUserInteracted(true)}
          onTouchStart={() => setHasUserInteracted(true)}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex flex-col">
            {hours.map((hour, index) => (
              <div
                key={`hour-${index}`}
                className={`h-8 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors snap-center ${
                  selectedHour === hour 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setHasUserInteracted(true);
                  setSelectedHour(hour);
                }}
              >
                {hour}
              </div>
            ))}
          </div>
          </div>
          <div className="text-[9px] font-bold text-muted-foreground/40 absolute -bottom-2 z-10 pointer-events-none">
            {selectedHour === 12 ? 1 : selectedHour + 1}
          </div>
        </div>

        <span className="text-muted-foreground text-sm font-bold">:</span>

        {/* Minutes - Scrollable */}
        <div className="relative flex flex-col items-center">
          <div className="text-[9px] font-bold text-muted-foreground/40 absolute -top-2 z-10 pointer-events-none">
            {(selectedMinute === 0 ? 59 : selectedMinute - 1).toString().padStart(2, '0')}
          </div>
          <div 
            ref={minuteRef}
            className="h-8 w-12 overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={() => handleScroll(minuteRef, minutes, setSelectedMinute, isProgrammaticMinuteScroll)}
          onMouseDown={() => setHasUserInteracted(true)}
          onTouchStart={() => setHasUserInteracted(true)}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex flex-col">
            {minutes.map((minute, index) => (
              <div
                key={`minute-${index}`}
                className={`h-8 flex items-center justify-center text-sm font-bold cursor-pointer transition-colors snap-center ${
                  selectedMinute === minute 
                    ? 'text-foreground' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => {
                  setHasUserInteracted(true);
                  setSelectedMinute(minute);
                }}
              >
                {minute.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
          </div>
          <div className="text-[9px] font-bold text-muted-foreground/40 absolute -bottom-2 z-10 pointer-events-none">
            {(selectedMinute === 59 ? 0 : selectedMinute + 1).toString().padStart(2, '0')}
          </div>
        </div>

        {/* AM/PM - Strava style toggle */}
        <div className="flex">
          <button
            className="px-3 py-1.5 rounded-strava text-xs font-semibold cursor-pointer transition-all bg-primary text-primary-foreground hover:opacity-90"
            onClick={() => {
              const newPeriod = selectedPeriod === "AM" ? "PM" : "AM";
              setHasUserInteracted(true);
              setSelectedPeriod(newPeriod);
              try { 
                localStorage.setItem('lastUsedPeriod', newPeriod); 
              } catch (e) {}
            }}
          >
            {selectedPeriod}
          </button>
        </div>
      </div>
    </div>
  );
};