import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Sprout } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const BabySetup = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [babyName, setBabyName] = useState("");
  const [babyBirthday, setBabyBirthday] = useState("");

  // Remove the auth check from BabySetup redirect
  useEffect(() => {
    if (!user) {
      // When no user, create temp household in localStorage for demo
      const tempHousehold = localStorage.getItem('temp_household');
      if (!tempHousehold) {
        localStorage.setItem('temp_household', JSON.stringify({
          id: 'temp',
          baby_name: 'Baby',
          baby_birthday: null
        }));
      }
      return;
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // If no user, save to localStorage only
    if (!user) {
      localStorage.setItem('temp_household', JSON.stringify({
        id: 'temp',
        baby_name: babyName,
        baby_birthday: babyBirthday
      }));
      
      toast({
        title: "Profile saved locally!",
        description: `Welcome to ${babyName}'s journey. Sign up to sync across devices.`,
      });
      
      navigate("/onboarding/village");
      return;
    }

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
          <div className="flex items-center justify-center">
            <Sprout className="w-6 h-6 text-primary" />
          </div>
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

              <div className="pt-2">
                <p className="text-xs text-muted-foreground italic mb-4 leading-relaxed">
                  You can always change this later.
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
