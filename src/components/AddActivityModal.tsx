import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumericKeypad } from "./NumericKeypad";
import { Activity } from "./ActivityCard";
import { Plus, Milk, Droplet, Moon, StickyNote, Camera, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/utils/logger";
import { useLanguage } from "@/contexts/LanguageContext";
import { FeedForm, DiaperForm, NapForm, NoteForm, SolidsForm, PhotoForm } from "./activity-forms";
import { rawStorage, StorageKeys } from "@/hooks/useLocalStorage";

interface AddActivityModalProps {
  onAddActivity: (activity: Omit<Activity, "id">, activityDate?: Date, activityTime?: string) => Promise<void> | void;
  isOpen?: boolean;
  onClose?: () => void;
  showFixedButton?: boolean;
  editingActivity?: Activity | null;
  onEditActivity?: (activity: Activity, selectedDate: Date, activityTime: string) => Promise<void>;
  onDeleteActivity?: (activityId: string) => void;
  householdId?: string;
  quickAddType?: 'feed' | 'nap' | 'diaper' | null;
  prefillActivity?: Activity | null;
}

type ActivityTypeValue = "feed" | "diaper" | "nap" | "note" | "solids" | "photo" | "";

export const AddActivityModal = ({ 
  onAddActivity, 
  isOpen, 
  onClose, 
  showFixedButton = false, 
  editingActivity, 
  onEditActivity, 
  onDeleteActivity, 
  householdId, 
  quickAddType, 
  prefillActivity
}: AddActivityModalProps) => {
  const { t } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onClose ? onClose : setInternalOpen;
  const [activityType, setActivityType] = useState<ActivityTypeValue>("");
  
  const getCurrentTime = (date: Date = new Date()) => {
    return date.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  };
  
  const [time, setTime] = useState(() => getCurrentTime());
  
  // Feed state
  const [feedType, setFeedType] = useState<"bottle" | "nursing">("bottle");
  const [quantity, setQuantity] = useState("");
  // Get last bottle unit from localStorage (already saved when user logs a feed)
  const getLastBottleUnit = (): "oz" | "ml" => {
    const lastUnit = rawStorage.get(StorageKeys.LAST_USED_UNIT, '') as "oz" | "ml";
    return lastUnit || "oz";
  };
  
  const [unit, setUnit] = useState<"oz" | "ml">(getLastBottleUnit);
  const [minutesLeft, setMinutesLeft] = useState("");
  const [minutesRight, setMinutesRight] = useState("");
  const [isDreamFeed, setIsDreamFeed] = useState(false);
  
  // Diaper state
  const [diaperType, setDiaperType] = useState<"wet" | "poopy" | "both">("wet");
  const [hasLeak, setHasLeak] = useState(false);
  const [hasCream, setHasCream] = useState(false);
  
  // Sleep state
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hasEndTime, setHasEndTime] = useState(true);
  
  // General
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(new Date());
  
  // Solids state
  const [solidsDescription, setSolidsDescription] = useState("");
  const [allergens, setAllergens] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Parse time to minutes helper
  const parseTimeToMinutes = (timeStr: string): number => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const period = match[3].toUpperCase();
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  // Load editing activity data
  useEffect(() => {
    if (editingActivity) {
      setActivityType(editingActivity.type);
      setTime(editingActivity.time);
      
      if (editingActivity.loggedAt) {
        const loggedDate = new Date(editingActivity.loggedAt);
        setSelectedDate(loggedDate);
        
        if (editingActivity.type === "nap" && editingActivity.details.startTime && editingActivity.details.endTime) {
          const startMinutes = parseTimeToMinutes(editingActivity.details.startTime);
          const endMinutes = parseTimeToMinutes(editingActivity.details.endTime);
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
      
      if (editingActivity.type === "feed") {
        const details = editingActivity.details;
        if (details.feedType === 'bottle' || details.feedType === 'nursing') {
          setFeedType(details.feedType);
        }
        setQuantity(details.quantity || "");
        setUnit(details.unit || "oz");
        setMinutesLeft(details.minutesLeft || "");
        setMinutesRight(details.minutesRight || "");
        setIsDreamFeed(details.isDreamFeed || false);
        setNote(details.note || "");
      } else if (editingActivity.type === "diaper") {
        setDiaperType(editingActivity.details.diaperType || "wet");
        setHasLeak(editingActivity.details.hasLeak || false);
        setHasCream(editingActivity.details.hasCream || false);
        setNote(editingActivity.details.note || "");
      } else if (editingActivity.type === "nap") {
        setStartTime(editingActivity.details.startTime || "");
        setEndTime(editingActivity.details.endTime || "");
        setHasEndTime(!!editingActivity.details.endTime);
      } else if (editingActivity.type === "note") {
        setNote(editingActivity.details.note || "");
        setPhotoUrl((editingActivity.details as any).photoUrl || null);
      } else if (editingActivity.type === "solids") {
        setSolidsDescription(editingActivity.details.solidDescription || "");
        setAllergens((editingActivity.details as any).allergens || []);
      } else if (editingActivity.type === "photo") {
        setPhotoUrl((editingActivity.details as any).photoUrl || null);
        setNote(editingActivity.details.note || "");
      }
    } else {
      const lastUnit = rawStorage.get(StorageKeys.LAST_USED_UNIT, '') as "oz" | "ml";
      if (lastUnit) setUnit(lastUnit);
    }
  }, [editingActivity]);

  // Load last quantity for bottle feeds
  useEffect(() => {
    if (!editingActivity && feedType === "bottle" && !quantity) {
      const lastQuantity = rawStorage.get(StorageKeys.LAST_FEED_QUANTITY, '');
      if (lastQuantity) setQuantity(lastQuantity);
    }
  }, [feedType, editingActivity, quantity]);

  // Load last nursing times
  useEffect(() => {
    if (!editingActivity && feedType === "nursing" && !minutesLeft && !minutesRight) {
      const lastLeft = rawStorage.get(StorageKeys.LAST_NURSING_LEFT, '');
      const lastRight = rawStorage.get(StorageKeys.LAST_NURSING_RIGHT, '');
      if (lastLeft) setMinutesLeft(lastLeft);
      if (lastRight) setMinutesRight(lastRight);
    }
  }, [feedType, editingActivity, minutesLeft, minutesRight]);

  // Reset time when opening for new activity
  useEffect(() => {
    if (open && !editingActivity && !quickAddType) {
      const current = getCurrentTime();
      setTime(current);
      if (!startTime) setStartTime(current);
      setSelectedDate(new Date());
      setSelectedEndDate(new Date());
      setUnit(getLastBottleUnit());
    }
  }, [open, editingActivity, quickAddType]);

  // Handle quick add
  useEffect(() => {
    if (open && quickAddType && !editingActivity) {
      setActivityType(quickAddType);
      const currentTime = getCurrentTime();
      setTime(currentTime);
      setStartTime(currentTime);
      
      if (prefillActivity) {
        if (quickAddType === 'feed' && prefillActivity.type === 'feed') {
          const details = prefillActivity.details;
          if (details.feedType === 'bottle' || details.feedType === 'nursing') {
            setFeedType(details.feedType);
          }
          setQuantity(details.quantity || "");
          setUnit(details.unit || "oz");
          setMinutesLeft(details.minutesLeft || "");
          setMinutesRight(details.minutesRight || "");
          setIsDreamFeed(details.isDreamFeed || false);
        } else if (quickAddType === 'diaper' && prefillActivity.type === 'diaper') {
          setDiaperType(prefillActivity.details.diaperType || "wet");
          setHasLeak(prefillActivity.details.hasLeak || false);
          setHasCream(prefillActivity.details.hasCream || false);
        }
      }
      
      if (quickAddType === 'nap') {
        setEndTime("");
        setHasEndTime(false);
      }
    }
  }, [open, quickAddType, prefillActivity, editingActivity]);

  const resetForm = () => {
    setTime(getCurrentTime());
    setFeedType("bottle");
    setQuantity("");
    setUnit(getLastBottleUnit());
    setMinutesLeft("");
    setMinutesRight("");
    setIsDreamFeed(false);
    setDiaperType("wet");
    setHasLeak(false);
    setHasCream(false);
    setStartTime("");
    setEndTime("");
    setHasEndTime(true);
    setSolidsDescription("");
    setAllergens([]);
    setNote("");
    setPhoto(null);
    setPhotoUrl(null);
    setSelectedDate(new Date());
    setSelectedEndDate(new Date());
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');
      if (!householdId) throw new Error('Household not found');

      const fileExt = file.name.split('.').pop();
      const fileName = `${householdId}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('baby-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('baby-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      logError('Photo upload', error);
      return null;
    }
  };

  const handleSubmit = async () => {
    if (isSaving || !activityType) return;
    
    if (activityType === "photo" && !photo && !photoUrl) return;

    let activityTime = time;
    if (!activityTime && activityType !== "nap") {
      activityTime = getCurrentTime();
      setTime(activityTime);
    }

    if (activityType === "feed" && feedType === "bottle") {
      const quantityNum = parseFloat(quantity);
      if (!quantity || isNaN(quantityNum) || quantityNum <= 0) return;
    }

    if (activityType === "feed" && feedType === "nursing" && (!minutesLeft && !minutesRight)) return;
    if (activityType === "nap" && !startTime) return;
    if (activityType === "nap" && hasEndTime && !endTime) return;

    const details: any = {};
    
    switch (activityType) {
      case "feed":
        details.feedType = feedType;
        if (feedType === "bottle" && quantity) {
          details.quantity = quantity;
          details.unit = unit;
          rawStorage.set(StorageKeys.LAST_USED_UNIT, unit);
          rawStorage.set(StorageKeys.LAST_FEED_QUANTITY, quantity);
        } else if (feedType === "nursing") {
          if (minutesLeft) {
            details.minutesLeft = minutesLeft;
            rawStorage.set(StorageKeys.LAST_NURSING_LEFT, minutesLeft);
          }
          if (minutesRight) {
            details.minutesRight = minutesRight;
            rawStorage.set(StorageKeys.LAST_NURSING_RIGHT, minutesRight);
          }
        }
        details.isDreamFeed = isDreamFeed;
        if (note) details.note = note;
        break;
      case "diaper":
        details.diaperType = diaperType;
        details.hasLeak = hasLeak;
        details.hasCream = hasCream;
        if (note) details.note = note;
        break;
      case "nap":
        details.startTime = startTime;
        if (hasEndTime && endTime) {
          details.endTime = endTime;
          const endYear = selectedEndDate.getFullYear();
          const endMonth = String(selectedEndDate.getMonth() + 1).padStart(2, '0');
          const endDay = String(selectedEndDate.getDate()).padStart(2, '0');
          details.end_date_local = `${endYear}-${endMonth}-${endDay}`;
        }
        break;
      case "note":
        details.note = note;
        if (photoUrl) details.photoUrl = photoUrl;
        break;
      case "solids":
        if (solidsDescription) details.solidDescription = solidsDescription;
        if (allergens.length > 0) details.allergens = allergens;
        break;
      case "photo":
        if (note) details.note = note;
        if (photoUrl) details.photoUrl = photoUrl;
        break;
    }

    if (photo && !photoUrl) {
      setUploadingPhoto(true);
      const uploadedPhotoUrl = await uploadPhoto(photo);
      setUploadingPhoto(false);
      
      if (uploadedPhotoUrl) {
        details.photoUrl = uploadedPhotoUrl;
        setPhotoUrl(uploadedPhotoUrl);
      } else if (activityType === "photo") {
        return;
      }
    }

    setIsSaving(true);
    
    try {
      if (editingActivity && onEditActivity) {
        const updatedActivity: Activity = {
          ...editingActivity,
          type: activityType as any,
          time: activityType === "nap" ? startTime : activityTime,
          details,
        };
        await onEditActivity(updatedActivity, selectedDate, activityType === "nap" ? startTime : activityTime);
      } else {
        const newActivity: Omit<Activity, "id"> = {
          type: activityType as any,
          time: activityType === "nap" ? startTime : activityTime,
          details,
        };
        await onAddActivity(newActivity, selectedDate, activityType === "nap" ? startTime : activityTime);
      }
      
      resetForm();
      if (onClose) onClose();
      else setInternalOpen(false);
    } catch (error) {
      logError('Save activity', error);
    } finally {
      setIsSaving(false);
    }
  };

  const ACTIVITY_TYPES = [
    { type: "feed", icon: Milk, label: t('feeding') },
    { type: "solids", icon: Utensils, label: t('solids') },
    { type: "nap", icon: Moon, label: t('sleep') },
    { type: "diaper", icon: Droplet, label: t('diaper') },
    { type: "note", icon: StickyNote, label: t('note') },
    { type: "photo", icon: Camera, label: t('photo') }
  ] as const;

  return (
    <>
      <Dialog open={open} onOpenChange={isOpen !== undefined ? (o) => !o && onClose?.() : setInternalOpen}>
        {!isOpen && showFixedButton && (
          <DialogTrigger asChild>
            <Button 
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-soft hover:shadow-lg hover:bg-primary/90 transition-all duration-300" 
              size="icon"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col [&>button[data-state]]:hidden">
          <DialogHeader className="pb-4 flex-shrink-0">
            <DialogTitle>
              {editingActivity ? t('editActivity') : 'Log Activity'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1 -mx-1">
            <div className="space-y-4">
              {/* Activity Type Selection */}
              <div className="grid grid-cols-3 gap-2">
                {ACTIVITY_TYPES.map(({ type, icon: Icon, label }) => (
                  <button
                    key={type}
                    type="button"
                    className="btn-select-lg"
                    data-selected={activityType === type}
                    onClick={() => setActivityType(type)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-[10px] font-semibold">{label}</span>
                  </button>
                ))}
              </div>

              {/* Type-specific forms */}
              {activityType === "feed" && (
                <FeedForm
                  time={time}
                  setTime={setTime}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  feedType={feedType}
                  setFeedType={setFeedType}
                  quantity={quantity}
                  unit={unit}
                  minutesLeft={minutesLeft}
                  setMinutesLeft={setMinutesLeft}
                  minutesRight={minutesRight}
                  setMinutesRight={setMinutesRight}
                  isDreamFeed={isDreamFeed}
                  setIsDreamFeed={setIsDreamFeed}
                  note={note}
                  setNote={setNote}
                  onOpenKeypad={() => setShowKeypad(true)}
                />
              )}

              {activityType === "diaper" && (
                <DiaperForm
                  time={time}
                  setTime={setTime}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  diaperType={diaperType}
                  setDiaperType={setDiaperType}
                  hasLeak={hasLeak}
                  setHasLeak={setHasLeak}
                  hasCream={hasCream}
                  setHasCream={setHasCream}
                  note={note}
                  setNote={setNote}
                />
              )}

              {activityType === "nap" && (
                <NapForm
                  startTime={startTime}
                  setStartTime={setStartTime}
                  endTime={endTime}
                  setEndTime={setEndTime}
                  hasEndTime={hasEndTime}
                  setHasEndTime={setHasEndTime}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  selectedEndDate={selectedEndDate}
                  setSelectedEndDate={setSelectedEndDate}
                />
              )}

              {activityType === "note" && (
                <NoteForm
                  time={time}
                  setTime={setTime}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  note={note}
                  setNote={setNote}
                  photo={photo}
                  setPhoto={setPhoto}
                  photoUrl={photoUrl}
                  setPhotoUrl={setPhotoUrl}
                />
              )}

              {activityType === "solids" && (
                <SolidsForm
                  time={time}
                  setTime={setTime}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  description={solidsDescription}
                  setDescription={setSolidsDescription}
                  allergens={allergens}
                  setAllergens={setAllergens}
                />
              )}

              {activityType === "photo" && (
                <PhotoForm
                  time={time}
                  setTime={setTime}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  note={note}
                  setNote={setNote}
                  photo={photo}
                  setPhoto={setPhoto}
                  photoUrl={photoUrl}
                  setPhotoUrl={setPhotoUrl}
                />
              )}
            </div>
          </div>

          <div className="modal-footer">
            <div className="modal-actions">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => onClose ? onClose() : setInternalOpen(false)} 
                className="modal-btn"
              >
                Cancel
              </Button>
              
              <Button 
                type="button"
                onClick={handleSubmit} 
                disabled={uploadingPhoto || isSaving}
                className="modal-btn"
              >
                {uploadingPhoto ? 'Uploading…' : isSaving ? 'Saving…' : (editingActivity ? 'Update' : 'Save')}
              </Button>
            </div>
            
            {editingActivity && onDeleteActivity && (
              <div className="text-center">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await onDeleteActivity(editingActivity.id);
                      if (onClose) onClose();
                    } catch (err) {
                      logError('Delete activity', err);
                    }
                  }}
                  className="delete-link"
                >
                  Delete this activity
                </button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Numeric Keypad - Only for bottle feeds */}
      {feedType === "bottle" && (
        <NumericKeypad
          isOpen={showKeypad}
          onClose={() => setShowKeypad(false)}
          onSubmit={setQuantity}
          title="Enter Amount"
          unit={unit}
          initialValue={quantity}
          onUnitChange={(newUnit) => setUnit(newUnit as "oz" | "ml")}
        />
      )}
    </>
  );
};
