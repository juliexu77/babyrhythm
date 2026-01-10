import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { useLanguage } from "@/contexts/LanguageContext";

interface DiaperFormProps {
  time: string;
  setTime: (time: string) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  diaperType: "wet" | "poopy" | "both";
  setDiaperType: (type: "wet" | "poopy" | "both") => void;
  hasLeak: boolean;
  setHasLeak: (hasLeak: boolean) => void;
  hasCream: boolean;
  setHasCream: (hasCream: boolean) => void;
  note: string;
  setNote: (note: string) => void;
}

export const DiaperForm = ({
  time,
  setTime,
  selectedDate,
  setSelectedDate,
  diaperType,
  setDiaperType,
  hasLeak,
  setHasLeak,
  hasCream,
  setHasCream,
  note,
  setNote,
}: DiaperFormProps) => {
  const { t } = useLanguage();

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
              onClick={() => setDiaperType(type as "wet" | "poopy" | "both")}
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
};
