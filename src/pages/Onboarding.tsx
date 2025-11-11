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
          <div className="space-y-8">
            <h1 className="text-[22px] md:text-[36px] font-medium text-foreground/90 tracking-tight" style={{ lineHeight: '1.25', color: 'rgba(243, 241, 242, 0.9)' }}>
              Where intuition meets intelligence
            </h1>
            <p className="text-[15px] md:text-[16px] leading-[1.6] font-normal mt-8" style={{ color: '#C9C6C9' }}>
              BabyRhythm learns your baby's natural patterns from the moment you log your first nap, feed, or diaper — gently predicting what comes next with insights that grow smarter every day.
            </p>
            <p className="text-[15px] md:text-[16px] leading-[1.6] font-normal" style={{ color: '#C9C6C9' }}>
              Built to adapt to your baby's rhythm — so you feel calm, connected, and in sync.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-6">
            <Button
              onClick={handleGetStarted}
              size="lg"
              className="w-full h-14 text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all relative overflow-hidden group"
            >
              <span className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/10 to-primary/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></span>
              <span className="relative">Begin your rhythm</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;