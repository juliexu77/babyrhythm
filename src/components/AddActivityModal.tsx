import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimeScrollPicker } from "./TimeScrollPicker";
import { NumericKeypad } from "./NumericKeypad";
import { Activity } from "./ActivityCard";
import { Plus, Baby, Palette, Moon, StickyNote, Camera, Smile, Meh, Frown, Coffee, Clock, Milk, Carrot, MoreVertical, Trash2, Ruler } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface AddActivityModalProps {
  onAddActivity: (activity: Omit<Activity, "id">, activityDate?: Date, activityTime?: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  showFixedButton?: boolean; // Add prop to control fixed button visibility
  editingActivity?: Activity | null; // Add editing support
  onEditActivity?: (activity: Activity, selectedDate: Date, activityTime: string) => void;
  onDeleteActivity?: (activityId: string) => void; // Add delete support
}

export const AddActivityModal = ({ onAddActivity, isOpen, onClose, showFixedButton = false, editingActivity, onEditActivity, onDeleteActivity }: AddActivityModalProps) => {
  const { t } = useLanguage();
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onClose ? onClose : setInternalOpen;
  const [activityType, setActivityType] = useState<"feed" | "diaper" | "nap" | "note" | "measure" | "photo" | "">(""); 
  const [time, setTime] = useState(() => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  });
  
  // Feed state
  const [feedType, setFeedType] = useState<"bottle" | "nursing" | "solid">("bottle");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<"oz" | "ml">("oz");
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
      
      // Only set time if we're starting to edit (not on subsequent rerenders)
      const currentTime = editingActivity.time;
      setTime(currentTime);
      
      // Set the selected date based on the original logged date
      if (editingActivity.loggedAt) {
        const loggedDate = new Date(editingActivity.loggedAt);
        setSelectedDate(loggedDate);
        setSelectedEndDate(loggedDate); // Initialize end date to same day by default
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

  const resetForm = () => {
    const now = new Date();
    setTime(now.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    }));
    setFeedType("bottle");
    setQuantity("");
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
    const startTime = new Date().toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
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

    onAddActivity(newActivity, selectedDate, startTime);
    
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
    setEndTime(new Date().toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    }));
  };

  const handleQuantityShortcut = (value: string) => {
    setQuantity(value);
  };

  const uploadPhoto = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('baby-photos')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('baby-photos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast({
        title: "Upload failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive"
      });
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!activityType) {
      toast({
        title: "Activity type required",
        description: "Please select an activity type.",
        variant: "destructive",
      });
      return;
    }

    // Ensure time has a value, use current time if not set
    let activityTime = time;
    if (!activityTime && activityType !== "nap") {
      activityTime = new Date().toLocaleTimeString("en-US", { 
        hour: "numeric", 
        minute: "2-digit",
        hour12: true 
      });
      setTime(activityTime);
    }

    if (activityType === "feed" && feedType === "bottle" && !quantity) {
      toast({
        title: "Feed amount required",
        description: "Please enter the amount for this feeding.",
        variant: "destructive",
      });
      return;
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
          if (minutesLeft) details.minutesLeft = minutesLeft;
          if (minutesRight) details.minutesRight = minutesRight;
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
      }
    }

    if (editingActivity && onEditActivity) {
      // Update existing activity
      const updatedActivity: Activity = {
        ...editingActivity,
        type: activityType as "feed" | "diaper" | "nap" | "note" | "measure" | "photo",
        time: activityType === "nap" ? startTime : time,
        details,
      };
      
      onEditActivity(updatedActivity, selectedDate, activityType === "nap" ? startTime : time);
    } else {
      // Create new activity
      const newActivity: Omit<Activity, "id"> = {
        type: activityType as "feed" | "diaper" | "nap" | "note" | "measure" | "photo",
        time: activityType === "nap" ? startTime : time,
        details,
      };

      onAddActivity(newActivity, selectedDate, activityTime);
    }
    
    resetForm();
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "feed": return <Baby className="h-4 w-4" />;
      case "diaper": return <Palette className="h-4 w-4" />;
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
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto [&>button[data-state]]:hidden">{/* Hide close button */}
          <DialogHeader className="pb-4">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-lg font-medium">
                {editingActivity ? t('editActivity') : t('addActivity')}
              </DialogTitle>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Activity Type Selection - Clean Grid */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { type: "feed", icon: Baby, label: t('feeding') },
                { type: "diaper", icon: Palette, label: t('diaper') },
                { type: "note", icon: StickyNote, label: t('noteText') },
                { type: "nap", icon: Moon, label: t('sleep') },
                { type: "measure", icon: Ruler, label: t('measure') },
                { type: "photo", icon: Camera, label: t('photo') }
              ].map(({ type, icon: Icon, label }) => (
                <Button
                  key={type}
                  variant={activityType === type ? "default" : "outline"}
                  className={`h-12 flex-col gap-1 ${
                    activityType === type 
                      ? 'bg-primary text-primary-foreground' 
                      : 'hover:bg-muted'
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
                     { type: "bottle", icon: Coffee, label: t('bottle') },
                      { type: "nursing", icon: Baby, label: t('nursing') },
                      { type: "solid", icon: Carrot, label: t('solid') }
                    ].map(({ type, icon: Icon, label }) => (
                      <Button
                        key={type}
                        variant={feedType === type ? "default" : "outline"}
                        className={`h-10 flex-col gap-1 text-xs ${
                          feedType === type 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
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
                          variant="outline"
                          className="w-full h-12 text-left"
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
                    <Label className="text-sm font-medium">{t('nursingTime')}</Label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">{t('leftSide')}</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={minutesLeft}
                          onChange={(e) => setMinutesLeft(e.target.value)}
                          className="text-center"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">{t('rightSide')}</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={minutesRight}
                          onChange={(e) => setMinutesRight(e.target.value)}
                          className="text-center"
                        />
                      </div>
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
                        variant={diaperType === type ? "default" : "outline"}
                        className={`h-12 ${
                          diaperType === type 
                            ? 'bg-primary text-primary-foreground' 
                            : 'hover:bg-muted'
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
                      variant={hasLeak ? "default" : "outline"}
                      size="sm"
                      className={`h-8 px-4 ${
                        hasLeak 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setHasLeak(!hasLeak)}
                    >
                      {hasLeak ? "Yes" : "No"}
                    </Button>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <Label className="text-sm">{t('diaperingCream')}</Label>
                    <Button
                      variant={hasCream ? "default" : "outline"}
                      size="sm"
                      className={`h-8 px-4 ${
                        hasCream 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}
                      onClick={() => setHasCream(!hasCream)}
                    >
                      {hasCream ? "Yes" : "No"}
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
                <Button
                  variant={isTimerActive ? "destructive" : "default"}
                  className={`w-full h-10 ${
                    !isTimerActive 
                      ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
                      : ''
                  }`}
                  onClick={isTimerActive ? stopNapTimer : startNapTimer}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  {isTimerActive ? "Stop Sleep" : "Start Sleep Timer"}
                </Button>
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
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPhoto(null);
                            setPhotoUrl(null);
                          }}
                          className="absolute top-2 right-2 h-8 bg-background/80 backdrop-blur-sm"
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
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPhoto(null);
                            setPhotoUrl(null);
                          }}
                          className="absolute top-2 right-2 h-8 bg-background/80 backdrop-blur-sm"
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



            <div className="space-y-3 pt-6 border-t">
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => onClose ? onClose() : setInternalOpen(false)} 
                  className="flex-1 h-12"
                >
                  Cancel
                </Button>
                
                <Button 
                  onClick={handleSubmit} 
                  disabled={uploadingPhoto}
                  className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {uploadingPhoto ? 'Uploading...' : (editingActivity ? 'Update' : 'Save')}
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
                          console.error('Delete failed:', err);
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
            </div>
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