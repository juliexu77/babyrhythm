import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Delete } from "lucide-react";

interface NumericKeypadProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  title?: string;
  unit?: string;
  initialValue?: string;
  onUnitChange?: (unit: string) => void;
}

export const NumericKeypad = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  title = "Enter Amount",
  unit = "oz",
  initialValue = "",
  onUnitChange
}: NumericKeypadProps) => {
  const [value, setValue] = useState(initialValue);

  // Auto-populate with last feed amount when modal opens
  const getLastFeedAmount = () => {
    const lastQuantity = localStorage.getItem('lastFeedQuantity');
    return lastQuantity || initialValue;
  };

// Set initial value when opened or when initial changes
useEffect(() => {
  if (isOpen) {
    if (initialValue) {
      setValue(initialValue);
    } else {
      setValue(getLastFeedAmount());
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isOpen, initialValue]);

  const handleNumber = (num: string) => {
    // Allow up to 8 characters for larger numbers (e.g., 1000.5ml)
    if (value.length < 8) {
      const newValue = value + num;
      // Ensure the number is valid and reasonable (under 10000)
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue) && numValue <= 9999) {
        setValue(newValue);
      }
    }
  };

  const handleDecimal = () => {
    if (!value.includes('.') && value.length > 0) {
      setValue(prev => prev + '.');
    }
  };

  const handleBackspace = () => {
    setValue(prev => prev.slice(0, -1));
  };

  const handleSubmit = () => {
    if (value && parseFloat(value) > 0) {
      onSubmit(value);
      setValue("");
      onClose();
    }
  };

  const handleClose = () => {
    setValue("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm [&>button[data-state]]:hidden">
        <DialogHeader className="pb-4">
          <DialogTitle className="text-center text-strong">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Display - Strava style */}
          <div className="bg-muted rounded-strava p-4">
            <div className="relative flex items-center justify-center">
              <div className="text-4xl font-bold text-foreground tabular-nums">
                {value || "0"}
              </div>
              <div className="absolute right-0">
                <div className="flex rounded-strava overflow-hidden border border-border">
                  <button
                    className={`h-10 px-4 text-xs font-semibold transition-all ${
                      unit === 'oz' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                    onClick={() => {
                      onUnitChange?.('oz');
                      try { localStorage.setItem('lastUsedUnit', 'oz'); } catch (e) {}
                    }}
                  >
                    oz
                  </button>
                  <button
                    className={`h-10 px-4 text-xs font-semibold transition-all ${
                      unit === 'ml' 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-background text-muted-foreground hover:bg-muted'
                    }`}
                    onClick={() => {
                      onUnitChange?.('ml');
                      try { localStorage.setItem('lastUsedUnit', 'ml'); } catch (e) {}
                    }}
                  >
                    ml
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Keypad - Strava style */}
          <div className="grid grid-cols-3 gap-2">
            {/* Numbers 1-9 */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                className="h-14 rounded-strava bg-muted text-lg font-bold hover:bg-muted/80 transition-colors"
                onClick={() => handleNumber(num.toString())}
              >
                {num}
              </button>
            ))}
            
            {/* Bottom row: decimal, 0, backspace */}
            <button
              className="h-14 rounded-strava bg-muted text-lg font-bold hover:bg-muted/80 transition-colors"
              onClick={handleDecimal}
            >
              .
            </button>
            <button
              className="h-14 rounded-strava bg-muted text-lg font-bold hover:bg-muted/80 transition-colors"
              onClick={() => handleNumber("0")}
            >
              0
            </button>
            <button
              className="h-14 rounded-strava bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
              onClick={handleBackspace}
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          {/* Submit button */}
          <Button
            className="w-full h-12"
            onClick={handleSubmit}
            disabled={!value || parseFloat(value) <= 0}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};