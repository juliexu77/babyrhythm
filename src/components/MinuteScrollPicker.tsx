import { useEffect, useRef, useState } from "react";
import { Label } from "@/components/ui/label";

interface MinuteScrollPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
}

export const MinuteScrollPicker = ({ value, onChange, label }: MinuteScrollPickerProps) => {
  const [selectedMinute, setSelectedMinute] = useState(value ? parseInt(value) : 0);
  const minuteRef = useRef<HTMLDivElement>(null);

  // Generate minutes 0-60
  const minutes = Array.from({ length: 61 }, (_, i) => i);

  useEffect(() => {
    if (value) {
      const minute = parseInt(value);
      if (!isNaN(minute)) {
        setSelectedMinute(minute);
      }
    }
  }, [value]);

  useEffect(() => {
    // Scroll to selected minute
    if (minuteRef.current) {
      const itemHeight = 32;
      minuteRef.current.scrollTop = selectedMinute * itemHeight;
    }
  }, [selectedMinute]);

  const handleMinuteChange = (minute: number) => {
    setSelectedMinute(minute);
    onChange(minute.toString());
  };

  return (
    <div>
      <Label className="text-sm font-medium mb-2 block">{label}</Label>
      <div className="flex items-center justify-center border rounded-lg p-2 bg-background">
        {/* Scrollable minute picker */}
        <div
          ref={minuteRef}
          className="h-8 w-12 overflow-y-scroll scrollbar-hide snap-y snap-mandatory"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          <div className="flex flex-col">
            {minutes.map((minute) => (
              <div
                key={minute}
                className={`h-8 flex items-center justify-center text-sm font-medium cursor-pointer transition-colors snap-center ${
                  selectedMinute === minute 
                    ? 'text-foreground font-bold' 
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                onClick={() => handleMinuteChange(minute)}
              >
                {minute}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
