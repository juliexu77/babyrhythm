import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { Baby, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BabyProfileSetupProps {
  onComplete: (profile: { name: string; birthday: string }) => void;
}

export const BabyProfileSetup = ({ onComplete }: BabyProfileSetupProps) => {
  const [babyName, setBabyName] = useState("");
  const [birthday, setBirthday] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!babyName.trim()) {
      toast({
        title: t('babyName'),
        description: "Please enter your baby's name to continue.",
        variant: "destructive",
      });
      return;
    }

    if (!birthday) {
      toast({
        title: t('babyBirthday'),
        description: "Please select your baby's birthday to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    // Save baby profile to localStorage for now
    const profile = {
      name: babyName.trim(),
      birthday: birthday,
    };
    
    localStorage.setItem('babyProfile', JSON.stringify(profile));
    
    // Mark profile as completed so setup won't show again
    localStorage.setItem('babyProfileCompleted', 'true');
    
    onComplete(profile);
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
            <Baby className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">
            {t('setupProfile')}
          </h1>
          <p className="text-muted-foreground text-sm">
            Let's personalize your tracking experience
          </p>
          
          {/* Skip option */}
          <div className="text-center mt-4">
            <button
              onClick={() => {
                localStorage.setItem('babyProfileSkipped', 'true');
                onComplete({ name: 'Baby', birthday: '' });
              }}
              className="text-sm text-muted-foreground hover:text-foreground underline"
            >
              Skip for now (you can add this later in settings)
            </button>
          </div>
        </div>

        {/* Setup Form */}
        <Card className="border border-border">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-foreground">
              Baby Profile
            </CardTitle>
            <CardDescription className="text-center">
              We'll use this information to personalize your experience
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="baby-name" className="text-sm font-medium">
                  {t('babyName')} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="baby-name"
                  type="text"
                  placeholder={t('babyName')}
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  required
                  disabled={isLoading}
                  className="h-12"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="birthday" className="text-sm font-medium">
                  {t('babyBirthday')} <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="birthday"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    disabled={isLoading}
                    className="h-12 pl-10"
                    required
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base" 
                disabled={isLoading || !babyName.trim() || !birthday}
              >
                {isLoading ? "Setting up..." : t('continue')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};