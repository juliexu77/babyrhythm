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
        <div className="relative">
          <div className="absolute -inset-1 bg-gradient-to-r from-primary/30 to-accent/30 rounded-full blur opacity-75 animate-pulse"></div>
          <ThemeToggle showText={false} />
        </div>
      </div>
      
      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md mx-auto text-center space-y-8">
          {/* App Icon & Branding */}
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center backdrop-blur-sm">
              <Baby className="w-8 h-8 text-foreground" />
            </div>
            <Heart className="w-6 h-6 text-accent/80" />
          </div>

          {/* Mission Statement */}
          <div className="space-y-6">
            <h1 className="text-2xl font-sans font-medium text-foreground leading-tight dark:font-bold">
              {t('welcomeToApp')}
            </h1>
            <p className="text-base text-muted-foreground leading-relaxed">
              Track feedings, sleep, and milestones together with family and caregivers.
            </p>
          </div>

          {/* CTA */}
          <div className="pt-8">
            <Button 
              onClick={() => navigate("/auth")}
              size="lg"
              className="w-full h-12 text-base font-bold rounded-full"
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