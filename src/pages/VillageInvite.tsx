import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const VillageInvite = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Require authentication for this step
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleContinue = () => {
    setIsTransitioning(true);
    // Show loading animation for 1.5 seconds before navigating
    setTimeout(() => {
      navigate("/app");
    }, 1500);
  };

  if (isTransitioning) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
          </div>
          <p className="text-foreground/90 font-medium">
            Loading your household…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-2xl font-heading font-semibold text-foreground leading-tight">
            Who's in your village?
          </h1>
          <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-sm mx-auto">
            BabyRhythm syncs instantly across caregivers — parents, partners, and nannies see the same log in real time.
          </p>
          <p className="text-xs text-primary/90 font-medium pt-1">
            Invite your caregiver now so your rhythm learns twice as fast.
          </p>
        </div>

        <Card className="border-border bg-card/50 backdrop-blur shadow-card">
          <CardContent className="pt-6 space-y-4">
            <Button
              onClick={handleContinue}
              className="w-full font-semibold"
            >
              + Add someone
            </Button>
            
            <Button
              onClick={handleContinue}
              variant="ghost"
              className="w-full font-normal text-muted-foreground"
            >
              Skip for now
            </Button>

            <p className="text-xs text-center text-muted-foreground/80 leading-relaxed pt-2">
              Multiple caregivers = more data points = smarter predictions
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VillageInvite;
