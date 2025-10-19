import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const VillageInvite = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const [isTransitioning, setIsTransitioning] = useState(false);

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
        <div className="text-center space-y-6 animate-fade-in">
          <div className="flex items-center justify-center">
            <div className="relative">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center backdrop-blur-sm">
                <div className="w-16 h-16 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              </div>
            </div>
          </div>
          <p className="text-lg text-foreground font-light animate-pulse">
            Creating your rhythm…
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
          <p className="text-sm text-muted-foreground font-light leading-relaxed">
            Parenting is easier when shared.<br />
            Invite your partner, grandparent, or nanny to stay in sync.
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
              Skip for now — you can invite them anytime
            </Button>

            <p className="text-xs text-center text-muted-foreground italic leading-relaxed pt-2">
              Everyone sees the same daily rhythm — so care feels consistent and connected.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default VillageInvite;
