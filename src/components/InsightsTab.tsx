import { Activity } from "./ActivityCard";
import { PatternInsights } from "./PatternInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, Clock, Milk, Moon, Lightbulb } from "lucide-react";
import { calculateAgeInWeeks, getWakeWindowForAge, getFeedingGuidanceForAge } from "@/utils/huckleberrySchedules";
import { useHousehold } from "@/hooks/useHousehold";
import { useLanguage } from "@/contexts/LanguageContext";

interface InsightsTabProps {
  activities: Activity[];
}

export const InsightsTab = ({ activities }: InsightsTabProps) => {
  const { household, loading: householdLoading } = useHousehold();
  const { t } = useLanguage();
  
  // Show loading state while household data is being fetched
  if (householdLoading || !household) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading insights...</p>
        </div>
      </div>
    );
  }
  
  const ageInWeeks = household?.baby_birthday ? calculateAgeInWeeks(household.baby_birthday) : 0;
  const wakeWindowData = getWakeWindowForAge(ageInWeeks);
  const feedingGuidance = getFeedingGuidanceForAge(ageInWeeks);

  const getAgeStage = (weeks: number) => {
    if (weeks < 4) return t('newborn');
    if (weeks < 12) return t('youngInfant');
    if (weeks < 26) return t('olderInfant');
    if (weeks < 52) return t('mobileInfant');
    return t('toddler');
  };

  const getDevelopmentFocus = (weeks: number) => {
    if (weeks < 4) return t('devFocus0to4');
    if (weeks >= 4 && weeks < 12) return t('devFocus4to12');
    if (weeks >= 12 && weeks < 26) return t('devFocus12to26');
    if (weeks >= 26 && weeks < 52) return t('devFocus26to52');
    return t('devFocus52plus');
  };

return (
  <div className="space-y-6">
    {/* Pattern Insights FIRST */}
    <PatternInsights activities={activities} />

    {/* Age-Appropriate Guidance */}
    <div className="bg-card rounded-xl p-6 shadow-card border border-border">
      <div className="flex items-center gap-2 mb-4">
        <Lightbulb className="h-5 w-5 text-primary" />
        <h2 className="text-xl font-sans font-semibold text-foreground dark:font-bold">
          {t('whatToExpectAt')} {Math.floor(ageInWeeks)} {t('weeks')}
        </h2>
      </div>
      
      <div className="text-sm text-muted-foreground mb-4">
        {getAgeStage(ageInWeeks)} {t('stage')}
      </div>

      <div className="grid gap-4">
        {/* Sleep Guidance */}
        {wakeWindowData && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-foreground">{t('sleepPatterns')}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('wakeWindows')}:</span>
                <span className="font-medium">{wakeWindowData.wakeWindows.join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('expectedNaps')}:</span>
                <span className="font-medium">{wakeWindowData.napCount} {t('perDay')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('totalSleepNeed')}:</span>
                <span className="font-medium">{wakeWindowData.totalSleep}</span>
              </div>
            </div>
          </div>
        )}

        {/* Feeding Guidance */}
        {feedingGuidance && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Milk className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-foreground">{t('feedingPatterns')}</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('frequency')}:</span>
                <span className="font-medium">{feedingGuidance.frequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('amountPerFeed')}:</span>
                <span className="font-medium">{feedingGuidance.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('dailyTotal')}:</span>
                <span className="font-medium">{feedingGuidance.dailyTotal}</span>
              </div>
              {feedingGuidance.notes && (
                <div className="pt-2 text-xs text-muted-foreground border-t border-border/50">
                  {feedingGuidance.notes}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Development Milestones */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <Baby className="h-4 w-4 text-primary" />
            <h3 className="font-medium text-foreground">{t('developmentFocus')}</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            {getDevelopmentFocus(ageInWeeks)}
          </div>
        </div>
      </div>
    </div>
  </div>
);
};