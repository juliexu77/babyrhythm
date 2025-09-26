import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { LogOut } from "lucide-react";

export const Settings = () => {
  const { user, signOut } = useAuth();
  const { t } = useLanguage();

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span>Theme</span>
          <ThemeToggle />
        </div>
        
        <div className="flex items-center justify-between">
          <span>Language</span>
          <LanguageToggle />
        </div>
      </div>
      
      {user && (
        <Button
          onClick={signOut}
          variant="outline"
          className="w-full text-destructive hover:text-destructive"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {t('signOut')}
        </Button>
      )}
    </div>
  );
};

export default Settings;