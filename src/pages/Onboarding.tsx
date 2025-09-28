import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { Baby, Heart } from "lucide-react";

const Onboarding = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background flex flex-col relative">
      {/* Language and Theme Toggles */}
      <div className="absolute top-4 right-4 z-10 flex gap-2">
        <LanguageToggle />
        <ThemeToggle showText={false} />
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center space-y-8">
          {/* App Icon & Branding */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-xl bg-card shadow-card border border-border flex items-center justify-center">
              <Baby className="w-8 h-8 text-primary" />
            </div>
            <Heart className="w-6 h-6 text-primary/60" />
          </div>

          {/* Mission Statement */}
          <div className="bg-card rounded-xl p-6 shadow-card border border-border space-y-6">
            <h1 className="text-2xl font-serif font-semibold text-foreground leading-tight">
              {t('welcomeToApp')}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Track feedings, sleep, and milestones together with family and caregivers.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-2">
            <Button 
              onClick={() => navigate("/auth")}
              size="lg"
              className="w-full h-12 text-base font-semibold rounded-xl shadow-card hover:shadow-soft transition-all duration-300"
            >
              {t('getStarted')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;