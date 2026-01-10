import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { useLanguage } from "@/contexts/LanguageContext";

interface NapFormProps {
  startTime: string;
  setStartTime: (time: string) => void;
  endTime: string;
  setEndTime: (time: string) => void;
  hasEndTime: boolean;
  setHasEndTime: (has: boolean) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  selectedEndDate: Date;
  setSelectedEndDate: (date: Date) => void;
}

export const NapForm = ({
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  hasEndTime,
  setHasEndTime,
  selectedDate,
  setSelectedDate,
  selectedEndDate,
  setSelectedEndDate,
}: NapFormProps) => {
  const { t } = useLanguage();

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
                setEndTime("");
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
};
