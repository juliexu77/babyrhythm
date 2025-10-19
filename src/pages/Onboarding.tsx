import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useLanguage } from "@/contexts/LanguageContext";
import { Baby } from "lucide-react";

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
          {/* Icon */}
          <div className="flex items-center justify-center">
            <Baby className="w-6 h-6 text-primary" />
          </div>

          {/* Message */}
          <div className="space-y-4">
            <h1 className="text-2xl md:text-3xl font-sans font-medium text-foreground tracking-tight leading-tight">
              Understand your baby's rhythm — and your own.
            </h1>
            <p className="text-base text-muted-foreground font-light leading-relaxed max-w-lg mx-auto">
              A calm, intelligent companion that helps you track feeds, naps, and patterns — then gently reflects what they mean.
            </p>
          </div>

          {/* CTA */}
          <div className="space-y-6">
            <Button
              onClick={() => navigate("/auth")}
              size="lg"
              className="w-full h-12 text-base font-bold rounded-full"
            >
              Get Started
            </Button>
            <div className="space-y-2">
              <p className="text-center text-sm text-muted-foreground">
                Already have an account?{" "}
                <button
                  onClick={() => navigate("/auth")}
                  className="text-primary hover:underline font-medium"
                >
                  Log in
                </button>
              </p>
              <p className="text-center text-xs text-muted-foreground/70 italic leading-relaxed max-w-md mx-auto pt-4">
                Built for parents, partners, and caregivers — your whole village in sync.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Onboarding;