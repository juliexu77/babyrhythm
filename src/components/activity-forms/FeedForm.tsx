import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { Milk } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FeedFormProps {
  time: string;
  setTime: (time: string) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  feedType: "bottle" | "nursing";
  setFeedType: (type: "bottle" | "nursing") => void;
  quantity: string;
  unit: "oz" | "ml";
  minutesLeft: string;
  setMinutesLeft: (minutes: string) => void;
  minutesRight: string;
  setMinutesRight: (minutes: string) => void;
  isDreamFeed: boolean;
  setIsDreamFeed: (isDream: boolean) => void;
  note: string;
  setNote: (note: string) => void;
  onOpenKeypad: () => void;
}

export const FeedForm = ({
  time,
  setTime,
  selectedDate,
  setSelectedDate,
  feedType,
  setFeedType,
  quantity,
  unit,
  minutesLeft,
  setMinutesLeft,
  minutesRight,
  setMinutesRight,
  isDreamFeed,
  setIsDreamFeed,
  note,
  setNote,
  onOpenKeypad,
}: FeedFormProps) => {
  const { t } = useLanguage();

  return (
    <div className="form-section">
      <div>
        <Label className="form-label">{t('type')}</Label>
        <div className="grid grid-cols-2 gap-2">
          {[
            { type: "bottle", icon: Milk, label: t('bottle') },
            { type: "nursing", icon: Milk, label: t('nursing') }
          ].map(({ type, icon: Icon, label }) => (
            <button
              key={type}
              type="button"
              className="btn-select"
              data-selected={feedType === type}
              onClick={() => setFeedType(type as "bottle" | "nursing")}
            >
              <Icon className="h-4 w-4" />
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <TimeScrollPicker 
        value={time} 
        selectedDate={selectedDate}
        onChange={setTime} 
        onDateChange={setSelectedDate}
        label={t('time')} 
      />

      {feedType === "bottle" && (
        <div className="space-y-3">
          <div className="flex items-end gap-3">
            <div className="flex-1">
              <Label className="form-label">{t('amount')}</Label>
              <button
                type="button"
                className="input-tappable"
                onClick={onOpenKeypad}
              >
                <span className="text-foreground">
                  {quantity ? `${quantity} ${unit}` : t('tapToEnterAmount')}
                </span>
              </button>
            </div>
            <div className="flex items-center space-x-2 pb-2">
              <Checkbox
                id="dream-feed"
                checked={isDreamFeed}
                onCheckedChange={(checked) => setIsDreamFeed(checked === true)}
              />
              <Label 
                htmlFor="dream-feed" 
                className="text-sm font-medium cursor-pointer whitespace-nowrap"
              >
                {t('dreamFeed')}
              </Label>
            </div>
          </div>
        </div>
      )}

      {feedType === "nursing" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t('leftSide')}</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={minutesLeft}
                onChange={(e) => setMinutesLeft(e.target.value)}
                className="text-center text-lg font-semibold"
              />
              <p className="text-xs text-muted-foreground text-center">minutes</p>
            </div>
            <div className="space-y-2">
              <Label>{t('rightSide')}</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={minutesRight}
                onChange={(e) => setMinutesRight(e.target.value)}
                className="text-center text-lg font-semibold"
              />
              <p className="text-xs text-muted-foreground text-center">minutes</p>
            </div>
          </div>
        </div>
      )}

      <div>
        <Label htmlFor="feed-note" className="form-label">{t('notes')}</Label>
        <Textarea
          id="feed-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('additionalNotesFeeding')}
          rows={3}
          className="resize-none rounded-strava"
        />
      </div>
    </div>
  );
};
