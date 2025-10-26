import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { Sprout } from "lucide-react";

const Onboarding = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  const [inviteCode, setInviteCode] = useState("");
  const [error, setError] = useState("");

  // Redirect returning users with households to main app
  useEffect(() => {
    if (authLoading || householdLoading) return;
    if (user && household) {
      navigate("/", { replace: true });
    }
  }, [user, household, authLoading, householdLoading, navigate]);

  const handleGetStarted = () => {
    if (inviteCode.toLowerCase() === "village") {
      navigate("/auth");
    } else {
      setError("Invalid invite code");
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur opacity-75 animate-pulse"></div>
          <ThemeToggle showText={false} />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center space-y-12">
          {/* Logo */}
          <div className="flex items-center justify-center gap-3">
            <Sprout className="w-8 h-8 text-primary" />
            <div className="flex flex-col leading-none">
              <span className="text-2xl font-heading font-bold text-primary tracking-tight">
                BABYDEX
              </span>
              <span className="text-xs font-heading font-medium text-primary/70 tracking-wide">
                BABY TRACKER
              </span>
            </div>
          </div>

          {/* Message */}
          <div className="space-y-5">
            <h1 className="text-2xl md:text-3xl font-sans font-medium text-foreground tracking-tight leading-tight">
              Intelligence meets intuition
            </h1>
            <p className="text-sm text-muted-foreground font-light leading-relaxed max-w-lg mx-auto">
              Powered by the shared wisdom of parents, experts, and caregivers — tailored to your baby's unique rhythm.
            </p>
          </div>

          {/* CTA */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Input
                type="text"
                placeholder="Enter invite code"
                value={inviteCode}
                onChange={(e) => {
                  setInviteCode(e.target.value);
                  setError("");
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleGetStarted();
                  }
                }}
                className="h-12 text-center rounded-full"
              />
              {error && (
                <p className="text-sm text-destructive text-center">{error}</p>
              )}
            </div>
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="w-full h-12 text-base font-bold rounded-full"
            >
              Get Started
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;