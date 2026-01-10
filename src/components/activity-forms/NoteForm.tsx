import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { Camera } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface NoteFormProps {
  time: string;
  setTime: (time: string) => void;
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  note: string;
  setNote: (note: string) => void;
  photo: File | null;
  setPhoto: (file: File | null) => void;
  photoUrl: string | null;
  setPhotoUrl: (url: string | null) => void;
}

export const NoteForm = ({
  time,
  setTime,
  selectedDate,
  setSelectedDate,
  note,
  setNote,
  photo,
  setPhoto,
  photoUrl,
  setPhotoUrl,
}: NoteFormProps) => {
  const { t } = useLanguage();

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
};
