import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityCard, Activity } from "@/components/ActivityCard";
import { AddActivityModal } from "@/components/AddActivityModal";
import { SummaryCards } from "@/components/SummaryCards";
import { TrendChart } from "@/components/TrendChart";
import { YesterdaysSummary } from "@/components/YesterdaysSummary";
import { Baby, ArrowRight, ArrowLeft, Eye, UserPlus, ChevronRight } from "lucide-react";

const DemoTour = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [demoActivities, setDemoActivities] = useState<Activity[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);

  // Demo activities to show progression
  const demoSteps = [
    {
      title: "Welcome to Baby Tracker",
      description: "Let's take a quick tour to see how easy it is to track your baby's activities.",
      component: null,
      action: "Get Started"
    },
    {
      title: "Adding Your First Activity",
      description: "Tap the + button to log activities like feeding, naps, and diaper changes.",
      component: "add-activity",
      action: "Add Feed"
    },
    {
      title: "Activity Timeline",
      description: "See all your baby's activities organized by time throughout the day.",
      component: "timeline",
      action: "Add Another"
    },
    {
      title: "Daily Summary",
      description: "Get insights about yesterday's patterns - total feeds, nap time, and more.",
      component: "summary",
      action: "View Trends"
    },
    {
      title: "Weekly Trends",
      description: "Track feeding volumes and nap duration over time to spot patterns.",
      component: "trends",
      action: "Get Started"
    },
    {
      title: "Ready to Start?",
      description: "Sign up to save your data and track your baby's activities.",
      component: "signup",
      action: null
    }
  ];

  const currentStepData = demoSteps[currentStep];

  const sampleActivities: Activity[] = [
    {
      id: "demo-1",
      type: "feed",
      time: "7:30 AM",
      details: { quantity: "4 oz" }
    },
    {
      id: "demo-2",
      type: "diaper",
      time: "8:15 AM",
      details: { diaperType: "wet" }
    },
    {
      id: "demo-3",
      type: "nap",
      time: "9:00 AM",
      details: { startTime: "9:00 AM", endTime: "10:30 AM" }
    },
    {
      id: "demo-4",
      type: "feed",
      time: "11:00 AM",
      details: { quantity: "3.5 oz" }
    }
  ];

  const handleAddDemoActivity = (activity: Omit<Activity, "id">) => {
    const newActivity: Activity = {
      ...activity,
      id: `demo-${Date.now()}`
    };
    setDemoActivities([...demoActivities, newActivity]);
    setShowAddModal(false);
    
    // Auto-advance after adding activity
    setTimeout(() => {
      setCurrentStep(currentStep + 1);
    }, 1000);
  };

  const nextStep = () => {
    if (currentStep === 1) {
      setShowAddModal(true);
      return;
    }
    
    if (currentStep === 2 && demoActivities.length === 1) {
      // Add a second demo activity
      const secondActivity: Activity = {
        id: "demo-auto-2",
        type: "diaper",
        time: "8:15 AM",
        details: { diaperType: "wet" }
      };
      setDemoActivities([...demoActivities, secondActivity]);
    }
    
    setCurrentStep(Math.min(currentStep + 1, demoSteps.length - 1));
  };

  const prevStep = () => {
    setCurrentStep(Math.max(currentStep - 1, 0));
  };

  const renderStepContent = () => {
    switch (currentStepData.component) {
      case "add-activity":
        return (
          <div className="space-y-4">
            <div className="bg-gradient-primary/10 p-6 rounded-xl border-2 border-dashed border-primary/30">
              <div className="text-center">
                <Baby className="h-12 w-12 text-primary mx-auto mb-4" />
                <p className="text-muted-foreground">Click "Add Feed" below to see how easy it is!</p>
              </div>
            </div>
          </div>
        );
        
      case "timeline":
        return (
          <div className="space-y-4">
            <SummaryCards activities={demoActivities} />
            <div className="space-y-2">
              <h3 className="font-medium text-foreground">Today's Activities</h3>
              {demoActivities.map((activity) => (
                <ActivityCard key={activity.id} activity={activity} babyName="Demo Baby" />
              ))}
            </div>
          </div>
        );
        
      case "summary":
        return (
          <div className="space-y-4">
            <YesterdaysSummary activities={sampleActivities} />
          </div>
        );
        
      case "trends":
        return (
          <div className="space-y-4">
            <TrendChart activities={sampleActivities} />
          </div>
        );
        
      case "signup":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Baby className="h-16 w-16 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">You're all set!</h3>
              <p className="text-muted-foreground">
                Choose how you'd like to continue using Baby Tracker.
              </p>
            </div>
            
            <div className="space-y-3">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="p-4">
                    <Button 
                      onClick={() => {
                        localStorage.setItem('hasSeenDemo', 'true');
                        navigate("/auth");
                      }}
                      className="w-full mb-3"
                    >
                      <UserPlus className="h-4 w-4 mr-2" />
                      Sign Up & Save Data
                    </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Keep your data safe and access it from any device
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                    <Button 
                      variant="outline"
                      onClick={() => {
                        navigate('/auth');
                      }}
                      className="w-full mb-3"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Sign In to Continue
                    </Button>
                  <p className="text-xs text-muted-foreground text-center">
                    Start tracking immediately (data stays on this device)
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Progress bar */}
      <div className="bg-white border-b">
        <div className="max-w-md mx-auto px-6 py-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
            <span>Step {currentStep + 1} of {demoSteps.length}</span>
            <Badge variant="secondary">{Math.round(((currentStep + 1) / demoSteps.length) * 100)}%</Badge>
          </div>
          <div className="w-full bg-muted rounded-full h-2">
            <div 
              className="bg-gradient-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${((currentStep + 1) / demoSteps.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 py-8">
        {/* Step header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-sans font-semibold text-foreground mb-2 dark:font-bold">
            {currentStepData.title}
          </h1>
          <p className="text-muted-foreground">
            {currentStepData.description}
          </p>
        </div>

        {/* Step content */}
        <div className="mb-8">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {currentStepData.component !== "signup" && (
          <div className="flex gap-3">
            {currentStep > 0 && (
              <Button 
                variant="outline" 
                onClick={prevStep}
                className="flex-1"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            )}
            
            {currentStepData.action && (
              <Button 
                onClick={nextStep}
                className="flex-1"
              >
                {currentStepData.action}
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        )}

        {/* Skip option */}
        {currentStep < demoSteps.length - 1 && (
          <div className="text-center mt-6">
            <Button 
              variant="ghost" 
              onClick={() => {
                localStorage.setItem('hasSeenDemo', 'true');
                navigate("/auth");
              }}
              className="text-muted-foreground"
            >
              Skip tour and sign up
            </Button>
          </div>
        )}
      </div>

      {/* Add Activity Modal for demo */}
      <AddActivityModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddActivity={handleAddDemoActivity}
      />
    </div>
  );
};

export default DemoTour;