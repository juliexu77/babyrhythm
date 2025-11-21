import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";

const Onboarding = () => {
  const navigate = useNavigate();
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
          <div className="space-y-8">
            <h1 className="text-[22px] md:text-[36px] font-medium tracking-tight text-foreground" style={{ lineHeight: '1.25' }}>
              Where intuition meets intelligence
            </h1>
            <p className="text-[15px] md:text-[16px] leading-[1.6] font-normal mt-8 text-foreground/80">
              BabyRhythm learns your baby's natural patterns from the moment you log your first nap, feed, or diaper — gently predicting what comes next with insights that grow smarter every day.
            </p>
            <p className="text-[15px] md:text-[16px] leading-[1.6] font-normal text-foreground/80">
              Built to adapt to your baby's rhythm — so you feel calm, connected, and in sync.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-6">
            <Button
              onClick={handleGetStarted}
              className="w-full rounded-full py-[14px] px-8 text-base font-semibold"
            >
              Begin your rhythm
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
