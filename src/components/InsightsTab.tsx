import { Activity } from "./ActivityCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, Clock, Milk, Moon, Lightbulb, Brain } from "lucide-react";
import { calculateAgeInWeeks, getWakeWindowForAge, getFeedingGuidanceForAge } from "@/utils/huckleberrySchedules";
import { useHousehold } from "@/hooks/useHousehold";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePatternAnalysis } from "@/hooks/usePatternAnalysis";

interface InsightsTabProps {
  activities: Activity[];
}

export const InsightsTab = ({ activities }: InsightsTabProps) => {
  const { household, loading: householdLoading } = useHousehold();
  const { t } = useLanguage();
  const { insights } = usePatternAnalysis(activities);
  
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
  
  // Categorize insights by type
  const sleepInsights = insights.filter(i => i.type === 'sleep');
  const feedingInsights = insights.filter(i => i.type === 'feeding');

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
    {/* Age-Appropriate Guidance - NOW FIRST */}
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
        {/* Sleep Guidance with actual patterns nested */}
        {wakeWindowData && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
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
              
              {/* Nested actual patterns from baby's data */}
              {sleepInsights.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-3 w-3 text-primary/70" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {household?.baby_name}'s Patterns
                    </span>
                  </div>
                  {sleepInsights.map((insight, idx) => {
                    const IconComponent = insight.icon;
                    return (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <IconComponent className="h-3 w-3 text-primary/60 mt-0.5 flex-shrink-0" />
                        <span className="text-primary/90">{insight.text}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feeding Guidance with actual patterns nested */}
        {feedingGuidance && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-3">
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
                  {feedingGuidance.notes === "Newborns need frequent small feeds. Follow baby's hunger cues." && t('newbornsFeedFrequent')}
                  {feedingGuidance.notes === "Feeding patterns are becoming more predictable." && t('feedingPatternsBecoming')}
                  {feedingGuidance.notes === "Baby can go longer between feeds now." && t('babyCanGoLonger')}
                  {feedingGuidance.notes === "Sleep periods are getting longer, affecting feeding schedule." && t('sleepPeriodsLonger')}
                  {feedingGuidance.notes === "May start showing interest in solid foods around 4-6 months." && t('mayStartSolids')}
                  {feedingGuidance.notes === "Solid foods are becoming a bigger part of nutrition." && t('solidsBecomingBigger')}
                </div>
              )}
              
              {/* Nested actual patterns from baby's data */}
              {feedingInsights.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain className="h-3 w-3 text-primary/70" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      {household?.baby_name}'s Patterns
                    </span>
                  </div>
                  {feedingInsights.map((insight, idx) => {
                    const IconComponent = insight.icon;
                    return (
                      <div key={idx} className="flex items-start gap-2 text-xs">
                        <IconComponent className="h-3 w-3 text-primary/60 mt-0.5 flex-shrink-0" />
                        <span className="text-primary/90">{insight.text}</span>
                      </div>
                    );
                  })}
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