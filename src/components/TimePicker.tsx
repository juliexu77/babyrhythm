import { useState, useEffect, useMemo } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TimePickerProps {
  value?: string;
  onChange: (time: string) => void;
  label?: string;
}

export const TimePicker = ({ value, onChange, label }: TimePickerProps) => {
  // Initialize with current time only once
  const initialTime = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentPeriod = currentHour >= 12 ? "PM" : "AM";
    const displayHour = currentHour === 0 ? 12 : currentHour > 12 ? currentHour - 12 : currentHour;
    
    return {
      hour: displayHour.toString(),
      minute: currentMinute.toString().padStart(2, "0"),
      period: currentPeriod
    };
  }, []);

  const [hour, setHour] = useState(initialTime.hour);
  const [minute, setMinute] = useState(initialTime.minute);
  const [period, setPeriod] = useState(initialTime.period);

  // Only update from external value if it's different
  useEffect(() => {
    if (value) {
      const [time, periodPart] = value.split(" ");
      if (time && periodPart) {
        const [h, m] = time.split(":");
        if (h && m && (h !== hour || m !== minute || periodPart !== period)) {
          setHour(h);
          setMinute(m);
          setPeriod(periodPart);
        }
      }
    }
  }, [value]);

  // Notify parent of changes
  useEffect(() => {
    const timeString = `${hour}:${minute} ${period}`;
    if (timeString !== value) {
      onChange(timeString);
    }
  }, [hour, minute, period]);

  const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString());
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, "0"));

  return (
    <div className="space-y-2">
      {label && <label className="text-sm font-medium text-foreground">{label}</label>}
      <div className="flex items-center gap-2">
        <Select value={hour} onValueChange={setHour}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {hours.map((h) => (
              <SelectItem key={h} value={h}>
                {h}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <span className="text-foreground">:</span>
        
        <Select value={minute} onValueChange={setMinute}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="max-h-40">
            {minutes.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AM">AM</SelectItem>
            <SelectItem value="PM">PM</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};