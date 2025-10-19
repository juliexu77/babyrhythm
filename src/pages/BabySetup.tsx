import { useState } from "react";
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      // Create household with baby info
      const { data: household, error: householdError } = await supabase
        .from("households")
        .insert({
          baby_name: babyName,
          baby_birthday: babyBirthday,
          name: `${babyName}'s Family`,
        })
        .select()
        .single();

      if (householdError) throw householdError;

      // Create collaborator entry for the user
      const { error: collaboratorError } = await supabase
        .from("collaborators")
        .insert({
          household_id: household.id,
          user_id: user.id,
          role: "parent",
          invited_by: user.id,
        });

      if (collaboratorError) throw collaboratorError;

      toast({
        title: "Profile created!",
        description: `Welcome to ${babyName}'s journey.`,
      });

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
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center backdrop-blur-sm">
                <Sprout className="w-8 h-8 text-primary" />
              </div>
            </div>
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
