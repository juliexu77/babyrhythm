import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";


const Onboarding = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { user, loading: authLoading } = useAuth();
  const { household, loading: householdLoading } = useHousehold();
  // Redirect returning users with households to main app
  useEffect(() => {
    if (authLoading || householdLoading) return;
    if (user && household) {
      navigate("/", { replace: true });
    }
  }, [user, household, authLoading, householdLoading, navigate]);

  const handleGetStarted = () => {
    navigate("/auth");
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
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="max-w-md mx-auto text-center space-y-10">
          {/* Logo */}
          <div className="flex flex-col items-center justify-center leading-none">
            <span className="text-2xl font-sans font-bold text-primary tracking-tight">
              BABYRHYTHM
            </span>
          </div>

          {/* Welcome Message */}
          <div className="space-y-6">
            <h1 className="text-3xl md:text-4xl font-sans font-semibold text-foreground tracking-tight leading-tight">
              Intelligence meets Intuition
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed max-w-md mx-auto font-medium">
              Your AI parenting companion
            </p>
            <p className="text-sm text-muted-foreground/80 max-w-sm mx-auto">
              Log naps, feeds, and diapers. I'll learn from your entries and start predicting wake windows once I have enough data.
            </p>
            <p className="text-xs text-muted-foreground/70 italic max-w-sm mx-auto">
              Predictions begin after a few days of logs — but I can chat and guide you right away.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-4">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="w-full h-14 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
              <span className="relative">Let's start your rhythm</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;