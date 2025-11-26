import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "./ui/dialog";
import { Sparkles } from "lucide-react";
import confetti from "canvas-confetti";

interface RhythmUnlockedModalProps {
  isOpen: boolean;
  onClose: () => void;
  babyName?: string;
  totalLogs: number;
}

export const RhythmUnlockedModal = ({ isOpen, onClose, babyName, totalLogs }: RhythmUnlockedModalProps) => {
  const [isAnimating, setIsAnimating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTransition, setShowTransition] = useState(true);
  const name = babyName?.split(' ')[0] || 'Baby';

  useEffect(() => {
    if (isOpen && !isAnimating) {
      setIsAnimating(true);
      setProgress(0);
      setShowTransition(true);
      
      // Animate progress bar filling
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 5;
        });
      }, 30);
      
      // Show transition from "Early Days" to "Active Rhythm" after progress fills
      setTimeout(() => {
        setShowTransition(false);
      }, 1800);
      
      // Trigger confetti after progress completes
      setTimeout(() => {
        const duration = 2000;
        const end = Date.now() + duration;

        const frame = () => {
          confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.6 },
            colors: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))']
          });
          confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.6 },
            colors: ['hsl(var(--primary))', 'hsl(var(--accent))', 'hsl(var(--secondary))']
          });

          if (Date.now() < end) {
            requestAnimationFrame(frame);
          }
        };
        
        frame();
      }, 1900);

      // Auto close after 5 seconds
      const timer = setTimeout(() => {
        onClose();
      }, 5000);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    }
  }, [isOpen, isAnimating, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-sm p-8 text-center border-primary/20">
        <div className="space-y-6 animate-in zoom-in-95 fade-in duration-500">
          {/* Progress bar animation */}
          <div className="space-y-3">
            <div className="relative h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary to-accent rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
              <div 
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                style={{ 
                  animation: 'shimmer-fast 1s infinite',
                  width: `${progress}%`
                }}
              />
            </div>
            
            {/* Transition text */}
            <div className="min-h-[24px] flex items-center justify-center">
              {showTransition ? (
                <span className="text-xs font-medium text-muted-foreground animate-pulse">
                  Early Days → Active Rhythm
                </span>
              ) : (
                <span className="text-xs font-medium text-primary animate-in fade-in duration-500">
                  ✨ Active Rhythm unlocked!
                </span>
              )}
            </div>
          </div>
          
          <div className="relative mx-auto w-20 h-20">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full animate-pulse"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
              <Sparkles className="h-10 w-10 text-primary-foreground" />
            </div>
          </div>
          
          <div className="space-y-3">
            <h2 className="text-2xl font-serif font-bold text-foreground">
              Rhythm unlocked!
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              I've started learning {name}'s patterns from your first nap log. As you continue logging, my predictions will get smarter and more personalized.
            </p>
          </div>

          <div className="pt-2">
            <p className="text-xs text-muted-foreground italic">
              The more you log, the smarter my predictions get.
            </p>
          </div>
        </div>
        
        <style>{`
          @keyframes shimmer-fast {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(200%); }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};
