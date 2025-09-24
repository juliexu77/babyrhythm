import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TimePicker } from "./TimePicker";
import { Activity } from "./ActivityCard";
import { Plus, Baby, Palette, Moon, StickyNote } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AddActivityModalProps {
  onAddActivity: (activity: Omit<Activity, "id">) => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const AddActivityModal = ({ onAddActivity, isOpen, onClose }: AddActivityModalProps) => {
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isOpen !== undefined ? isOpen : internalOpen;
  const setOpen = onClose ? onClose : setInternalOpen;
  const [activityType, setActivityType] = useState<"feed" | "diaper" | "nap" | "note" | "">(""); // No default
  const [time, setTime] = useState(() => {
    // Default to current time
    const now = new Date();
    return now.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  });
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<"oz" | "ml">(() => {
    // Remember last used unit
    const lastUnit = localStorage.getItem('lastUsedUnit');
    return (lastUnit as "oz" | "ml") || "oz";
  });
  const [diaperType, setDiaperType] = useState<"pee" | "poop" | "both">("pee");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [note, setNote] = useState("");

  const resetForm = () => {
    // Reset to current time
    const now = new Date();
    setTime(now.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    }));
    setQuantity("");
    // Keep the last used unit
    setDiaperType("pee");
    setStartTime("");
    setEndTime("");
    setNote("");
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
        if (quantity) {
          details.quantity = quantity;
          details.unit = unit;
          // Remember the unit for next time
          localStorage.setItem('lastUsedUnit', unit);
        }
        break;
      case "diaper":
        details.diaperType = diaperType;
        break;
      case "nap":
        details.startTime = startTime;
        details.endTime = endTime;
        break;
      case "note":
        details.note = note;
        break;
    }

    const newActivity: Omit<Activity, "id"> = {
      type: activityType as "feed" | "diaper" | "nap" | "note", // Cast to exclude empty string
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
    <Dialog open={open} onOpenChange={isOpen !== undefined ? (open) => !open && onClose?.() : setInternalOpen}>
      {!isOpen && (
        <DialogTrigger asChild>
          <Button className="fixed bottom-6 right-6 h-14 w-14 rounded-full bg-gradient-primary shadow-soft hover:shadow-lg transition-all duration-300" size="icon">
            <Plus className="h-6 w-6" />
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getActivityIcon(activityType)}
            Add Activity
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="activity-type">Activity Type</Label>
            <Select value={activityType} onValueChange={(value: any) => setActivityType(value)}>
              <SelectTrigger className={!activityType ? "border-red-200 bg-red-50" : ""}>
                <SelectValue placeholder="Select activity type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="feed">
                  <div className="flex items-center gap-2">
                    <Baby className="h-4 w-4" />
                    Feed
                  </div>
                </SelectItem>
                <SelectItem value="diaper">
                  <div className="flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Diaper
                  </div>
                </SelectItem>
                <SelectItem value="nap">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    Nap
                  </div>
                </SelectItem>
                <SelectItem value="note">
                  <div className="flex items-center gap-2">
                    <StickyNote className="h-4 w-4" />
                    Note
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {activityType !== "nap" && (
            <TimePicker value={time} onChange={setTime} label="Time" />
          )}

          {activityType === "feed" && (
            <div className="space-y-3">
              <Label htmlFor="quantity">Quantity (optional)</Label>
              <div className="flex gap-2">
                <Input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  placeholder="4"
                  className="flex-1"
                  min="0"
                  step="0.5"
                />
                <Select value={unit} onValueChange={(value: "oz" | "ml") => setUnit(value)}>
                  <SelectTrigger className="w-20">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oz">oz</SelectItem>
                    <SelectItem value="ml">ml</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {activityType === "diaper" && (
            <div>
              <Label htmlFor="diaper-type">Type</Label>
              <Select value={diaperType} onValueChange={(value: any) => setDiaperType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pee">Pee</SelectItem>
                  <SelectItem value="poop">Poop</SelectItem>
                  <SelectItem value="both">Both</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {activityType === "nap" && (
            <div className="space-y-3">
              <TimePicker value={startTime} onChange={setStartTime} label="Start Time" />
              <TimePicker value={endTime} onChange={setEndTime} label="End Time" />
            </div>
          )}

          {activityType === "note" && (
            <div>
              <Label htmlFor="note">Note</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Enter your note here..."
                rows={3}
              />
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={() => onClose ? onClose() : setInternalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="flex-1 bg-gradient-primary">
              Add Activity
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};