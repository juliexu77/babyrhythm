import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { useLanguage } from "@/contexts/LanguageContext";
import { ActivityFormRef, DiaperFormData, EditingData, getCurrentTime } from "./types";

interface DiaperFormProps {
  editingData?: EditingData | null;
  prefillData?: EditingData | null;
}

export const DiaperForm = forwardRef<ActivityFormRef, DiaperFormProps>(({
  editingData,
  prefillData,
}, ref) => {
  const { t } = useLanguage();
  
  const [time, setTime] = useState(() => getCurrentTime());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [diaperType, setDiaperType] = useState<'wet' | 'poopy' | 'both'>('wet');
  const [hasLeak, setHasLeak] = useState(false);
  const [hasCream, setHasCream] = useState(false);
  const [note, setNote] = useState('');

  // Load editing data
  useEffect(() => {
    if (editingData) {
      setTime(editingData.time);
      if (editingData.loggedAt) {
        setSelectedDate(new Date(editingData.loggedAt));
      }
      setDiaperType(editingData.details.diaperType || 'wet');
      setHasLeak(editingData.details.hasLeak || false);
      setHasCream(editingData.details.hasCream || false);
      setNote(editingData.details.note || '');
    } else if (prefillData) {
      setDiaperType(prefillData.details.diaperType || 'wet');
      setHasLeak(prefillData.details.hasLeak || false);
      setHasCream(prefillData.details.hasCream || false);
    }
  }, [editingData, prefillData]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getValues: (): DiaperFormData => ({
      type: 'diaper',
      time,
      selectedDate,
      diaperType,
      hasLeak,
      hasCream,
      note,
    }),
    validate: () => true, // Diaper always valid if type selected
    reset: () => {
      setTime(getCurrentTime());
      setSelectedDate(new Date());
      setDiaperType('wet');
      setHasLeak(false);
      setHasCream(false);
      setNote('');
    },
  }));

  return (
    <div className="form-section">
      <TimeScrollPicker 
        value={time} 
        selectedDate={selectedDate}
        onChange={setTime} 
        onDateChange={setSelectedDate}
        label={t('time')} 
      />
      
      <div>
        <Label className="form-label">{t('type')}</Label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { type: "wet", label: t('wet') },
            { type: "poopy", label: t('poopy') },
            { type: "both", label: t('both') }
          ].map(({ type, label }) => (
            <button
              key={type}
              type="button"
              className="btn-select"
              data-selected={diaperType === type}
              onClick={() => setDiaperType(type as 'wet' | 'poopy' | 'both')}
            >
              <span className="text-xs font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="form-row-bordered">
          <Label className="text-sm text-foreground">{t('leak')}</Label>
          <button
            type="button"
            className="btn-toggle"
            data-active={hasLeak}
            onClick={() => setHasLeak(!hasLeak)}
          >
            {hasLeak ? t('yes') : t('no')}
          </button>
        </div>
        <div className="form-row-bordered">
          <Label className="text-sm text-foreground">{t('diaperingCream')}</Label>
          <button
            type="button"
            className="btn-toggle"
            data-active={hasCream}
            onClick={() => setHasCream(!hasCream)}
          >
            {hasCream ? t('yes') : t('no')}
          </button>
        </div>
      </div>

      <div>
        <Label htmlFor="diaper-note" className="form-label">{t('notes')}</Label>
        <Textarea
          id="diaper-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('additionalNotesDiaper')}
          rows={3}
          className="resize-none rounded-strava"
        />
      </div>
    </div>
  );
});

DiaperForm.displayName = 'DiaperForm';
