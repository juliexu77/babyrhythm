import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Sparkles } from "lucide-react";

interface FirstTimeTooltipProps {
  target: HTMLElement | null;
  onDismiss: () => void;
}

export const FirstTimeTooltip = ({ target, onDismiss }: FirstTimeTooltipProps) => {
  const [position, setPosition] = useState({ top: 0, left: 0 });

  useEffect(() => {
    if (target) {
      const rect = target.getBoundingClientRect();
      setPosition({
        top: rect.top - 120, // Position above the button
        left: rect.left - 100 // Center horizontally
      });
    }
  }, [target]);

  if (!target) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onDismiss} />
      
      {/* Highlight ring around the + button */}
      <div 
        className="fixed z-50 pointer-events-none"
        style={{
          top: target.getBoundingClientRect().top - 8,
          left: target.getBoundingClientRect().left - 8,
          width: target.getBoundingClientRect().width + 16,
          height: target.getBoundingClientRect().height + 16,
        }}
      >
        <div className="w-full h-full rounded-full border-4 border-primary animate-pulse shadow-lg" />
      </div>

      {/* Tooltip */}
      <Card 
        className="fixed z-50 p-4 max-w-xs bg-background border shadow-xl"
        style={{
          top: position.top,
          left: position.left,
        }}
      >
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-primary mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-sm mb-1">Start tracking activities!</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Tap the + button to log your baby's feeds, naps, diaper changes, and notes.
            </p>
            <Button 
              size="sm" 
              onClick={onDismiss}
              className="text-xs h-7"
            >
              Got it!
            </Button>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onDismiss}
            className="h-6 w-6 p-0 -mt-1"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
        
        {/* Arrow pointing to button */}
        <div 
          className="absolute w-3 h-3 bg-background border-r border-b transform rotate-45"
          style={{
            bottom: -6,
            left: '50%',
            marginLeft: -6,
          }}
        />
      </Card>
    </>
  );
};