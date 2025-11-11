import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

import { Card, CardContent } from "@/components/ui/card";

const BabySetup = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [babyName, setBabyName] = useState("");
  const [babyBirthday, setBabyBirthday] = useState("");
  const [sleepWindow, setSleepWindow] = useState<[number, number]>([19, 7]); // [bedtime, wake] in 24h format

  // Format hour to 12-hour time string
  const formatHour = (hour: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:00 ${period}`;
  };

  // Redirect to auth if not logged in
  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    setIsLoading(true);

    try {
      console.log('Starting baby setup for user:', user.id);
      
      // Create household with baby info
      const householdId = crypto.randomUUID();
      const { error: householdError } = await supabase
        .from("households")
        .insert({
          id: householdId,
          baby_name: babyName,
          baby_birthday: babyBirthday,
          name: `${babyName}'s Family`,
        });

      console.log('Household creation result:', { householdError });
      if (householdError) throw householdError;

      // Create collaborator entry for the user
      const { error: collaboratorError } = await supabase
        .from("collaborators")
        .insert({
          household_id: householdId,
          user_id: user.id,
          role: "parent",
          invited_by: user.id,
        });

      console.log('Collaborator creation result:', { collaboratorError });
      if (collaboratorError) throw collaboratorError;

      // Update user profile with sleep schedule
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          night_sleep_start_hour: sleepWindow[0],
          night_sleep_end_hour: sleepWindow[1],
        })
        .eq('user_id', user.id);

      console.log('Profile update result:', { profileError });
      if (profileError) throw profileError;

      // Set active household for subsequent queries
      localStorage.setItem('active_household_id', householdId);

      toast({
        title: "Profile created!",
        description: `Welcome to ${babyName}'s journey.`,
      });

      // Mark that we're coming from baby setup to prevent redirect loops
      sessionStorage.setItem('from_baby_setup', 'true');
      navigate("/onboarding/village");
    } catch (error: any) {
      console.error("Error creating baby profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create profile. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-2xl font-heading font-semibold text-foreground leading-tight">
            Let's meet your baby.
          </h1>
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            So we can understand their rhythm and help you stay in tune.
          </p>
        </div>

        {/* Form */}
        <Card className="border-border bg-card/50 backdrop-blur shadow-card">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="babyName" className="text-sm font-medium">
                  Baby's Name
                </Label>
                <Input
                  id="babyName"
                  type="text"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  placeholder="e.g., Emma"
                  required
                  disabled={isLoading}
                  className="text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="babyBirthday" className="text-sm font-medium">
                  Birthday
                </Label>
                <Input
                  id="babyBirthday"
                  type="date"
                  value={babyBirthday}
                  onChange={(e) => setBabyBirthday(e.target.value)}
                  required
                  disabled={isLoading}
                  className="text-sm"
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-4">
                  <Label className="text-sm font-medium">
                    Sleep Schedule
                  </Label>
                  
                  <div className="bg-accent/20 rounded-xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Bedtime</div>
                        <div className="text-2xl font-semibold text-foreground">
                          {formatHour(sleepWindow[0])}
                        </div>
                      </div>
                      <div className="flex-shrink-0 px-4">
                        <div className="w-12 h-0.5 bg-primary/30"></div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-xs text-muted-foreground mb-1">Wake Time</div>
                        <div className="text-2xl font-semibold text-foreground">
                          {formatHour(sleepWindow[1])}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Adjust bedtime</div>
                        <Slider
                          min={18}
                          max={23}
                          step={1}
                          value={[sleepWindow[0]]}
                          onValueChange={(value) => setSleepWindow([value[0], sleepWindow[1]])}
                          disabled={isLoading}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>6 PM</span>
                          <span>11 PM</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs text-muted-foreground">Adjust wake time</div>
                        <Slider
                          min={5}
                          max={10}
                          step={1}
                          value={[sleepWindow[1]]}
                          onValueChange={(value) => setSleepWindow([sleepWindow[0], value[0]])}
                          disabled={isLoading}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>5 AM</span>
                          <span>10 AM</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                    This helps us distinguish naps from night sleep
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <p className="text-xs text-muted-foreground italic mb-4 leading-relaxed">
                  You can always change these later in Settings.
                </p>
                <Button
                  type="submit"
                  className="w-full font-semibold"
                  disabled={isLoading}
                >
                  {isLoading ? "Creating..." : "Continue"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default BabySetup;
