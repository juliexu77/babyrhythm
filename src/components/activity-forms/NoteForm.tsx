import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { Camera } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { ActivityFormRef, NoteFormData, EditingData, getCurrentTime } from "./types";

interface NoteFormProps {
  editingData?: EditingData | null;
}

export const NoteForm = forwardRef<ActivityFormRef, NoteFormProps>(({
  editingData,
}, ref) => {
  const { t } = useLanguage();
  
  const [time, setTime] = useState(() => getCurrentTime());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [note, setNote] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  // Load editing data
  useEffect(() => {
    if (editingData) {
      setTime(editingData.time);
      if (editingData.loggedAt) {
        setSelectedDate(new Date(editingData.loggedAt));
      }
      setNote(editingData.details.note || '');
      setPhotoUrl(editingData.details.photoUrl || null);
    }
  }, [editingData]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getValues: (): NoteFormData => ({
      type: 'note',
      time,
      selectedDate,
      note,
      photo,
      photoUrl,
    }),
    validate: () => true, // Note always valid
    reset: () => {
      setTime(getCurrentTime());
      setSelectedDate(new Date());
      setNote('');
      setPhoto(null);
      setPhotoUrl(null);
    },
  }));

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) return;
      setPhoto(file);
      setPhotoUrl(null);
    }
  };

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
        <Label htmlFor="note" className="form-label">{t('noteText')}</Label>
        <Textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={t('enterNoteHere')}
          rows={4}
          className="resize-none"
        />
      </div>

      <div>
        <Label className="form-label">{t('photoOptional')}</Label>
        <div className="space-y-3">
          {(photo || photoUrl) && (
            <div className="photo-preview">
              <img
                src={photo ? URL.createObjectURL(photo) : photoUrl!}
                alt={t('selectedPhoto')}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setPhoto(null);
                  setPhotoUrl(null);
                }}
                className="photo-remove-btn"
              >
                {t('remove')}
              </Button>
            </div>
          )}
          
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="note-photo-input"
          />
          <label htmlFor="note-photo-input" className="upload-area">
            <Camera className="h-8 w-8 mb-2" />
            {photo || photoUrl ? (
              <span className="text-sm font-medium">{t('changePhoto')}</span>
            ) : (
              <>
                <span className="text-sm font-medium">{t('tapToAddPhoto')}</span>
                <span className="text-xs mt-1">{t('jpgPngUpTo10mb')}</span>
              </>
            )}
          </label>
        </div>
      </div>
    </div>
  );
});

NoteForm.displayName = 'NoteForm';
