import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";

interface TimeScrollPickerProps {
  value?: string;
  selectedDate?: Date;
  onChange: (time: string) => void;
  onDateChange?: (date: Date) => void;
  label?: string;
}

export const TimeScrollPicker = ({ value, selectedDate, onChange, onDateChange, label }: TimeScrollPickerProps) => {
  const [hasUserInteracted, setHasUserInteracted] = useState(false);
  
  const [selectedHour, setSelectedHour] = useState(() => {
    if (value) {
      const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) return parseInt(match[1]);
    }
    return new Date().getHours() % 12 || 12;
  });
  
  const [selectedMinute, setSelectedMinute] = useState(() => {
    if (value) {
      const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) return parseInt(match[2]);
    }
    return Math.round(new Date().getMinutes() / 5) * 5;
  });
  
  const [selectedPeriod, setSelectedPeriod] = useState(() => {
    if (value) {
      const match = value.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (match) return match[3].toUpperCase() as "AM" | "PM";
    }
    return new Date().getHours() >= 12 ? "PM" : "AM";
  });

  // Generate dates array (past 7 days, today, next 3 days)
  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = -7; i <= 3; i++) {
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

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  // Create extended arrays for infinite scrolling
  const hours = [
    ...Array.from({ length: 12 }, (_, i) => i + 1), // Original 1-12
    ...Array.from({ length: 12 }, (_, i) => i + 1), // Duplicate for continuity
    ...Array.from({ length: 12 }, (_, i) => i + 1)  // Another duplicate
  ];
  const minutes = [
    ...Array.from({ length: 12 }, (_, i) => i * 5), // Original 0-55
    ...Array.from({ length: 12 }, (_, i) => i * 5), // Duplicate for continuity  
    ...Array.from({ length: 12 }, (_, i) => i * 5)  // Another duplicate
  ];
  const periods = ["AM", "PM"];

  useEffect(() => {
    // Only update the time if user has interacted or if there's no existing value
    if (hasUserInteracted || !value) {
      const timeString = `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;
      onChange(timeString);
    }
  }, [selectedHour, selectedMinute, selectedPeriod, onChange, hasUserInteracted, value]);

  useEffect(() => {
    // Update selected date when index changes
    if (hasUserInteracted && onDateChange) {
      onDateChange(dates[selectedDateIndex]);
    }
  }, [selectedDateIndex, dates, onDateChange, hasUserInteracted]);

  const scrollToValue = (ref: React.RefObject<HTMLDivElement>, value: number, items: any[]) => {
    if (ref.current) {
      const itemHeight = 32;
      // Find the middle occurrence of the value for smooth infinite scrolling
      const middleIndex = 12 + items.slice(0, 12).indexOf(value);
      if (middleIndex >= 12) {
        ref.current.scrollTop = middleIndex * itemHeight;
      }
    }
  };

  useEffect(() => {
    scrollToValue(hourRef, selectedHour, hours);
    scrollToValue(minuteRef, selectedMinute, minutes);
    
    // Scroll to selected date
    if (dateRef.current) {
      const itemHeight = 32;
      dateRef.current.scrollTop = selectedDateIndex * itemHeight;
    }
  }, []);

  const handleScroll = (
    ref: React.RefObject<HTMLDivElement>,
    items: any[],
    setter: (value: any) => void
  ) => {
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

  const formatDateLabel = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return "Today";
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return "Tomorrow";
    } else if (date.toDateString() === yesterday.toDateString()) {
      return "Yesterday";
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      
      {/* Combined Date and Time Selector */}
      <div className="flex gap-1 border rounded-lg p-2 items-center justify-center bg-background">
        {/* Date - Scrollable */}
        <div 
          ref={dateRef}
          className="h-8 w-16 overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={() => {
            if (dateRef.current) {
              const itemHeight = 32;
              const scrollTop = dateRef.current.scrollTop;
              const index = Math.round(scrollTop / itemHeight);
              const clampedIndex = Math.max(0, Math.min(index, dates.length - 1));
              setHasUserInteracted(true);
              setSelectedDateIndex(clampedIndex);
            }
          }}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex flex-col">
            {dates.map((date, index) => (
              <div
                key={index}
                className={`h-8 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors snap-center ${
                  selectedDateIndex === index 
                    ? 'text-foreground font-bold' 
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

        <span className="text-muted-foreground text-sm">-</span>
        {/* Hours - Scrollable */}
        <div 
          ref={hourRef}
          className="h-8 w-10 overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={() => handleScroll(hourRef, hours, setSelectedHour)}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex flex-col">
            {hours.map((hour, index) => (
              <div
                key={`hour-${index}`}
                className={`h-8 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors snap-center ${
                  selectedHour === hour 
                    ? 'text-foreground font-bold' 
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

        <span className="text-muted-foreground text-sm">:</span>

        {/* Minutes - Scrollable */}
        <div 
          ref={minuteRef}
          className="h-8 w-10 overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={() => handleScroll(minuteRef, minutes, setSelectedMinute)}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex flex-col">
            {minutes.map((minute, index) => (
              <div
                key={`minute-${index}`}
                className={`h-8 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors snap-center ${
                  selectedMinute === minute 
                    ? 'text-foreground font-bold' 
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

        {/* AM/PM */}
        <div className="flex gap-1">
          {periods.map((period) => (
            <div
              key={period}
              className={`px-2 py-1 rounded text-sm font-medium cursor-pointer transition-colors ${
                selectedPeriod === period 
                  ? 'text-foreground font-bold bg-muted' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => {
                setHasUserInteracted(true);
                setSelectedPeriod(period as "AM" | "PM");
              }}
            >
              {period}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};