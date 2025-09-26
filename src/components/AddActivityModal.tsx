import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TimeScrollPicker } from "./TimeScrollPicker";
import { NumericKeypad } from "./NumericKeypad";
import { Activity } from "./ActivityCard";
import { Plus, Baby, Palette, Moon, StickyNote, Camera, Smile, Meh, Frown, Coffee, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { FirstTimeTooltip } from "./FirstTimeTooltip";

interface AddActivityModalProps {
  onAddActivity: (activity: Omit<Activity, "id">) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const AddActivityModal = ({ onAddActivity, isOpen, onClose }: AddActivityModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onClose ? onClose : setInternalOpen;
  const [activityType, setActivityType] = useState<"feed" | "diaper" | "nap" | "note" | "">(""); 
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
  const [reaction, setReaction] = useState<"happy" | "neutral" | "fussy" | "">("");
  
  // Diaper state
  const [diaperType, setDiaperType] = useState<"wet" | "poopy" | "both">("wet");
  const [hasLeak, setHasLeak] = useState(false);
  const [hasCream, setHasCream] = useState(false);
  
  // Nap state
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [timerStart, setTimerStart] = useState<Date | null>(null);
  
  // General
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [showKeypad, setShowKeypad] = useState(false);

  const resetForm = () => {
    const now = new Date();
    setTime(now.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    }));
    setFeedType("bottle");
    setQuantity("");
    setReaction("");
    setDiaperType("wet");
    setHasLeak(false);
    setHasCream(false);
    setStartTime("");
    setEndTime("");
    setIsTimerActive(false);
    setTimerStart(null);
    setNote("");
    setPhoto(null);
    setShowKeypad(false);
  };

  const startNapTimer = () => {
    setIsTimerActive(true);
    setTimerStart(new Date());
    setStartTime(new Date().toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    }));
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

  const handleSubmit = () => {
    if (!activityType) {
      toast({
        title: "Activity type required",
        description: "Please select an activity type.",
        variant: "destructive",
      });
      return;
    }

    if (!time && activityType !== "nap") {
      toast({
        title: "Time required",
        description: "Please select a time for this activity.",
        variant: "destructive",
      });
      return;
    }

    if (activityType === "feed" && !quantity) {
      toast({
        title: "Feed amount required",
        description: "Please enter the amount for this feeding.",
        variant: "destructive",
      });
      return;
    }

    if (activityType === "nap" && (!startTime || !endTime)) {
      toast({
        title: "Nap times required",
        description: "Please select both start and end times for the nap.",
        variant: "destructive",
      });
      return;
    }

    const details: any = {};
    
    switch (activityType) {
      case "feed":
        details.feedType = feedType;
        if (quantity) {
          details.quantity = quantity;
          details.unit = unit;
        }
        if (note) details.note = note;
        localStorage.setItem('lastUsedUnit', unit);
        break;
      case "diaper":
        details.diaperType = diaperType;
        details.hasLeak = hasLeak;
        details.hasCream = hasCream;
        if (note) details.note = note;
        break;
      case "nap":
        details.startTime = startTime;
        details.endTime = endTime;
        break;
      case "note":
        details.note = note;
        break;
    }

    if (photo) {
      details.photo = photo;
    }

    const newActivity: Omit<Activity, "id"> = {
      type: activityType as "feed" | "diaper" | "nap" | "note",
      time: activityType === "nap" ? startTime : time,
      details,
    };

    onAddActivity(newActivity);
    resetForm();
    if (onClose) {
      onClose();
    } else {
      setInternalOpen(false);
    }

    toast({
      title: "Activity added!",
      description: `${activityType.charAt(0).toUpperCase() + activityType.slice(1)} has been logged.`,
    });
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "feed": return <Baby className="h-4 w-4" />;
      case "diaper": return <Palette className="h-4 w-4" />;
      case "nap": return <Moon className="h-4 w-4" />;
      case "note": return <StickyNote className="h-4 w-4" />;
      default: return null;
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={isOpen !== undefined ? (open) => !open && onClose?.() : setInternalOpen}>
        {!isOpen && (
          <DialogTrigger asChild>
            <Button 
              className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-soft hover:shadow-lg hover:bg-primary/90 transition-all duration-300" 
              size="icon"
            >
              <Plus className="h-6 w-6" />
            </Button>
          </DialogTrigger>
        )}
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-4">
            <DialogTitle className="text-lg font-medium">
              Add Activity
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Activity Type Selection - Clean Grid */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { type: "feed", icon: Baby, label: "Feed" },
                { type: "diaper", icon: Palette, label: "Diaper" },
                { type: "nap", icon: Moon, label: "Nap" },
                { type: "note", icon: StickyNote, label: "Note" }
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
                  <Label className="text-sm font-medium mb-2 block text-muted-foreground">Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: "bottle", icon: Coffee, label: "Bottle" },
                      { type: "nursing", icon: Baby, label: "Nursing" },
                      { type: "solid", icon: StickyNote, label: "Solid" }
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
                <TimeScrollPicker value={time} onChange={setTime} label="Time" />

                <div>
                  <Label className="text-sm font-medium mb-2 block text-muted-foreground">Amount</Label>
                  <Button
                    variant="outline"
                    className="w-full h-12 text-left justify-between hover:bg-muted"
                    onClick={() => setShowKeypad(true)}
                  >
                    <span className="text-foreground">
                      {quantity ? `${quantity} ${unit}` : "Tap to enter amount"}
                    </span>
                    <span className="text-muted-foreground text-xs">Enter</span>
                  </Button>
                </div>

                <div>
                  <Label htmlFor="feed-note" className="text-sm font-medium mb-2 block text-muted-foreground">Notes</Label>
                  <Textarea
                    id="feed-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Additional notes about feeding..."
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
                <TimeScrollPicker value={time} onChange={setTime} label="Time" />
                
                <div>
                  <Label className="text-sm font-medium mb-2 block text-muted-foreground">Type</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { type: "wet", label: "Wet" },
                      { type: "poopy", label: "Poopy" },
                      { type: "both", label: "Both" }
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
                    <Label className="text-sm text-muted-foreground">Leak</Label>
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
                    <Label className="text-sm text-muted-foreground">Diaper Cream</Label>
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
                  <Label htmlFor="diaper-note" className="text-sm font-medium mb-2 block text-muted-foreground">Notes</Label>
                  <Textarea
                    id="diaper-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="Color, consistency, rash notes..."
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            )}

            {/* Nap Details */}
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
                  {isTimerActive ? "Stop Nap" : "Start Nap Timer"}
                </Button>
                <div className="space-y-3">
                  <TimeScrollPicker value={startTime} onChange={setStartTime} label="Start Time" />
                  <TimeScrollPicker value={endTime} onChange={setEndTime} label="End Time" />
                </div>
              </div>
            )}

            {/* Note Details */}
            {activityType === "note" && (
              <div>
                <Label htmlFor="note" className="text-sm font-medium mb-2 block text-muted-foreground">Note</Label>
                <Textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Enter your note here..."
                  rows={4}
                  className="resize-none"
                />
              </div>
            )}


            <div className="flex gap-3 pt-6 border-t">
              <Button 
                variant="outline" 
                onClick={() => onClose ? onClose() : setInternalOpen(false)} 
                className="flex-1 h-12"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                className="flex-1 h-12 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Add Activity
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Numeric Keypad */}
      <NumericKeypad
        isOpen={showKeypad}
        onClose={() => setShowKeypad(false)}
        onSubmit={setQuantity}
        title="Enter Amount"
        unit={unit}
        initialValue={quantity}
        onUnitChange={(newUnit) => setUnit(newUnit as "oz" | "ml")}
      />
    </>
  );
};