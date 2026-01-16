import { useState, useEffect, forwardRef, useImperativeHandle } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { TimeScrollPicker } from "@/components/TimeScrollPicker";
import { Camera } from "lucide-react";
import { ActivityFormRef, PhotoFormData, EditingData, getCurrentTime } from "./types";

interface PhotoFormProps {
  editingData?: EditingData | null;
}

export const PhotoForm = forwardRef<ActivityFormRef, PhotoFormProps>(({
  editingData,
}, ref) => {
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
      setPhotoUrl(editingData.details.photoUrl || null);
      setNote(editingData.details.note || '');
    }
  }, [editingData]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    getValues: (): PhotoFormData => ({
      type: 'photo',
      time,
      selectedDate,
      note,
      photo,
      photoUrl,
    }),
    validate: () => !!(photo || photoUrl), // Photo required
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
});

PhotoForm.displayName = 'PhotoForm';
