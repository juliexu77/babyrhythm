import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Baby, Moon, Droplet, Clock } from "lucide-react";
import { format } from "date-fns";

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

  // Age-appropriate typical day templates
  const getTypicalDay = (ageMonths: number) => {
    const now = new Date();
    const today = format(now, 'yyyy-MM-dd');
    
    if (ageMonths <= 3) {
      // Newborn (0-3 months): 8-12 feeds, 4-5 naps
      return [
        { type: 'feed', time: '7:00 AM', details: { feedType: 'bottle', quantity: '3', unit: 'oz' } },
        { type: 'nap', time: '8:30 AM', details: { startTime: '8:30 AM', endTime: '10:00 AM' } },
        { type: 'feed', time: '10:00 AM', details: { feedType: 'bottle', quantity: '3', unit: 'oz' } },
        { type: 'diaper', time: '10:30 AM', details: { diaperType: 'wet' } },
        { type: 'nap', time: '11:30 AM', details: { startTime: '11:30 AM', endTime: '1:00 PM' } },
        { type: 'feed', time: '1:00 PM', details: { feedType: 'bottle', quantity: '3', unit: 'oz' } },
        { type: 'nap', time: '2:30 PM', details: { startTime: '2:30 PM', endTime: '4:00 PM' } },
        { type: 'feed', time: '4:00 PM', details: { feedType: 'bottle', quantity: '3', unit: 'oz' } },
        { type: 'diaper', time: '4:30 PM', details: { diaperType: 'poopy' } },
        { type: 'nap', time: '5:30 PM', details: { startTime: '5:30 PM', endTime: '6:30 PM' } },
        { type: 'feed', time: '7:00 PM', details: { feedType: 'bottle', quantity: '3', unit: 'oz' } },
      ];
    } else if (ageMonths <= 6) {
      // 4-6 months: 5-6 feeds, 3-4 naps
      return [
        { type: 'feed', time: '7:00 AM', details: { feedType: 'bottle', quantity: '6', unit: 'oz' } },
        { type: 'nap', time: '9:00 AM', details: { startTime: '9:00 AM', endTime: '10:30 AM' } },
        { type: 'feed', time: '10:30 AM', details: { feedType: 'bottle', quantity: '6', unit: 'oz' } },
        { type: 'diaper', time: '11:00 AM', details: { diaperType: 'wet' } },
        { type: 'nap', time: '12:30 PM', details: { startTime: '12:30 PM', endTime: '2:30 PM' } },
        { type: 'feed', time: '2:30 PM', details: { feedType: 'bottle', quantity: '6', unit: 'oz' } },
        { type: 'nap', time: '4:00 PM', details: { startTime: '4:00 PM', endTime: '5:00 PM' } },
        { type: 'feed', time: '6:00 PM', details: { feedType: 'bottle', quantity: '6', unit: 'oz' } },
        { type: 'diaper', time: '6:30 PM', details: { diaperType: 'poopy' } },
      ];
    } else if (ageMonths <= 12) {
      // 7-12 months: 4-5 feeds + solids, 2-3 naps
      return [
        { type: 'feed', time: '7:00 AM', details: { feedType: 'bottle', quantity: '7', unit: 'oz' } },
        { type: 'solids', time: '8:00 AM', details: { solidDescription: 'Oatmeal with fruit' } },
        { type: 'nap', time: '9:30 AM', details: { startTime: '9:30 AM', endTime: '11:00 AM' } },
        { type: 'feed', time: '11:00 AM', details: { feedType: 'bottle', quantity: '7', unit: 'oz' } },
        { type: 'diaper', time: '11:30 AM', details: { diaperType: 'wet' } },
        { type: 'solids', time: '12:00 PM', details: { solidDescription: 'Vegetables and protein' } },
        { type: 'nap', time: '2:00 PM', details: { startTime: '2:00 PM', endTime: '3:30 PM' } },
        { type: 'feed', time: '3:30 PM', details: { feedType: 'bottle', quantity: '7', unit: 'oz' } },
        { type: 'solids', time: '5:30 PM', details: { solidDescription: 'Dinner with family' } },
        { type: 'feed', time: '6:30 PM', details: { feedType: 'bottle', quantity: '7', unit: 'oz' } },
        { type: 'diaper', time: '7:00 PM', details: { diaperType: 'poopy' } },
      ];
    } else {
      // 13+ months: 3-4 feeds, 1-2 naps
      return [
        { type: 'feed', time: '7:30 AM', details: { feedType: 'bottle', quantity: '8', unit: 'oz' } },
        { type: 'solids', time: '8:00 AM', details: { solidDescription: 'Breakfast' } },
        { type: 'diaper', time: '9:00 AM', details: { diaperType: 'wet' } },
        { type: 'nap', time: '12:00 PM', details: { startTime: '12:00 PM', endTime: '2:00 PM' } },
        { type: 'solids', time: '2:30 PM', details: { solidDescription: 'Lunch' } },
        { type: 'feed', time: '3:00 PM', details: { feedType: 'bottle', quantity: '8', unit: 'oz' } },
        { type: 'diaper', time: '4:00 PM', details: { diaperType: 'poopy' } },
        { type: 'solids', time: '6:00 PM', details: { solidDescription: 'Dinner' } },
        { type: 'feed', time: '7:00 PM', details: { feedType: 'bottle', quantity: '8', unit: 'oz' } },
      ];
    }
  };

  const handlePrefill = async () => {
    if (babyAgeMonths === null) return;
    
    setIsGenerating(true);
    const typicalDay = getTypicalDay(babyAgeMonths);
    
    // Simulate brief loading for UX
    await new Promise(resolve => setTimeout(resolve, 500));
    
    onPrefill(typicalDay);
    setIsGenerating(false);
    onClose();
  };

  const getAgeDescription = () => {
    if (babyAgeMonths === null) return "your baby";
    if (babyAgeMonths <= 3) return "0-3 months";
    if (babyAgeMonths <= 6) return "4-6 months";
    if (babyAgeMonths <= 12) return "7-12 months";
    return "13+ months";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl">Quick Start: Prefill Typical Day</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Want to see BabyRhythm in action right away? I can prefill today with age-appropriate activities based on typical patterns for {getAgeDescription()} babies.
          </p>

          <div className="bg-accent/20 rounded-lg p-4 space-y-3">
            <p className="text-sm font-medium text-foreground">This will add:</p>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Baby className="w-4 h-4 text-primary" />
                <span>Sample feeds with appropriate amounts</span>
              </div>
              <div className="flex items-center gap-2">
                <Moon className="w-4 h-4 text-primary" />
                <span>Typical nap times and durations</span>
              </div>
              <div className="flex items-center gap-2">
                <Droplet className="w-4 h-4 text-primary" />
                <span>Regular diaper changes</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <span>Age-appropriate schedule</span>
              </div>
            </div>
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