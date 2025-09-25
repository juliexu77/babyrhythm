import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ChevronRight, ChevronLeft, Baby, Clock, TrendingUp } from "lucide-react";

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
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Theme Toggle - Fixed position */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle />
      </div>
      
      {/* Progress indicators */}
      <div className="flex justify-center pt-12 pb-8">
        <div className="flex space-x-2">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center">
        <div className="max-w-md mx-auto">
          <OnboardingStep {...steps[currentStep]} />
        </div>
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