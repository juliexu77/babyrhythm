import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, Moon, Milk, Heart, ChevronRight, ChevronLeft } from "lucide-react";

interface OnboardingTutorialProps {
  isOpen: boolean;
  onComplete: () => void;
  babyName?: string;
}

const steps = [
  {
    title: "Welcome! 👋",
    icon: Heart,
    content: (name: string) => (
      <div className="space-y-4">
        <p className="text-base text-foreground/80 leading-relaxed">
          Hi! We're here to help you understand {name}'s patterns and needs—without the overwhelm.
        </p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Every baby is unique, and there's no "perfect" way to track. We're learning together, and you're doing great.
        </p>
      </div>
    ),
  },
  {
    title: "How much awake time? ⏰",
    icon: Clock,
    content: (name: string) => (
      <div className="space-y-4">
        <p className="text-base text-foreground/80 leading-relaxed">
          <strong className="text-foreground">Awake time</strong> is simply how long {name} has been awake since their last nap.
        </p>
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-foreground/70 leading-relaxed">
            <strong>Why it matters:</strong> Most babies get fussy or tired after being awake for a certain amount of time. For young babies, this might be just 1-2 hours!
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          We'll show you when {name} might be getting sleepy based on their age and recent patterns.
        </p>
      </div>
    ),
  },
  {
    title: "Sleep & naps 😴",
    icon: Moon,
    content: (name: string) => (
      <div className="space-y-4">
        <p className="text-base text-foreground/80 leading-relaxed">
          Track when {name} sleeps and for how long. Don't worry about being exact—even rough times help us spot patterns.
        </p>
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-foreground/70 leading-relaxed">
            <strong>You're doing it right if:</strong> You log naps when they happen. That's it! We'll figure out the patterns for you.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          After a few days, we'll predict when {name} might be ready for their next nap.
        </p>
      </div>
    ),
  },
  {
    title: "Feeding 🍼",
    icon: Milk,
    content: (name: string) => (
      <div className="space-y-4">
        <p className="text-base text-foreground/80 leading-relaxed">
          Log feeds to help you remember when {name} last ate and to spot their natural rhythm.
        </p>
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-foreground/70 leading-relaxed">
            <strong>Tip:</strong> Breast or bottle, it all counts. Just tap to log—no need for perfect details every time.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Over time, we'll learn {name}'s typical feeding schedule and remind you when they might be hungry.
        </p>
      </div>
    ),
  },
  {
    title: "You've got this! 💪",
    icon: Heart,
    content: () => (
      <div className="space-y-4">
        <p className="text-base text-foreground/80 leading-relaxed">
          Remember: you don't need to log everything perfectly. Even a few activities per day help us learn your baby's rhythm.
        </p>
        <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
          <p className="text-sm text-foreground/70 leading-relaxed">
            <strong>Most important:</strong> Trust your instincts. The app is here to support you, not add stress.
          </p>
        </div>
        <p className="text-sm text-muted-foreground">
          Ready to get started? Tap "Let's go" to begin tracking!
        </p>
      </div>
    ),
  },
];

export const OnboardingTutorial = ({ isOpen, onComplete, babyName = "your baby" }: OnboardingTutorialProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const step = steps[currentStep];
  const Icon = step.icon;
  const isLastStep = currentStep === steps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <DialogTitle className="text-xl text-strong">{step.title}</DialogTitle>
          </div>
        </DialogHeader>

        <div className="py-4">
          {step.content(babyName)}
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-2 py-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-2 rounded-full transition-all ${
                index === currentStep
                  ? 'w-8 bg-primary'
                  : 'w-2 bg-muted'
              }`}
            />
          ))}
        </div>

        <DialogFooter className="flex-row gap-2">
          {currentStep > 0 && (
            <Button
              variant="outline"
              onClick={handlePrev}
              className="flex-1"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          )}
          <Button
            onClick={handleNext}
            className="flex-1"
          >
            {isLastStep ? "Let's go!" : "Next"}
            {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
