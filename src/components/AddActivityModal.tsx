import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimeScrollPicker } from "./TimeScrollPicker";
import { MinuteScrollPicker } from "./MinuteScrollPicker";
import { NumericKeypad } from "./NumericKeypad";
import { Activity } from "./ActivityCard";
import { Plus, Baby, Droplet, Moon, StickyNote, Camera, Smile, Meh, Frown, Clock, Milk, Carrot, MoreVertical, Trash2, Ruler, Mic } from "lucide-react";
import { VoiceRecorder } from "./VoiceRecorder";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/utils/logger";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AddActivityModalProps {
  onAddActivity: (activity: Omit<Activity, "id">, activityDate?: Date, activityTime?: string) => Promise<void> | void;
  isOpen?: boolean;
  onClose?: () => void;
  showFixedButton?: boolean; // Add prop to control fixed button visibility
  editingActivity?: Activity | null; // Add editing support
  onEditActivity?: (activity: Activity, selectedDate: Date, activityTime: string) => Promise<void>;
  onDeleteActivity?: (activityId: string) => void; // Add delete support
  householdId?: string; // Add household ID for photo uploads
  quickAddType?: 'feed' | 'nap' | 'diaper' | null; // Quick add type
  prefillActivity?: Activity | null; // Activity to prefill from
  activities?: Activity[]; // Activities for household defaults
}

