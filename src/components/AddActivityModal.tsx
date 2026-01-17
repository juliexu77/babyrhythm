import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NumericKeypad } from "./NumericKeypad";
import { Activity } from "./ActivityCard";
import { Plus, Milk, Droplet, Moon, StickyNote, Camera, Utensils } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/utils/logger";
import { useLanguage } from "@/contexts/LanguageContext";
import { 
  FeedForm, 
  DiaperForm, 
  NapForm, 
  NoteForm, 
  SolidsForm, 
  PhotoForm,
  ActivityFormRef,
  ActivityFormData,
  EditingData,
  getCurrentTime
} from "./activity-forms";
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

const ACTIVITY_TYPES = [
  { type: "feed", icon: Milk, label: 'feeding' },
  { type: "solids", icon: Utensils, label: 'solids' },
  { type: "nap", icon: Moon, label: 'sleep' },
  { type: "diaper", icon: Droplet, label: 'diaper' },
  { type: "note", icon: StickyNote, label: 'note' },
  { type: "photo", icon: Camera, label: 'photo' }
] as const;

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
  const [activityType, setActivityType] = useState<ActivityTypeValue>("");
  const [isSaving, setIsSaving] = useState(false);
  
  // Sync activity type when editing/quickAdd changes
  useEffect(() => {
    if (open) {
      setActivityType(editingActivity?.type || quickAddType || "");
    }
  }, [open, editingActivity, quickAddType]);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  
  // Keypad state
  const [showKeypad, setShowKeypad] = useState(false);
  const [keypadValue, setKeypadValue] = useState('');
  const [keypadUnit, setKeypadUnit] = useState<'oz' | 'ml'>('oz');
  const keypadOnSubmit = useRef<((value: string) => void) | null>(null);
  const keypadOnUnitChange = useRef<((unit: 'oz' | 'ml') => void) | null>(null);
  
  // Form refs
  const feedFormRef = useRef<ActivityFormRef>(null);
  const diaperFormRef = useRef<ActivityFormRef>(null);
  const napFormRef = useRef<ActivityFormRef>(null);
  const noteFormRef = useRef<ActivityFormRef>(null);
  const solidsFormRef = useRef<ActivityFormRef>(null);
  const photoFormRef = useRef<ActivityFormRef>(null);

  // Set activity type when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setActivityType(editingActivity?.type || quickAddType || "");
    }
    if (!newOpen) {
      onClose?.();
      if (isOpen === undefined) setInternalOpen(false);
    } else if (isOpen === undefined) {
      setInternalOpen(true);
    }
  };

  // Get editing data for forms
  const getEditingData = (): EditingData | null => {
    if (!editingActivity) return null;
    return {
      time: editingActivity.time,
      loggedAt: editingActivity.loggedAt,
      details: editingActivity.details,
    };
  };

  // Get prefill data for quick add
  const getPrefillData = (): EditingData | null => {
    if (!prefillActivity || editingActivity) return null;
    return {
      time: prefillActivity.time,
      details: prefillActivity.details,
    };
  };

  // Get the current form ref
  const getCurrentFormRef = () => {
    switch (activityType) {
      case 'feed': return feedFormRef;
      case 'diaper': return diaperFormRef;
      case 'nap': return napFormRef;
      case 'note': return noteFormRef;
      case 'solids': return solidsFormRef;
      case 'photo': return photoFormRef;
      default: return null;
    }
  };

  // Upload photo to storage
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

  // Build activity details from form data
  const buildActivityDetails = async (formData: ActivityFormData) => {
    const details: Record<string, any> = {};

    switch (formData.type) {
      case 'feed':
        details.feedType = formData.feedType;
        if (formData.feedType === 'bottle' && formData.quantity) {
          details.quantity = formData.quantity;
          details.unit = formData.unit;
          rawStorage.set(StorageKeys.LAST_USED_UNIT, formData.unit);
          rawStorage.set(StorageKeys.LAST_FEED_QUANTITY, formData.quantity);
        } else if (formData.feedType === 'nursing') {
          if (formData.minutesLeft) {
            details.minutesLeft = formData.minutesLeft;
            rawStorage.set(StorageKeys.LAST_NURSING_LEFT, formData.minutesLeft);
          }
          if (formData.minutesRight) {
            details.minutesRight = formData.minutesRight;
            rawStorage.set(StorageKeys.LAST_NURSING_RIGHT, formData.minutesRight);
          }
        }
        details.isDreamFeed = formData.isDreamFeed;
        if (formData.note) details.note = formData.note;
        break;

      case 'diaper':
        details.diaperType = formData.diaperType;
        details.hasLeak = formData.hasLeak;
        details.hasCream = formData.hasCream;
        if (formData.note) details.note = formData.note;
        break;

      case 'nap':
        details.startTime = formData.startTime;
        if (formData.hasEndTime && formData.endTime) {
          details.endTime = formData.endTime;
          const endYear = formData.selectedEndDate.getFullYear();
          const endMonth = String(formData.selectedEndDate.getMonth() + 1).padStart(2, '0');
          const endDay = String(formData.selectedEndDate.getDate()).padStart(2, '0');
          details.end_date_local = `${endYear}-${endMonth}-${endDay}`;
        }
        break;

      case 'note':
        details.note = formData.note;
        if (formData.photo && !formData.photoUrl) {
          setUploadingPhoto(true);
          const url = await uploadPhoto(formData.photo);
          setUploadingPhoto(false);
          if (url) details.photoUrl = url;
        } else if (formData.photoUrl) {
          details.photoUrl = formData.photoUrl;
        }
        break;

      case 'solids':
        if (formData.description) details.solidDescription = formData.description;
        if (formData.allergens.length > 0) details.allergens = formData.allergens;
        break;

      case 'photo':
        if (formData.note) details.note = formData.note;
        if (formData.photo && !formData.photoUrl) {
          setUploadingPhoto(true);
          const url = await uploadPhoto(formData.photo);
          setUploadingPhoto(false);
          if (url) {
            details.photoUrl = url;
          } else {
            return null; // Photo required but upload failed
          }
        } else if (formData.photoUrl) {
          details.photoUrl = formData.photoUrl;
        } else {
          return null; // Photo required
        }
        break;
    }

    return details;
  };

  // Handle form submission
  const handleSubmit = async () => {
    if (isSaving || !activityType) return;

    const formRef = getCurrentFormRef();
    if (!formRef?.current) return;

    // Validate
    if (!formRef.current.validate()) return;

    // Get form data
    const formData = formRef.current.getValues();
    
    setIsSaving(true);

    try {
      const details = await buildActivityDetails(formData);
      if (details === null) {
        setIsSaving(false);
        return; // Validation failed (e.g., photo required but not provided)
      }

      const activityTime = formData.type === 'nap' 
        ? (formData as any).startTime 
        : formData.time || getCurrentTime();

      if (editingActivity && onEditActivity) {
        const updatedActivity: Activity = {
          ...editingActivity,
          type: activityType as any,
          time: activityTime,
          details,
        };
        await onEditActivity(updatedActivity, formData.selectedDate, activityTime);
      } else {
        const newActivity: Omit<Activity, "id"> = {
          type: activityType as any,
          time: activityTime,
          details,
        };
        await onAddActivity(newActivity, formData.selectedDate, activityTime);
      }

      // Reset and close
      formRef.current.reset();
      setActivityType("");
      onClose?.();
      if (isOpen === undefined) setInternalOpen(false);
    } catch (error) {
      logError('Save activity', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle keypad open
  const handleOpenKeypad = (
    currentValue: string,
    unit: 'oz' | 'ml',
    onSubmit: (value: string) => void,
    onUnitChange: (unit: 'oz' | 'ml') => void
  ) => {
    setKeypadValue(currentValue);
    setKeypadUnit(unit);
    keypadOnSubmit.current = onSubmit;
    keypadOnUnitChange.current = onUnitChange;
    setShowKeypad(true);
  };

  const handleKeypadSubmit = (value: string) => {
    keypadOnSubmit.current?.(value);
    setShowKeypad(false);
  };

  const handleKeypadUnitChange = (newUnit: 'oz' | 'ml') => {
    setKeypadUnit(newUnit);
    keypadOnUnitChange.current?.(newUnit);
  };

  const editingData = getEditingData();
  const prefillData = getPrefillData();

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
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
                    <span className="text-[10px] font-semibold">{t(label)}</span>
                  </button>
                ))}
              </div>

              {/* Self-contained forms */}
              {activityType === "feed" && (
                <FeedForm
                  ref={feedFormRef}
                  editingData={editingData}
                  prefillData={prefillData}
                  onOpenKeypad={handleOpenKeypad}
                />
              )}

              {activityType === "diaper" && (
                <DiaperForm
                  ref={diaperFormRef}
                  editingData={editingData}
                  prefillData={prefillData}
                />
              )}

              {activityType === "nap" && (
                <NapForm
                  ref={napFormRef}
                  editingData={editingData}
                  isQuickAdd={!!quickAddType && quickAddType === 'nap'}
                />
              )}

              {activityType === "note" && (
                <NoteForm
                  ref={noteFormRef}
                  editingData={editingData}
                />
              )}

              {activityType === "solids" && (
                <SolidsForm
                  ref={solidsFormRef}
                  editingData={editingData}
                />
              )}

              {activityType === "photo" && (
                <PhotoForm
                  ref={photoFormRef}
                  editingData={editingData}
                />
              )}
            </div>
          </div>

          <div className="modal-footer">
            <div className="modal-actions">
              <Button 
                type="button"
                variant="outline" 
                onClick={() => {
                  onClose?.();
                  if (isOpen === undefined) setInternalOpen(false);
                }}
                className="modal-btn"
              >
                Cancel
              </Button>
              
              <Button 
                type="button"
                onClick={handleSubmit} 
                disabled={uploadingPhoto || isSaving || !activityType}
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
                      onClose?.();
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
      
      {/* Numeric Keypad */}
      <NumericKeypad
        isOpen={showKeypad}
        onClose={() => setShowKeypad(false)}
        onSubmit={handleKeypadSubmit}
        title="Enter Amount"
        unit={keypadUnit}
        initialValue={keypadValue}
        onUnitChange={handleKeypadUnitChange}
      />
    </>
  );
};
