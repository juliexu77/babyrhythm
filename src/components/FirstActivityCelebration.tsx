import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Sparkles, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";
import { useEffect } from "react";

interface FirstActivityCelebrationProps {
  open: boolean;
  onClose: () => void;
  babyName?: string;
  activityType: 'feed' | 'nap' | 'diaper';
}

export const FirstActivityCelebration = ({ 
  open, 
  onClose, 
  babyName,
  activityType 
}: FirstActivityCelebrationProps) => {
  const name = babyName?.split(' ')[0] || 'Baby';

  useEffect(() => {
    if (open) {
      // Trigger confetti
      const duration = 2000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 999999 };

      function randomInRange(min: number, max: number) {
        return Math.random() * (max - min) + min;
      }

      const interval: any = setInterval(function() {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
        });
        confetti({
          ...defaults,
          particleCount,
          origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
        });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [open]);

  const getMessage = () => {
    switch (activityType) {
      case 'nap':
        return {
          title: "First Sleep Logged!",
          description: `You're starting to track ${name}'s sleep rhythm. Keep logging to unlock personalized predictions.`,
          benefit: "Each nap helps us understand sleep patterns"
        };
      case 'feed':
        return {
          title: "First Feed Logged!",
          description: `Great start tracking ${name}'s feeding. Keep it up to see feeding patterns emerge.`,
          benefit: "Each feed helps us predict hunger windows"
        };
      case 'diaper':
        return {
          title: "First Diaper Logged!",
          description: `You're building a complete picture of ${name}'s day. Keep going!`,
          benefit: "Tracking helps spot patterns and changes"
        };
    }
  };

  const message = getMessage();

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="relative">
            <div className="absolute -inset-2 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur-lg animate-pulse"></div>
            <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary-foreground animate-story-shimmer" />
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl text-strong">
              {message.title}
            </h3>
            <p className="text-body-muted leading-relaxed">
              {message.description}
            </p>
          </div>

          <div className="flex items-center gap-2 px-4 py-3 bg-accent/20 rounded-lg border border-border/40 w-full">
            <TrendingUp className="w-4 h-4 text-primary flex-shrink-0" />
            <p className="text-label-xs text-foreground">
              {message.benefit}
            </p>
          </div>

          <Button 
            onClick={onClose}
            className="w-full"
          >
            Continue
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};