export const AddActivityModal = ({ onAddActivity, isOpen, onClose, showFixedButton = false, editingActivity, onEditActivity, onDeleteActivity, householdId, quickAddType, prefillActivity, activities }: AddActivityModalProps) => {
  const { t } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onClose ? onClose : setInternalOpen;
  const [activityType, setActivityType] = useState<"feed" | "diaper" | "nap" | "note" | "measure" | "photo" | "">(""); 
  
  // Helper function to get exact current time
  const getCurrentTime = (date: Date = new Date()) => {
    return date.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  };
  
  const [time, setTime] = useState(() => getCurrentTime());
  
  // Feed state
  const [feedType, setFeedType] = useState<"bottle" | "nursing" | "solid">("bottle");
  const [quantity, setQuantity] = useState("");
  
  // Get last bottle feed unit from household activities
  const getLastBottleUnit = (): "oz" | "ml" => {
    if (!activities || activities.length === 0) return "oz";
    
    // Find the most recent bottle feed activity
    const lastBottleFeed = activities
      .filter(a => a.type === 'feed' && a.details?.feedType === 'bottle' && a.details?.unit)
      .sort((a, b) => {
        const timeA = a.loggedAt ? new Date(a.loggedAt).getTime() : 0;
        const timeB = b.loggedAt ? new Date(b.loggedAt).getTime() : 0;
        return timeB - timeA;
      })[0];
    
    return lastBottleFeed?.details?.unit || "oz";
  };
  
  const [unit, setUnit] = useState<"oz" | "ml">(() => getLastBottleUnit());
  const [minutesLeft, setMinutesLeft] = useState("");
  const [minutesRight, setMinutesRight] = useState("");
  const [solidDescription, setSolidDescription] = useState("");
  const [reaction, setReaction] = useState<"happy" | "neutral" | "fussy" | "">("");
  const [isDreamFeed, setIsDreamFeed] = useState(false);
  
  // Diaper state
  const [diaperType, setDiaperType] = useState<"wet" | "poopy" | "both">("wet");
  const [hasLeak, setHasLeak] = useState(false);
  const [hasCream, setHasCream] = useState(false);
  
  // Sleep state
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [hasEndTime, setHasEndTime] = useState(true); // Controls whether end time is included
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  
  // General
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showKeypad, setShowKeypad] = useState(false);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedEndDate, setSelectedEndDate] = useState<Date>(new Date()); // Separate date for sleep end time
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  
  // Measure state
  const [weightLbs, setWeightLbs] = useState("");
  const [weightOz, setWeightOz] = useState("");
  const [heightInches, setHeightInches] = useState("");
  const [headCircumference, setHeadCircumference] = useState("");

  // Load last used settings and handle editing
  useEffect(() => {
    if (editingActivity) {
      // Populate form with editing activity data
      setActivityType(editingActivity.type);
      
      // Keep the original time as-is (already rounded when first created)
      setTime(editingActivity.time);
      
      // Set the selected date based on the original logged date
      if (editingActivity.loggedAt) {
        const loggedDate = new Date(editingActivity.loggedAt);
        setSelectedDate(loggedDate);
        
        // For naps, check if it's an overnight sleep (end time < start time)
        if (editingActivity.type === "nap" && editingActivity.details.startTime && editingActivity.details.endTime) {
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
          
          const startMinutes = parseTimeToMinutes(editingActivity.details.startTime);
          const endMinutes = parseTimeToMinutes(editingActivity.details.endTime);
          
          // If end time is before start time, it's an overnight sleep - set end date to next day
          if (endMinutes < startMinutes) {
            const nextDay = new Date(loggedDate);
            nextDay.setDate(nextDay.getDate() + 1);
            setSelectedEndDate(nextDay);
          } else {
            setSelectedEndDate(loggedDate);
          }
        } else {
          setSelectedEndDate(loggedDate); // Initialize end date to same day by default
        }
      }
      
      if (editingActivity.type === "feed") {
        const details = editingActivity.details;
        setFeedType(details.feedType || "bottle");
        setQuantity(details.quantity || "");
        setUnit(details.unit || "oz");
        setMinutesLeft(details.minutesLeft || "");
        setMinutesRight(details.minutesRight || "");
        setSolidDescription(details.solidDescription || "");
        setIsDreamFeed(details.isDreamFeed || false);
        setNote(details.note || "");
      } else if (editingActivity.type === "diaper") {
        const details = editingActivity.details;
        setDiaperType(details.diaperType || "wet");
        setHasLeak(details.hasLeak || false);
        setHasCream(details.hasCream || false);
        setNote(details.note || "");
      } else if (editingActivity.type === "nap") {
        const details = editingActivity.details;
        setStartTime(details.startTime || "");
        setEndTime(details.endTime || "");
        setHasEndTime(!!details.endTime); // Set checkbox based on whether end time exists
      } else if (editingActivity.type === "note") {
        setNote(editingActivity.details.note || "");
        setPhotoUrl((editingActivity.details as any).photoUrl || null);
      } else if (editingActivity.type === "measure") {
        const details = editingActivity.details;
        setWeightLbs(details.weightLbs || "");
        setWeightOz(details.weightOz || "");
        setHeightInches(details.heightInches || "");
        setHeadCircumference(details.headCircumference || "");
        setNote(details.note || "");
      } else if (editingActivity.type === "photo") {
        setPhotoUrl((editingActivity.details as any).photoUrl || null);
        setNote(editingActivity.details.note || "");
      }
    } else {
      // Load last used settings for new activities only
      const lastUnit = localStorage.getItem('lastUsedUnit') as "oz" | "ml";
      if (lastUnit) {
        setUnit(lastUnit);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingActivity]); // Only depend on editingActivity, not feedType

  // Separate effect for loading last quantity only when creating new bottle feeds
  useEffect(() => {
    if (!editingActivity && feedType === "bottle" && !quantity) {
      const lastQuantity = localStorage.getItem('lastFeedQuantity');
      if (lastQuantity) {
        setQuantity(lastQuantity);
      }
    }
  }, [feedType, editingActivity, quantity]);

  // Load last nursing times when creating new nursing feeds
  useEffect(() => {
    if (!editingActivity && feedType === "nursing" && !minutesLeft && !minutesRight) {
      const lastLeft = localStorage.getItem('lastNursingLeft');
      const lastRight = localStorage.getItem('lastNursingRight');
      if (lastLeft) setMinutesLeft(lastLeft);
      if (lastRight) setMinutesRight(lastRight);
    }
  }, [feedType, editingActivity, minutesLeft, minutesRight]);

  // Ensure new entries default to current local time when opening (but skip for quick add)
  useEffect(() => {
    if (open && !editingActivity && !quickAddType) {
      const current = getCurrentTime();
      setTime(current);
      if (!startTime) setStartTime(current);
      // Reset unit to household default for new bottle feeds
      setUnit(getLastBottleUnit());
    }
  }, [open, editingActivity, quickAddType]);

  // Handle quick add with prefilled data
  useEffect(() => {
    if (open && quickAddType && !editingActivity) {
      // Set activity type
      setActivityType(quickAddType);
      
      // ALWAYS use current time for quick add (never prefill time)
      const currentTime = getCurrentTime();
      setTime(currentTime);
      setStartTime(currentTime); // Also set start time
      
      // Pre-fill details based on type only if prefillActivity exists
      if (prefillActivity) {
        if (quickAddType === 'feed' && prefillActivity.type === 'feed') {
          const details = prefillActivity.details;
          setFeedType(details.feedType || "bottle");
          setQuantity(details.quantity || "");
          setUnit(details.unit || "oz");
          setMinutesLeft(details.minutesLeft || "");
          setMinutesRight(details.minutesRight || "");
          setSolidDescription(details.solidDescription || "");
          setIsDreamFeed(details.isDreamFeed || false);
          // Don't prefill note for quick add
        } else if (quickAddType === 'nap' && prefillActivity.type === 'nap') {
          const details = prefillActivity.details;
          // For naps, set start time to current, don't set end time (they're adding a new nap)
          setStartTime(currentTime);
          setEndTime("");
          setHasEndTime(false);
          // Don't prefill note for quick add
        } else if (quickAddType === 'diaper' && prefillActivity.type === 'diaper') {
          const details = prefillActivity.details;
          setDiaperType(details.diaperType || "wet");
          setHasLeak(details.hasLeak || false);
          setHasCream(details.hasCream || false);
          // Don't prefill note for quick add
        }
      } else {
        // No prefillActivity - just set defaults for quick add
        if (quickAddType === 'nap') {
          setStartTime(currentTime);
          setEndTime("");
          setHasEndTime(false);
        }
      }
    }
  }, [open, quickAddType, prefillActivity, editingActivity]);

  const resetForm = () => {
    setTime(getCurrentTime());
    setFeedType("bottle");
    setQuantity("");
    setUnit(getLastBottleUnit()); // Reset to household default unit
    setMinutesLeft("");
    setMinutesRight("");
    setSolidDescription("");
    setIsDreamFeed(false);
    setReaction("");
    setDiaperType("wet");
    setHasLeak(false);
    setHasCream(false);
    setStartTime("");
    setEndTime("");
    setHasEndTime(true); // Reset to default (end time included)
    setIsTimerActive(false);
    setTimerStart(null);
    setNote("");
    setPhoto(null);
    setPhotoUrl(null);
    setShowKeypad(false);
    setWeightLbs("");
    setWeightOz("");
    setHeightInches("");
    setHeadCircumference("");
  };

  const startNapTimer = async () => {
    setIsTimerActive(true);
    setTimerStart(new Date());
    const startTime = getCurrentTime();
    setStartTime(startTime);
    setHasEndTime(false); // Don't include end time when using timer
    
    // Save the activity immediately when starting the sleep timer
    const newActivity: Omit<Activity, "id"> = {
      type: "nap",
      time: startTime,
      details: {
        startTime: startTime,
        endTime: "", // Will be filled when timer is stopped
      },
    };

    // Wait for the activity to be saved before closing the modal
    await onAddActivity(newActivity, selectedDate, startTime);
    
    // Close the modal after starting the timer
    resetForm();
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  };

  const stopNapTimer = () => {
    setIsTimerActive(false);
    setEndTime(getCurrentTime());
  };

  const handleQuantityShortcut = (value: string) => {
    setQuantity(value);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        logError('Photo upload', new Error('User not authenticated'));
        toast({
          title: t('authenticationRequired'),
          description: t('pleaseLogInToUpload'),
          variant: "destructive"
        });
        throw new Error('User not authenticated');
      }
      
      if (!householdId) {
        logError('Photo upload', new Error('Household ID missing'));
        toast({
          title: "Household not found",
          description: "Unable to upload photo. Please try reloading the page.",
          variant: "destructive"
        });
        throw new Error('Household not found');
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${householdId}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('baby-photos')
        .upload(fileName, file);

      if (uploadError) {
        logError('Storage upload', uploadError);
        toast({
          title: "Upload failed",
          description: uploadError.message || "Storage error occurred.",
          variant: "destructive"
        });
        throw uploadError;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('baby-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      logError('Photo upload', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to upload photo';
      
      // Only show toast if we haven't already shown one
      if (!errorMessage.includes('authenticated') && !errorMessage.includes('Household')) {
        toast({
          title: "Upload failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
      return null;
    }
  };

  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async () => {
    if (isSaving) return; // Prevent double submission
    
    if (!activityType) {
      toast({
        title: "Activity type required",
        description: "Please select an activity type.",
        variant: "destructive",
      });
      return;
    }

    // Validate photo activity
    if (activityType === "photo" && !photo && !photoUrl) {
      toast({
        title: "Photo required",
        description: "Please select a photo to upload.",
        variant: "destructive",
      });
      return;
    }

    // Ensure time has a value, use current time if not set
    let activityTime = time;
    if (!activityTime && activityType !== "nap") {
      activityTime = getCurrentTime();
      setTime(activityTime);
    }

    if (activityType === "feed" && feedType === "bottle") {
      const quantityNum = parseFloat(quantity);
      if (!quantity || isNaN(quantityNum) || quantityNum <= 0) {
        toast({
          title: "Feed amount required",
          description: "Please enter a valid amount greater than 0.",
          variant: "destructive",
        });
        return;
      }
    }

    if (activityType === "feed" && feedType === "nursing" && (!minutesLeft && !minutesRight)) {
      toast({
        title: "Nursing time required",
        description: "Please enter minutes for left, right, or both sides.",
        variant: "destructive",
      });
      return;
    }

    if (activityType === "nap" && !startTime) {
      toast({
        title: "Start time required",
        description: "Please select a start time for the sleep.",
        variant: "destructive",
      });
      return;
    }

    if (activityType === "nap" && hasEndTime && !endTime) {
      toast({
        title: "End time required",
        description: "Please select an end time or uncheck 'Include end time'.",
        variant: "destructive",
      });
      return;
    }

    const details: any = {};
    
    switch (activityType) {
      case "feed":
        details.feedType = feedType;
        if (feedType === "bottle" && quantity) {
          details.quantity = quantity;
          details.unit = unit;
          localStorage.setItem('lastUsedUnit', unit);
          localStorage.setItem('lastFeedQuantity', quantity);
        } else if (feedType === "nursing") {
          if (minutesLeft) {
            details.minutesLeft = minutesLeft;
            localStorage.setItem('lastNursingLeft', minutesLeft);
          }
          if (minutesRight) {
            details.minutesRight = minutesRight;
            localStorage.setItem('lastNursingRight', minutesRight);
          }
        } else if (feedType === "solid") {
          if (solidDescription) details.solidDescription = solidDescription;
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
        }
        break;
      case "note":
        details.note = note;
        if (photoUrl) {
          details.photoUrl = photoUrl;
        }
        break;
      case "measure":
        if (weightLbs) details.weightLbs = weightLbs;
        if (weightOz) details.weightOz = weightOz;
        if (heightInches) details.heightInches = heightInches;
        if (headCircumference) details.headCircumference = headCircumference;
        if (note) details.note = note;
        break;
      case "photo":
        if (note) details.note = note;
        if (photoUrl) {
          details.photoUrl = photoUrl;
        }
        break;
    }

    // Upload photo if new one is selected
    if (photo && !photoUrl) {
      setUploadingPhoto(true);
      const uploadedPhotoUrl = await uploadPhoto(photo);
      setUploadingPhoto(false);
      
      if (uploadedPhotoUrl) {
        details.photoUrl = uploadedPhotoUrl;
        setPhotoUrl(uploadedPhotoUrl);
      } else {
        // If photo upload failed for a photo activity, don't proceed
        if (activityType === "photo") {
          return;
        }
      }
    }

    // Track if this is one of the first few activities
    const isEarlyActivity = !activities || activities.length < 5;

    setIsSaving(true);
    
    try {
      if (editingActivity && onEditActivity) {
        // Update existing activity
        const updatedActivity: Activity = {
          ...editingActivity,
          type: activityType as "feed" | "diaper" | "nap" | "note" | "measure" | "photo",
          time: activityType === "nap" ? startTime : time,
          details,
        };
        
        await onEditActivity(updatedActivity, selectedDate, activityType === "nap" ? startTime : time);
      } else {
        // Create new activity
        const newActivity: Omit<Activity, "id"> = {
          type: activityType as "feed" | "diaper" | "nap" | "note" | "measure" | "photo",
          time: activityType === "nap" ? startTime : time,
          details,
        };

        await onAddActivity(newActivity, selectedDate, activityTime);
        
        // Show encouraging toast for early activities
        if (isEarlyActivity) {
          toast({
            title: "Got it!",
            description: "I'm learning your baby's rhythm.",
            duration: 3000,
          });
        }
      }
      
      resetForm();
      if (onClose) {
        onClose();
      } else {
        setInternalOpen(false);
      }
    } catch (error) {
      logError('Save activity', error);
      toast({
        title: "Save failed",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "feed": return <Baby className="h-4 w-4" />;
      case "diaper": return <Droplet className="h-4 w-4" />;
      case "nap": return <Moon className="h-4 w-4" />;
      case "note": return <StickyNote className="h-4 w-4" />;
      case "measure": return <Ruler className="h-4 w-4" />;
      case "photo": return <Camera className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={isOpen !== undefined ? (open) => !open && onClose?.() : setInternalOpen}>
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
        <DialogContent className="sm:max-w-md max-h-[90vh] flex flex-col [&>button[data-state]]:hidden">{/* Hide close button */}
          <DialogHeader className="pb-4 flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-medium">
                {editingActivity ? t('editActivity') : t('addActivity')}
              </DialogTitle>
              {!editingActivity && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowVoiceRecorder(true)}
                  className="h-9 w-9"
                >
                  <Mic className="h-5 w-5" />
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-1 -mx-1">
            <div className="space-y-4">{/* Content wrapper */}
            
            {/* Activity Type Selection - Clean Grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "feed", icon: Baby, label: t('feeding') },
                { type: "diaper", icon: Droplet, label: t('diaper') },
                { type: "note", icon: StickyNote, label: t('noteText') },
                { type: "nap", icon: Moon, label: t('sleep') },
                { type: "measure", icon: Ruler, label: t('measure') },
                { type: "photo", icon: Camera, label: t('photo') }
              ].map(({ type, icon: Icon, label }) => (
                <Button
                  key={type}
                  type="button"
                  variant={activityType === type ? "default" : "outline"}
                  className={`h-12 flex-col gap-1 ${
                    activityType === type 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted border-0'
                  }`}
                  onClick={() => setActivityType(type as any)}
                >
                  <Icon className="h-4 w-4" />
                  <span className="text-xs font-medium">{label}</span>
                </Button>
              ))}
            </div>

            {/* Feed Details */}
            {activityType === "feed" && (
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">{t('type')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                     { type: "bottle", icon: Milk, label: t('bottle') },
                      { type: "nursing", icon: Baby, label: t('nursing') },
                      { type: "solid", icon: Carrot, label: t('solid') }
                    ].map(({ type, icon: Icon, label }) => (
                      <Button
                        key={type}
                        type="button"
                        variant={feedType === type ? "default" : "outline"}
                        className={`h-10 flex-col gap-1 text-xs ${
                          feedType === type 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted border-0'
                        }`}
                        onClick={() => setFeedType(type as any)}
                      >
                        <Icon className="h-3 w-3" />
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Time Picker - Moved below feed type */}
                <TimeScrollPicker 
                  value={time} 
                  selectedDate={selectedDate}
                  onChange={setTime} 
                  onDateChange={setSelectedDate}
                  label={t('time')} 
                />

                {/* Dynamic amount/details based on feed type */}
                {feedType === "bottle" && (
                  <div className="space-y-3">
                    <div className="flex items-end gap-3">
                      <div className="flex-1">
                        <Label className="text-sm font-medium mb-2 block">{t('amount')}</Label>
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full h-12 text-left border-0"
                          onClick={() => setShowKeypad(true)}
                        >
                          <span className="text-foreground">
                            {quantity ? `${quantity} ${unit}` : t('tapToEnterAmount')}
                          </span>
                        </Button>
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
                      <MinuteScrollPicker
                        value={minutesLeft}
                        onChange={setMinutesLeft}
                        label={t('leftSide')}
                      />
                      <MinuteScrollPicker
                        value={minutesRight}
                        onChange={setMinutesRight}
                        label={t('rightSide')}
                      />
                    </div>
                  </div>
                )}

                {feedType === "solid" && (
                  <div>
                    <Label htmlFor="solid-description" className="text-sm font-medium mb-2 block">{t('whatDidTheyEat')}</Label>
                    <Textarea
                      id="solid-description"
                      value={solidDescription}
                      onChange={(e) => setSolidDescription(e.target.value)}
                      placeholder="e.g., banana puree, rice cereal, cheerios..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                 )}

                <div>
                  <Label htmlFor="feed-note" className="text-sm font-medium mb-2 block">{t('notes')}</Label>
                  <Textarea
                    id="feed-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('additionalNotesFeeding')}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            {/* Diaper Details */}
            {activityType === "diaper" && (
              <div className="space-y-5">
                {/* Time Picker for Diaper */}
                <TimeScrollPicker 
                  value={time} 
                  selectedDate={selectedDate}
                  onChange={setTime} 
                  onDateChange={setSelectedDate}
                  label={t('time')} 
                />
                
                <div>
                  <Label className="text-sm font-medium mb-2 block">{t('type')}</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: "wet", label: t('wet') },
                      { type: "poopy", label: t('poopy') },
                      { type: "both", label: t('both') }
                    ].map(({ type, label }) => (
                      <Button
                        key={type}
                        type="button"
                        variant={diaperType === type ? "default" : "outline"}
                        className={`h-12 ${
                          diaperType === type 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted border-0'
                        }`}
                        onClick={() => setDiaperType(type as any)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between py-3">
                    <Label className="text-sm">{t('leak')}</Label>
                    <Button
                      type="button"
                      variant={hasLeak ? "default" : "outline"}
                      size="sm"
                      className={`h-8 px-4 ${
                        hasLeak 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted border-0'
                      }`}
                      onClick={() => setHasLeak(!hasLeak)}
                    >
                      {hasLeak ? t('yes') : t('no')}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <Label className="text-sm">{t('diaperingCream')}</Label>
                    <Button
                      type="button"
                      variant={hasCream ? "default" : "outline"}
                      size="sm"
                      className={`h-8 px-4 ${
                        hasCream 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted border-0'
                      }`}
                      onClick={() => setHasCream(!hasCream)}
                    >
                      {hasCream ? t('yes') : t('no')}
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="diaper-note" className="text-sm font-medium mb-2 block">{t('notes')}</Label>
                  <Textarea
                    id="diaper-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('additionalNotesDiaper')}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            {/* Sleep Details */}
            {activityType === "nap" && (
              <div className="space-y-4">
                <div className="space-y-3">
                  <TimeScrollPicker 
                    value={startTime} 
                    selectedDate={selectedDate}
                    onChange={setStartTime} 
                    onDateChange={setSelectedDate}
                    label={t('startTime')} 
                  />
                  
                  {/* End Time Checkbox */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="has-end-time"
                      checked={hasEndTime}
                      onCheckedChange={(checked) => {
                        setHasEndTime(checked as boolean);
                        if (!checked) {
                          setEndTime(""); // Clear end time when unchecked
                        }
                      }}
                    />
                    <Label htmlFor="has-end-time" className="text-sm font-medium">
                      {t('includeEndTime')}
                    </Label>
                  </div>

                  {/* End Time Picker - Only show when checkbox is checked */}
                  {hasEndTime && (
                    <TimeScrollPicker 
                      value={endTime} 
                      selectedDate={selectedEndDate}
                      onChange={setEndTime} 
                      onDateChange={setSelectedEndDate}
                      label={t('endTime')} 
                    />
                  )}
                </div>
              </div>
            )}

            {/* Note Details */}
            {activityType === "note" && (
              <div className="space-y-4">
                {/* Time Picker */}
                <TimeScrollPicker 
                  value={time} 
                  selectedDate={selectedDate}
                  onChange={setTime} 
                  onDateChange={setSelectedDate}
                  label={t('time')} 
                />

                <div>
                  <Label htmlFor="note" className="text-sm font-medium mb-2 block">{t('noteText')}</Label>
                  <Textarea
                    id="note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('enterNoteHere')}
                    rows={4}
                    className="resize-none"
                  />
                </div>

                {/* Photo Upload for Notes */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">{t('photoOptional')}</Label>
                  <div className="space-y-3">
                    {/* Photo Preview */}
                    {(photo || photoUrl) && (
                      <div className="relative">
                        <img
                          src={photo ? URL.createObjectURL(photo) : photoUrl!}
                          alt={t('selectedPhoto')}
                          className="w-full h-32 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPhoto(null);
                            setPhotoUrl(null);
                          }}
                          className="absolute top-2 right-2 h-8 bg-background/80 backdrop-blur-sm border-0"
                        >
                          {t('remove')}
                        </Button>
                      </div>
                    )}
                    
                    {/* Upload Area */}
                    <div className="border-2 border-dashed border-border rounded-lg p-4">
                      <input
                        type="file"
                        accept="image/*"
                       onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (!file.type.startsWith('image/')) {
                              toast({
                                title: "Invalid file type",
                                description: "Please select an image file.",
                                variant: "destructive"
                              });
                              return;
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              toast({
                                title: "File too large",
                                description: "Please select an image smaller than 10MB.",
                                variant: "destructive"
                              });
                              return;
                            }
                            setPhoto(file);
                            setPhotoUrl(null);
                          }
                        }}
                        className="hidden"
                        id="photo-input"
                      />
                      <label
                        htmlFor="photo-input"
                        className="flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                      >
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
              </div>
            )}

            {/* Measure Details */}
            {activityType === "measure" && (
              <div className="space-y-4">
                <TimeScrollPicker 
                  value={time} 
                  selectedDate={selectedDate}
                  onChange={setTime} 
                  onDateChange={setSelectedDate}
                  label={t('time')} 
                />

                <div>
                  <Label className="text-sm font-medium mb-2 block">{t('weight')}</Label>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">{t('pounds')}</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={weightLbs}
                        onChange={(e) => setWeightLbs(e.target.value)}
                        className="text-center"
                      />
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">{t('ounces')}</Label>
                      <Input
                        type="number"
                        placeholder="0"
                        value={weightOz}
                        onChange={(e) => setWeightOz(e.target.value)}
                        className="text-center"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">{t('heightInches')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={heightInches}
                    onChange={(e) => setHeightInches(e.target.value)}
                    className="text-center"
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium mb-2 block">{t('headCircumferenceInches')}</Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0.0"
                    value={headCircumference}
                    onChange={(e) => setHeadCircumference(e.target.value)}
                    className="text-center"
                  />
                </div>

                <div>
                  <Label htmlFor="measure-note" className="text-sm font-medium mb-2 block">{t('notes')}</Label>
                  <Textarea
                    id="measure-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder={t('doctorVisitGrowthCheck')}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            {/* Photo Activity Details */}
            {activityType === "photo" && (
              <div className="space-y-4">
                <TimeScrollPicker 
                  value={time} 
                  selectedDate={selectedDate}
                  onChange={setTime} 
                  onDateChange={setSelectedDate}
                  label="Time" 
                />

                <div>
                  <Label className="text-sm font-medium mb-2 block">Photo</Label>
                  <div className="space-y-3">
                    {(photo || photoUrl) && (
                      <div className="relative">
                        <img
                          src={photo ? URL.createObjectURL(photo) : photoUrl!}
                          alt="Selected photo"
                          className="w-full h-48 object-cover rounded-lg border"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPhoto(null);
                            setPhotoUrl(null);
                          }}
                          className="absolute top-2 right-2 h-8 bg-background/80 backdrop-blur-sm border-0"
                        >
                          Remove
                        </Button>
                      </div>
                    )}
                    
                    <div className="border-2 border-dashed border-border rounded-lg p-6">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (!file.type.startsWith('image/')) {
                              toast({
                                title: "Invalid file type",
                                description: "Please select an image file.",
                                variant: "destructive"
                              });
                              return;
                            }
                            if (file.size > 10 * 1024 * 1024) {
                              toast({
                                title: "File too large",
                                description: "Please select an image smaller than 10MB.",
                                variant: "destructive"
                              });
                              return;
                            }
                            setPhoto(file);
                            setPhotoUrl(null);
                          }
                        }}
                        className="hidden"
                        id="photo-activity-input"
                      />
                      <label
                        htmlFor="photo-activity-input"
                        className="flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
                      >
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
                </div>

                <div>
                  <Label htmlFor="photo-caption" className="text-sm font-medium mb-2 block">Caption (optional)</Label>
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
            )}


            </div>{/* End content wrapper */}
          </div>{/* End scrollable area */}

            <div className="space-y-3 pt-4 border-t flex-shrink-0">{/* Buttons section */}
              <div className="flex gap-3">
                <Button 
                  type="button"
                  variant="outline" 
                  onClick={() => onClose ? onClose() : setInternalOpen(false)} 
                  className="flex-1 h-12 border-0"
                >
                  Cancel
                </Button>
                
                <Button 
                  type="button"
                  onClick={handleSubmit} 
                  disabled={uploadingPhoto || isSaving}
                  className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {uploadingPhoto ? 'Uploading…' : isSaving ? 'Saving…' : (editingActivity ? 'Update' : 'Save')}
                </Button>
              </div>
              
              {/* Delete link when editing */}
              {editingActivity && onDeleteActivity && (
                <div className="text-center">
                  <button
                    type="button"
                    onClick={async () => {
                      if (editingActivity && onDeleteActivity) {
                        try {
                          await onDeleteActivity(editingActivity.id);
                          if (onClose) onClose();
                        } catch (err) {
                          logError('Delete activity', err);
                          toast({
                            title: 'Error deleting activity',
                            description: 'Please sign in and try again.',
                            variant: 'destructive'
                          });
                        }
                      }
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
                  >
                    Delete this activity
                  </button>
                </div>
              )}
            </div>{/* End buttons section */}
        </DialogContent>
      </Dialog>
      
      {/* Voice Recorder Dialog */}
      <Dialog open={showVoiceRecorder} onOpenChange={setShowVoiceRecorder}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('voiceInput')}</DialogTitle>
          </DialogHeader>
          <VoiceRecorder
            onActivityParsed={(activities) => {
              // Process parsed activities and add them
              activities.forEach(async (activity) => {
                await onAddActivity(activity);
              });
              resetForm();
              setShowVoiceRecorder(false);
              if (onClose) {
                onClose();
              } else {
                setInternalOpen(false);
              }
            }}
            autoStart={true}
          />
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