import { Activity } from "./ActivityCard";
import { PatternInsights } from "./PatternInsights";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Baby, Clock, Milk, Moon, Lightbulb } from "lucide-react";
import { calculateAgeInWeeks, getWakeWindowForAge, getFeedingGuidanceForAge } from "@/utils/huckleberrySchedules";
import { useHousehold } from "@/hooks/useHousehold";

interface InsightsTabProps {
  activities: Activity[];
}

export const InsightsTab = ({ activities }: InsightsTabProps) => {
  const { household, loading: householdLoading } = useHousehold();
  
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
    if (weeks < 4) return "Newborn";
    if (weeks < 12) return "Young Infant";
    if (weeks < 26) return "Older Infant";
    if (weeks < 52) return "Mobile Infant";
    return "Toddler";
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
          What to Expect at {Math.floor(ageInWeeks)} Weeks
        </h2>
      </div>
      
      <div className="text-sm text-muted-foreground mb-4">
        {getAgeStage(ageInWeeks)} Stage
      </div>

      <div className="grid gap-4">
        {/* Sleep Guidance */}
        {wakeWindowData && (
          <div className="p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="h-4 w-4 text-primary" />
              <h3 className="font-medium text-foreground">Sleep Patterns</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Wake Windows:</span>
                <span className="font-medium">{wakeWindowData.wakeWindows.join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Expected Naps:</span>
                <span className="font-medium">{wakeWindowData.napCount} per day</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Sleep Need:</span>
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
              <h3 className="font-medium text-foreground">Feeding Patterns</h3>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Frequency:</span>
                <span className="font-medium">{feedingGuidance.frequency}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Amount per Feed:</span>
                <span className="font-medium">{feedingGuidance.amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Daily Total:</span>
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
            <h3 className="font-medium text-foreground">Development Focus</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            {ageInWeeks < 4 && "Focus on establishing feeding routines and lots of skin-to-skin contact. Sleep is irregular but will gradually improve."}
            {ageInWeeks >= 4 && ageInWeeks < 12 && "Baby is developing more predictable patterns. Tummy time becomes important for neck and shoulder strength."}
            {ageInWeeks >= 12 && ageInWeeks < 26 && "Sleep patterns are becoming more consolidated. Baby may start showing interest in toys and faces."}
            {ageInWeeks >= 26 && ageInWeeks < 52 && "Baby is becoming more mobile and curious. Sleep may be disrupted by developmental leaps."}
            {ageInWeeks >= 52 && "Your little one is becoming more independent. Routine and consistency remain important."}
          </div>
        </div>
      </div>
    </div>
  </div>
);
};