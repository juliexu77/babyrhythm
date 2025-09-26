import { useState, useRef, useEffect } from "react";
import { Label } from "@/components/ui/label";

interface TimeScrollPickerProps {
  value?: string;
  onChange: (time: string) => void;
  label?: string;
}

export const TimeScrollPicker = ({ value, onChange, label }: TimeScrollPickerProps) => {
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

  const hourRef = useRef<HTMLDivElement>(null);
  const minuteRef = useRef<HTMLDivElement>(null);
  const periodRef = useRef<HTMLDivElement>(null);

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
    const timeString = `${selectedHour}:${selectedMinute.toString().padStart(2, '0')} ${selectedPeriod}`;
    onChange(timeString);
  }, [selectedHour, selectedMinute, selectedPeriod, onChange]);

  const scrollToValue = (ref: React.RefObject<HTMLDivElement>, value: number, items: any[]) => {
    if (ref.current) {
      const itemHeight = 40;
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
  }, []);

  const handleScroll = (
    ref: React.RefObject<HTMLDivElement>,
    items: any[],
    setter: (value: any) => void
  ) => {
    if (ref.current) {
      const itemHeight = 40;
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
      setter(actualValue);
    }
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <div className="flex gap-2 border rounded-lg p-3 items-center justify-center bg-background">
        {/* Hours - Scrollable */}
        <div 
          ref={hourRef}
          className="h-10 w-16 overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={() => handleScroll(hourRef, hours, setSelectedHour)}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex flex-col">
            {hours.map((hour, index) => (
              <div
                key={`hour-${index}`}
                className={`h-10 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors snap-center ${
                  selectedHour === hour 
                    ? 'text-foreground font-bold' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setSelectedHour(hour)}
              >
                {hour}
              </div>
            ))}
          </div>
        </div>

        <span className="text-foreground font-medium">:</span>

        {/* Minutes - Scrollable */}
        <div 
          ref={minuteRef}
          className="h-10 w-16 overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          onScroll={() => handleScroll(minuteRef, minutes, setSelectedMinute)}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex flex-col">
            {minutes.map((minute, index) => (
              <div
                key={`minute-${index}`}
                className={`h-10 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors snap-center ${
                  selectedMinute === minute 
                    ? 'text-foreground font-bold' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => setSelectedMinute(minute)}
              >
                {minute.toString().padStart(2, '0')}
              </div>
            ))}
          </div>
        </div>

        {/* AM/PM */}
        <div className="flex gap-1 ml-2">
          {periods.map((period) => (
            <div
              key={period}
              className={`px-3 py-2 rounded text-sm font-medium cursor-pointer transition-colors ${
                selectedPeriod === period 
                  ? 'text-foreground font-bold bg-muted' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
              onClick={() => setSelectedPeriod(period as "AM" | "PM")}
            >
              {period}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};