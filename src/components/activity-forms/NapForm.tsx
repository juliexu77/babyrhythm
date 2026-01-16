import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { useLanguage } from "@/contexts/LanguageContext";
import { ActivityFormRef, NapFormData, EditingData, getCurrentTime, parseTimeToMinutes } from "./types";

interface NapFormProps {
  editingData?: EditingData | null;
  isQuickAdd?: boolean;
}

export const NapForm = forwardRef<ActivityFormRef, NapFormProps>(({
  editingData,
  isQuickAdd,
}, ref) => {
  const { t } = useLanguage();
  
  const [startTime, setStartTime] = useState(() => getCurrentTime());
  const [endTime, setEndTime] = useState('');
  const [hasEndTime, setHasEndTime] = useState(!isQuickAdd);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(new Date());

  // Load editing data
  useEffect(() => {
    if (editingData) {
      setStartTime(editingData.details.startTime || '');
      setEndTime(editingData.details.endTime || '');
      setHasEndTime(!!editingData.details.endTime);
      
      if (editingData.loggedAt) {
        const loggedDate = new Date(editingData.loggedAt);
        setSelectedDate(loggedDate);
        
        // Check if end time is on next day
        if (editingData.details.startTime && editingData.details.endTime) {
          const startMinutes = parseTimeToMinutes(editingData.details.startTime);
          const endMinutes = parseTimeToMinutes(editingData.details.endTime);
          if (endMinutes < startMinutes) {
            const nextDay = new Date(loggedDate);
            nextDay.setDate(nextDay.getDate() + 1);
            setSelectedEndDate(nextDay);
          } else {
            setSelectedEndDate(loggedDate);
          }
        } else {
          setSelectedEndDate(loggedDate);
        }
      }
    }
  }, [editingData]);

  // Handle quick add - no end time by default
  useEffect(() => {
    if (isQuickAdd && !editingData) {
      setHasEndTime(false);
      setEndTime('');
    }
  }, [isQuickAdd, editingData]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getValues: (): NapFormData => ({
      type: 'nap',
      time: startTime,
      selectedDate,
      startTime,
      endTime,
      hasEndTime,
      selectedEndDate,
    }),
    validate: () => {
      if (!startTime) return false;
      if (hasEndTime && !endTime) return false;
      return true;
    },
    reset: () => {
      setStartTime(getCurrentTime());
      setEndTime('');
      setHasEndTime(true);
      setSelectedDate(new Date());
      setSelectedEndDate(new Date());
    },
  }));

  return (
    <div className="form-section">
      <div className="space-y-3">
        <TimeScrollPicker 
          value={startTime} 
          selectedDate={selectedDate}
          onChange={setStartTime} 
          onDateChange={setSelectedDate}
          label={t('startTime')} 
        />
        
        <div className="flex items-center space-x-2">
          <Checkbox
            id="has-end-time"
            checked={hasEndTime}
            onCheckedChange={(checked) => {
              setHasEndTime(checked as boolean);
              if (!checked) {
                setEndTime('');
              }
            }}
          />
          <Label htmlFor="has-end-time" className="text-sm font-medium">
            {t('includeEndTime')}
          </Label>
        </div>

        {hasEndTime && (
          <TimeScrollPicker 
            value={endTime} 
            selectedDate={selectedEndDate}
            onChange={setEndTime} 
            onDateChange={setSelectedEndDate}
            label={t('endTime')} 
          />
        )}
      </div>
    </div>
  );
});

NapForm.displayName = 'NapForm';
