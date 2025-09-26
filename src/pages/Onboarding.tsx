import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChevronRight, ChevronLeft, Baby, Clock, TrendingUp, UserPlus } from "lucide-react";

const OnboardingStep = ({ 
  icon: Icon, 
  title, 
  description, 
  image 
}: { 
  icon: any; 
  title: string; 
  description: string; 
  image?: string;
}) => (
  <div className="flex flex-col items-center text-center px-8 py-12">
    <div className="w-20 h-20 bg-gradient-primary rounded-full flex items-center justify-center mb-8">
      <Icon className="w-10 h-10 text-white" />
    </div>
    <h2 className="text-2xl font-semibold text-foreground mb-4">{title}</h2>
    <p className="text-muted-foreground leading-relaxed max-w-sm">
      {description}
    </p>
  </div>
);

const Onboarding = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);

  const steps = [
    {
      icon: Baby,
      title: "Welcome to Baby Tracker",
      description: "The simplest way to track your baby's daily activities and patterns."
    },
    {
      icon: Clock,
      title: "Track Everything",
      description: "Log feeds, diaper changes, naps, and notes with just a few taps."
    },
    {
      icon: TrendingUp,
      title: "See Patterns",
      description: "Understand your baby's routines and get helpful insights over time."
    },
    {
      icon: UserPlus,
      title: "Collaborate with Caretakers",
      description: "Share tracking with anyone you share caregiving responsibilities with, real time sync so you can see all the details even when you're not there"
    }
  ];

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate("/auth");
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipToAuth = () => {
    navigate("/auth");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Theme Toggle - Fixed position */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle showText={false} />
      </div>
      
      {/* Progress indicators */}
      <div className="flex justify-center pt-12 pb-8">
        <div className="flex space-x-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Horizontally scrollable content */}
      <div className="flex-1 flex items-center justify-center relative">
        <div 
          className="flex transition-transform duration-300 ease-in-out w-full"
          style={{ 
            transform: `translateX(-${currentStep * 100}%)`,
            width: `${steps.length * 100}%`
          }}
        >
          {steps.map((step, index) => (
            <div key={index} className="w-full flex-shrink-0 flex items-center justify-center">
              <div className="max-w-md mx-auto">
                <OnboardingStep {...step} />
              </div>
            </div>
          ))}
        </div>

        {/* Swipe gesture area */}
        <div 
          className="absolute inset-0 flex"
          onTouchStart={(e) => {
            const touch = e.touches[0];
            e.currentTarget.dataset.startX = touch.clientX.toString();
          }}
          onTouchEnd={(e) => {
            const startX = parseFloat(e.currentTarget.dataset.startX || '0');
            const endX = e.changedTouches[0].clientX;
            const diff = startX - endX;
            
            if (Math.abs(diff) > 50) { // Minimum swipe distance
              if (diff > 0 && currentStep < steps.length - 1) {
                nextStep();
              } else if (diff < 0 && currentStep > 0) {
                prevStep();
              }
            }
          }}
        />
      </div>

      {/* Navigation */}
      <div className="p-8">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center">
            {currentStep > 0 ? (
              <Button variant="ghost" onClick={prevStep} className="flex items-center">
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            ) : (
              <Button variant="ghost" onClick={skipToAuth}>
                Skip
              </Button>
            )}

            <Button onClick={nextStep} className="flex items-center">
              {currentStep === steps.length - 1 ? "Get Started" : "Next"}
              <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;