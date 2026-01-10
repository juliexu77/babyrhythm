/**
 * Empty state component for HomeTab when no activities are logged.
 * Extracted from HomeTab for better component organization.
 */

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Baby, Moon, TrendingUp, Plus, Clock, FileText, Activity as ActivityIcon } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface HomeEmptyStateProps {
  userName?: string;
  babyName?: string;
  showEducationalContent: boolean;
  onAddActivity: () => void;
  onShowPrefillModal: () => void;
}

export const HomeEmptyState = ({
  userName,
  babyName,
  showEducationalContent,
  onAddActivity,
  onShowPrefillModal,
}: HomeEmptyStateProps) => {
  const { t } = useLanguage();

  return (
    <div className="min-h-screen pb-24 px-4 pt-6 animate-fade-in">
      <div className="space-y-3">
        {/* Welcome Message */}
        <div className="space-y-3">
          <h2 className="text-page-header">
            Hi {userName || 'there'} 👋
          </h2>
          <p className="text-body-muted leading-relaxed">
            Let's discover {babyName ? `${babyName}'s` : 'your baby\'s'} unique rhythm together. Every activity you log helps me understand what they need next.
          </p>
        </div>

        {/* Improved Empty State Card */}
        <Card className="p-6 bg-card/50 border border-border/40">
          <div className="space-y-5">
            <div className="space-y-2">
              <h3 className="text-section-header">
                Start tracking to unlock predictions
              </h3>
              <p className="text-body-muted leading-relaxed">
                With just one activity logged, you'll see your first prediction appear.
              </p>
            </div>
            
            <div className="space-y-3 pt-2">
              <p className="text-label-sm">
                What you'll discover:
              </p>
              
              {/* Preview Cards */}
              <div className="space-y-2.5">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
                  <Moon className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium">Nap predictions</p>
                    <p className="text-xs text-muted-foreground">Know when sleep windows open</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-accent/5 border border-accent/20">
                  <Baby className="h-5 w-5 text-accent-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium">Feed timing</p>
                    <p className="text-xs text-muted-foreground">Anticipate hunger windows</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/20">
                  <TrendingUp className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-foreground font-medium">Daily rhythm</p>
                    <p className="text-xs text-muted-foreground">See patterns emerge over time</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-3 border-t border-border/20 space-y-2">
              <Button
                onClick={onAddActivity}
                variant="default"
                className="w-full"
                size="lg"
              >
                <Plus className="w-4 h-4 mr-2" />
                Log first activity
              </Button>
              <Button
                onClick={onShowPrefillModal}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Clock className="w-4 h-4 mr-2" />
                Quick start with sample day
              </Button>
            </div>
          </div>
        </Card>

        {/* Educational Content for New Users */}
        {showEducationalContent && (
          <EducationalLinks babyName={babyName} />
        )}
      </div>
    </div>
  );
};

interface EducationalLinksProps {
  babyName?: string;
}

const EducationalLinks = ({ babyName }: EducationalLinksProps) => {
  const handleTabClick = (tabName: string) => {
    const tab = document.querySelector(`[data-tab="${tabName}"]`) as HTMLElement;
    tab?.click();
  };

  return (
    <div className="space-y-4 pt-4 border-t border-border/40">
      {/* Trends Tab Info */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <TrendingUp className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              After a few days of tracking, you'll see {babyName ? `${babyName}'s` : 'your baby\'s'} sleep, feeding, and mood patterns emerge on the Trends section.
            </p>
          </div>
        </div>
        <Button
          onClick={() => handleTabClick('trends')}
          variant="outline"
          size="sm"
          className="w-full"
        >
          View Trends
        </Button>
      </div>

      {/* Rhythm Tab Info */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <ActivityIcon className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Rhythm shows your baby's daily patterns and helps you understand their unique schedule.
            </p>
          </div>
        </div>
        <Button
          onClick={() => handleTabClick('rhythm')}
          variant="outline"
          size="sm"
          className="w-full"
        >
          View Rhythm
        </Button>
      </div>

      {/* History Tab Info */}
      <div className="space-y-2">
        <div className="flex items-start gap-3">
          <FileText className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
          <div className="flex-1 space-y-1">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Export and share your data with partners or pediatricians anytime from History.
            </p>
          </div>
        </div>
        <Button
          onClick={() => handleTabClick('history')}
          variant="outline"
          size="sm"
          className="w-full"
        >
          View Log
        </Button>
      </div>
    </div>
  );
};
