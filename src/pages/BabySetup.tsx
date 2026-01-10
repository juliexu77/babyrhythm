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
import { rawStorage, StorageKeys } from "@/hooks/useLocalStorage";

import { Card, CardContent } from "@/components/ui/card";

const BabySetup = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [babyName, setBabyName] = useState("");
  const [babyBirthday, setBabyBirthday] = useState("");
  // Store as [bedtimeHour, bedtimeMinute, wakeHour, wakeMinute]
  const [bedtimeHour, setBedtimeHour] = useState(19);
  const [bedtimeMinute, setBedtimeMinute] = useState(0);
  const [wakeHour, setWakeHour] = useState(7);
  const [wakeMinute, setWakeMinute] = useState(0);

  // Format time with 5-minute intervals to 12-hour time string
  const formatTime = (hour: number, minute: number) => {
    const period = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour % 12 || 12;
    return `${displayHour}:${String(minute).padStart(2, '0')} ${period}`;
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
          night_sleep_start_hour: bedtimeHour,
          night_sleep_start_minute: bedtimeMinute,
          night_sleep_end_hour: wakeHour,
          night_sleep_end_minute: wakeMinute,
        })
        .eq('user_id', user.id);

      console.log('Profile update result:', { profileError });
      if (profileError) throw profileError;

      // Set active household for subsequent queries
      rawStorage.set(StorageKeys.ACTIVE_HOUSEHOLD_ID, householdId);

      toast({
        title: "Profile created",
        description: `Welcome to ${babyName}'s journey`,
      });

      // Mark that we're coming from baby setup to prevent redirect loops
      sessionStorage.setItem('from_baby_setup', 'true');
      navigate("/onboarding/village");
    } catch (error: any) {
      console.error("Error creating baby profile:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create profile. Please try again",
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
          <h1 className="text-xl font-sans font-bold text-foreground tracking-wide">
            Let's Meet Your Baby
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            So we can understand their rhythm and help you stay in tune.
          </p>
        </div>

        {/* Form */}
        <Card className="border-border bg-card/50 backdrop-blur shadow-card rounded-strava">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="babyName" className="text-xs font-semibold">
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
                  className="text-sm rounded-strava"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="babyBirthday" className="text-xs font-semibold">
                  Birthday
                </Label>
                <Input
                  id="babyBirthday"
                  type="date"
                  value={babyBirthday}
                  onChange={(e) => setBabyBirthday(e.target.value)}
                  required
                  disabled={isLoading}
                  className="text-sm rounded-strava"
                />
              </div>

              <div className="space-y-4">
                <div className="space-y-4">
                  <Label className="text-xs font-medium">
                    Sleep Schedule
                  </Label>
                  
                  <div className="bg-accent/20 rounded-strava p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-center flex-1">
                        <div className="text-[10px] text-muted-foreground mb-1 font-medium">Bedtime</div>
                        <div className="text-2xl font-num font-bold text-foreground">
                          {formatTime(bedtimeHour, bedtimeMinute)}
                        </div>
                      </div>
                      <div className="flex-shrink-0 px-4">
                        <div className="w-12 h-0.5 bg-primary/30"></div>
                      </div>
                      <div className="text-center flex-1">
                        <div className="text-[10px] text-muted-foreground mb-1 font-medium">Wake Time</div>
                        <div className="text-2xl font-num font-bold text-foreground">
                          {formatTime(wakeHour, wakeMinute)}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <div className="text-[10px] text-muted-foreground font-medium">Adjust bedtime</div>
                        <Slider
                          min={18 * 12}
                          max={23 * 12 + 11}
                          step={1}
                          value={[bedtimeHour * 12 + Math.floor(bedtimeMinute / 5)]}
                          onValueChange={(value) => {
                            const totalSlots = value[0];
                            const hour = Math.floor(totalSlots / 12);
                            const minute = (totalSlots % 12) * 5;
                            setBedtimeHour(hour);
                            setBedtimeMinute(minute);
                          }}
                          disabled={isLoading}
                          className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>6:00 PM</span>
                          <span>11:55 PM</span>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[10px] text-muted-foreground font-medium">Adjust wake time</div>
                        <Slider
                          min={5 * 12}
                          max={10 * 12 + 11}
                          step={1}
                          value={[wakeHour * 12 + Math.floor(wakeMinute / 5)]}
                          onValueChange={(value) => {
                            const totalSlots = value[0];
                            const hour = Math.floor(totalSlots / 12);
                            const minute = (totalSlots % 12) * 5;
                            setWakeHour(hour);
                            setWakeMinute(minute);
                          }}
                          disabled={isLoading}
                          className="w-full"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>5:00 AM</span>
                          <span>10:55 AM</span>
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
                  className="w-full font-semibold rounded-strava"
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
