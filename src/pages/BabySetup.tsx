import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MultiStepOnboarding } from "@/components/MultiStepOnboarding";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";

const BabySetup = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { household, loading: profileLoading } = useHousehold();

  // Check if user already has baby profile, skip setup
  useEffect(() => {
    if (authLoading || profileLoading) return;

    // Require authentication - redirect to auth if not logged in
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }

    // If user has a household, redirect to main app
    if (household) {
      navigate("/app", { replace: true });
      return;
    }

    // Otherwise show baby setup
  }, [user, household, authLoading, profileLoading, navigate]);

  const handleOnboardingComplete = () => {
    // Navigate to main app after completion
    navigate("/app", { replace: true });
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <MultiStepOnboarding onComplete={handleOnboardingComplete} />
    </div>
  );
};

export default BabySetup;
