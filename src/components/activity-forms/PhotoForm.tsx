import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { Camera } from "lucide-react";

interface PhotoFormProps {
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

export const PhotoForm = ({
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
}: PhotoFormProps) => {
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
        label="Time" 
      />

      <div>
        <Label className="form-label">Photo</Label>
        <div className="space-y-3">
          {(photo || photoUrl) && (
            <div className="photo-preview">
              <img
                src={photo ? URL.createObjectURL(photo) : photoUrl!}
                alt="Selected photo"
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
                Remove
              </Button>
            </div>
          )}
          
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
            id="photo-activity-input"
          />
          <label htmlFor="photo-activity-input" className="upload-area-lg">
            <Camera className="h-10 w-10 mb-2" />
            {photo || photoUrl ? (
              <span className="text-sm font-medium">Change photo</span>
            ) : (
              <>
                <span className="text-sm font-medium">Tap to add photo</span>
                <span className="text-xs mt-1">JPG, PNG up to 10MB</span>
              </>
            )}
          </label>
        </div>
      </div>

      <div>
        <Label htmlFor="photo-caption" className="form-label">Caption (optional)</Label>
        <Textarea
          id="photo-caption"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Add a caption..."
          rows={3}
          className="resize-none"
        />
      </div>
    </div>
  );
};
