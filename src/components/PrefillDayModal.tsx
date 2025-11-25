import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface PrefillDayModalProps {
  isOpen: boolean;
  onClose: () => void;
  babyAgeMonths: number | null;
  onPrefill: (activities: any[]) => void;
}

export const PrefillDayModal = ({ 
  isOpen, 
  onClose, 
  babyAgeMonths,
  onPrefill 
}: PrefillDayModalProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [feedType, setFeedType] = useState<"bottle" | "breast" | "both">("bottle");
  const [bottleAmount, setBottleAmount] = useState("4");
  const [breastDuration, setBreastDuration] = useState("15");
  const [feedCount, setFeedCount] = useState("6");
  const [napCount, setNapCount] = useState("3");

  // Generate typical day based on custom preferences
  const getTypicalDay = () => {
    const activities: any[] = [];
    const feedNum = parseInt(feedCount);
    const napNum = parseInt(napCount);
    
    // Distribute feeds throughout the day (7 AM to 7 PM)
    const feedInterval = 12 / feedNum; // hours between feeds
    for (let i = 0; i < feedNum; i++) {
      const hour = 7 + Math.floor(i * feedInterval);
      const minute = Math.floor((i * feedInterval % 1) * 60);
      const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
      
      if (feedType === "both") {
        // Alternate between breast and bottle
        if (i % 2 === 0) {
          activities.push({
            type: 'feed',
            time: `${time} ${hour >= 12 ? 'PM' : 'AM'}`,
            details: { feedType: 'breast', duration: breastDuration }
          });
        } else {
          activities.push({
            type: 'feed',
            time: `${time} ${hour >= 12 ? 'PM' : 'AM'}`,
            details: { feedType: 'bottle', quantity: bottleAmount, unit: 'oz' }
          });
        }
      } else if (feedType === "breast") {
        activities.push({
          type: 'feed',
          time: `${time} ${hour >= 12 ? 'PM' : 'AM'}`,
          details: { feedType: 'breast', duration: breastDuration }
        });
      } else {
        activities.push({
          type: 'feed',
          time: `${time} ${hour >= 12 ? 'PM' : 'AM'}`,
          details: { feedType: 'bottle', quantity: bottleAmount, unit: 'oz' }
        });
      }
    }
    
    // Distribute naps throughout the day (9 AM to 5 PM)
    const napInterval = 8 / napNum; // hours between nap starts
    for (let i = 0; i < napNum; i++) {
      const startHour = 9 + Math.floor(i * napInterval);
      const startMinute = Math.floor((i * napInterval % 1) * 60);
      const napDuration = babyAgeMonths && babyAgeMonths <= 6 ? 1.5 : 1.5; // 1.5 hour naps
      const endHour = startHour + Math.floor(napDuration);
      const endMinute = startMinute + Math.floor((napDuration % 1) * 60);
      
      activities.push({
        type: 'nap',
        time: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')} ${startHour >= 12 ? 'PM' : 'AM'}`,
        details: {
          startTime: `${startHour.toString().padStart(2, '0')}:${startMinute.toString().padStart(2, '0')} ${startHour >= 12 ? 'PM' : 'AM'}`,
          endTime: `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')} ${endHour >= 12 ? 'PM' : 'AM'}`
        }
      });
    }
    
    // Add a few diaper changes
    activities.push(
      { type: 'diaper', time: '10:30 AM', details: { diaperType: 'wet' } },
      { type: 'diaper', time: '2:30 PM', details: { diaperType: 'poopy' } },
      { type: 'diaper', time: '6:00 PM', details: { diaperType: 'wet' } }
    );
    
    // Add solids if baby is 6+ months
    if (babyAgeMonths && babyAgeMonths >= 6) {
      activities.push(
        { type: 'solids', time: '8:00 AM', details: { solidDescription: 'Breakfast' } },
        { type: 'solids', time: '12:00 PM', details: { solidDescription: 'Lunch' } },
        { type: 'solids', time: '5:30 PM', details: { solidDescription: 'Dinner' } }
      );
    }
    
    return activities;
  };

  const handlePrefill = async () => {
    if (babyAgeMonths === null) return;
    
    setIsGenerating(true);
    const typicalDay = getTypicalDay();
    
    // Simulate brief loading for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onPrefill(typicalDay);
    setIsGenerating(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Customize Your Sample Day</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Let's prefill today with sample activities tailored to your feeding routine and schedule.
          </p>

          {/* Feed Type */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">How do you feed?</Label>
            <RadioGroup value={feedType} onValueChange={(value: any) => setFeedType(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="bottle" id="bottle" />
                <Label htmlFor="bottle" className="font-normal cursor-pointer">Bottle</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="breast" id="breast" />
                <Label htmlFor="breast" className="font-normal cursor-pointer">Breast</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="both" id="both" />
                <Label htmlFor="both" className="font-normal cursor-pointer">Both (alternating)</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Bottle Amount */}
          {(feedType === "bottle" || feedType === "both") && (
            <div className="space-y-2">
              <Label htmlFor="bottleAmount" className="text-sm font-medium">
                Typical bottle amount (oz)
              </Label>
              <Input
                id="bottleAmount"
                type="number"
                min="1"
                max="12"
                value={bottleAmount}
                onChange={(e) => setBottleAmount(e.target.value)}
                className="w-24"
              />
            </div>
          )}

          {/* Breast Duration */}
          {(feedType === "breast" || feedType === "both") && (
            <div className="space-y-2">
              <Label htmlFor="breastDuration" className="text-sm font-medium">
                Typical nursing duration (minutes)
              </Label>
              <Input
                id="breastDuration"
                type="number"
                min="5"
                max="60"
                value={breastDuration}
                onChange={(e) => setBreastDuration(e.target.value)}
                className="w-24"
              />
            </div>
          )}

          {/* Feed Count */}
          <div className="space-y-2">
            <Label htmlFor="feedCount" className="text-sm font-medium">
              Feeds per day
            </Label>
            <Input
              id="feedCount"
              type="number"
              min="3"
              max="12"
              value={feedCount}
              onChange={(e) => setFeedCount(e.target.value)}
              className="w-24"
            />
          </div>

          {/* Nap Count */}
          <div className="space-y-2">
            <Label htmlFor="napCount" className="text-sm font-medium">
              Naps per day
            </Label>
            <Input
              id="napCount"
              type="number"
              min="1"
              max="5"
              value={napCount}
              onChange={(e) => setNapCount(e.target.value)}
              className="w-24"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-900 dark:text-blue-100 leading-relaxed">
              <strong>Note:</strong> You can edit or delete any of these activities afterward. This is just to help you see predictions and patterns right away!
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isGenerating}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={handlePrefill}
              disabled={isGenerating || babyAgeMonths === null}
              className="flex-1"
            >
              {isGenerating ? "Generating..." : "Prefill Today"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};