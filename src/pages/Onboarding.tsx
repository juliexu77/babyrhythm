import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  <div className="min-h-screen flex flex-col items-center justify-center text-center px-8 py-12">
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
  const scrollAreaRef = useRef<HTMLDivElement>(null);

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

  // Handle scroll to update current step
  useEffect(() => {
    const scrollArea = scrollAreaRef.current;
    if (!scrollArea) return;

    const handleScroll = () => {
      const scrollTop = scrollArea.scrollTop;
      const windowHeight = window.innerHeight;
      const newStep = Math.round(scrollTop / windowHeight);
      setCurrentStep(Math.min(Math.max(newStep, 0), steps.length - 1));
    };

    scrollArea.addEventListener('scroll', handleScroll);
    return () => scrollArea.removeEventListener('scroll', handleScroll);
  }, [steps.length]);

  const scrollToStep = (stepIndex: number) => {
    if (scrollAreaRef.current) {
      const windowHeight = window.innerHeight;
      scrollAreaRef.current.scrollTo({
        top: stepIndex * windowHeight,
        behavior: 'smooth'
      });
    }
  };

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      scrollToStep(currentStep + 1);
    } else {
      navigate("/auth"); // Go to auth after onboarding
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      scrollToStep(currentStep - 1);
    }
  };

  const skipToAuth = () => {
    navigate("/auth"); // Go to auth
  };

  return (
    <div className="h-screen bg-background relative overflow-hidden">
      {/* Theme Toggle - Fixed position */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle showText={false} />
      </div>
      
      {/* Progress indicators - Fixed position */}
      <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-20">
        <div className="flex space-x-2">
          {steps.map((_, index) => (
            <button
              key={index}
              onClick={() => scrollToStep(index)}
              className={`w-2 h-2 rounded-full transition-colors ${
                index === currentStep ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Scrollable Content */}
      <ScrollArea 
        ref={scrollAreaRef}
        className="h-full w-full"
        style={{ height: '100vh' }}
      >
        <div style={{ height: `${steps.length * 100}vh` }}>
          {steps.map((step, index) => (
            <div key={index} style={{ height: '100vh' }}>
              <OnboardingStep {...step} />
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Navigation - Fixed position */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-20">
        <div className="max-w-md mx-auto">
          <div className="flex justify-between items-center space-x-8">
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