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
          <DialogTitle className="text-lg font-medium text-center">
            {title}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Display */}
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-3">
              <div className="text-3xl font-bold text-foreground">
                {value || "0"}
              </div>
              
              {/* Unit toggle inline */}
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant={unit === "oz" ? "default" : "outline"}
                  size="sm"
                  className={`h-8 px-3 text-sm ${unit === "oz" ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => { 
                    const next = "oz"; 
                    onUnitChange?.(next); 
                    try { localStorage.setItem('lastUsedUnit', next); } catch (e) {} 
                  }}
                >
                  oz
                </Button>
                <Button
                  type="button"
                  variant={unit === "ml" ? "default" : "outline"}
                  size="sm"
                  className={`h-8 px-3 text-sm ${unit === "ml" ? 'bg-primary text-primary-foreground' : ''}`}
                  onClick={() => { 
                    const next = "ml"; 
                    onUnitChange?.(next); 
                    try { localStorage.setItem('lastUsedUnit', next); } catch (e) {} 
                  }}
                >
                  ml
                </Button>
              </div>
            </div>
          </div>

          {/* Keypad */}
          <div className="grid grid-cols-3 gap-2">
            {/* Numbers 1-9 */}
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <Button
                key={num}
                variant="outline"
                className="h-12 text-lg font-medium hover:bg-muted"
                onClick={() => handleNumber(num.toString())}
              >
                {num}
              </Button>
            ))}
            
            {/* Bottom row: decimal, 0, backspace */}
            <Button
              variant="outline"
              className="h-12 text-lg font-medium hover:bg-muted"
              onClick={handleDecimal}
            >
              .
            </Button>
            <Button
              variant="outline"
              className="h-12 text-lg font-medium hover:bg-muted"
              onClick={() => handleNumber("0")}
            >
              0
            </Button>
            <Button
              variant="outline"
              className="h-12 hover:bg-muted"
              onClick={handleBackspace}
            >
              <Delete className="h-5 w-5" />
            </Button>
          </div>

          {/* Submit button */}
          <Button
            className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90"
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