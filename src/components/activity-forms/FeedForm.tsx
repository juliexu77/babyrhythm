import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { Milk } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { rawStorage, StorageKeys } from "@/hooks/useLocalStorage";
import { ActivityFormRef, FeedFormData, EditingData, getCurrentTime } from "./types";

interface FeedFormProps {
  editingData?: EditingData | null;
  prefillData?: EditingData | null;
  onOpenKeypad: (currentValue: string, unit: 'oz' | 'ml', onSubmit: (value: string) => void, onUnitChange: (unit: 'oz' | 'ml') => void) => void;
}

export const FeedForm = forwardRef<ActivityFormRef, FeedFormProps>(({
  editingData,
  prefillData,
  onOpenKeypad,
}, ref) => {
  const { t } = useLanguage();
  
  // Initialize state from localStorage or defaults
  const getInitialUnit = (): 'oz' | 'ml' => {
    const lastUnit = rawStorage.get(StorageKeys.LAST_USED_UNIT, '') as 'oz' | 'ml';
    return lastUnit || 'oz';
  };
  
  const [time, setTime] = useState(() => getCurrentTime());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [feedType, setFeedType] = useState<'bottle' | 'nursing'>('bottle');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState<'oz' | 'ml'>(getInitialUnit);
  const [minutesLeft, setMinutesLeft] = useState('');
  const [minutesRight, setMinutesRight] = useState('');
  const [isDreamFeed, setIsDreamFeed] = useState(false);
  const [note, setNote] = useState('');

  // Load editing data
  useEffect(() => {
    if (editingData) {
      setTime(editingData.time);
      if (editingData.loggedAt) {
        setSelectedDate(new Date(editingData.loggedAt));
      }
      const details = editingData.details;
      if (details.feedType === 'bottle' || details.feedType === 'nursing') {
        setFeedType(details.feedType);
      }
      setQuantity(details.quantity || '');
      setUnit(details.unit || 'oz');
      setMinutesLeft(details.minutesLeft || '');
      setMinutesRight(details.minutesRight || '');
      setIsDreamFeed(details.isDreamFeed || false);
      setNote(details.note || '');
    } else if (prefillData) {
      const details = prefillData.details;
      if (details.feedType === 'bottle' || details.feedType === 'nursing') {
        setFeedType(details.feedType);
      }
      setQuantity(details.quantity || '');
      setUnit(details.unit || getInitialUnit());
      setMinutesLeft(details.minutesLeft || '');
      setMinutesRight(details.minutesRight || '');
      setIsDreamFeed(details.isDreamFeed || false);
    }
  }, [editingData, prefillData]);

  // Load last used values for new entries
  useEffect(() => {
    if (!editingData && !prefillData) {
      if (feedType === 'bottle' && !quantity) {
        const lastQuantity = rawStorage.get(StorageKeys.LAST_FEED_QUANTITY, '');
        if (lastQuantity) setQuantity(lastQuantity);
      }
      if (feedType === 'nursing' && !minutesLeft && !minutesRight) {
        const lastLeft = rawStorage.get(StorageKeys.LAST_NURSING_LEFT, '');
        const lastRight = rawStorage.get(StorageKeys.LAST_NURSING_RIGHT, '');
        if (lastLeft) setMinutesLeft(lastLeft);
        if (lastRight) setMinutesRight(lastRight);
      }
    }
  }, [feedType, editingData, prefillData, quantity, minutesLeft, minutesRight]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getValues: (): FeedFormData => ({
      type: 'feed',
      time,
      selectedDate,
      feedType,
      quantity,
      unit,
      minutesLeft,
      minutesRight,
      isDreamFeed,
      note,
    }),
    validate: () => {
      if (feedType === 'bottle') {
        const quantityNum = parseFloat(quantity);
        return !(!quantity || isNaN(quantityNum) || quantityNum <= 0);
      }
      if (feedType === 'nursing') {
        return !!(minutesLeft || minutesRight);
      }
      return true;
    },
    reset: () => {
      setTime(getCurrentTime());
      setSelectedDate(new Date());
      setFeedType('bottle');
      setQuantity('');
      setUnit(getInitialUnit());
      setMinutesLeft('');
      setMinutesRight('');
      setIsDreamFeed(false);
      setNote('');
    },
  }));

  const handleOpenKeypad = () => {
    onOpenKeypad(
      quantity,
      unit,
      (value) => setQuantity(value),
      (newUnit) => setUnit(newUnit)
    );
  };

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
              onClick={() => setFeedType(type as 'bottle' | 'nursing')}
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
                onClick={handleOpenKeypad}
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
});

FeedForm.displayName = 'FeedForm';
