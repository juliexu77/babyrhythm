import { useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHousehold } from "@/hooks/useHousehold";
import { DevelopmentTable } from "@/components/guide/DevelopmentTable";
import { GuideEmptyState, GuideLoadingState } from "@/components/guide";

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

interface GuideTabProps {
  activities: Activity[];
  onGoToSettings?: () => void;
}

export const GuideTab = ({ activities, onGoToSettings }: GuideTabProps) => {
  const { household, loading: householdLoading } = useHousehold();

  const babyName = household?.baby_name || 'Baby';
  const babyAgeInWeeks = useMemo(() => {
    if (!household?.baby_birthday) return 0;
    return Math.floor((Date.now() - new Date(household.baby_birthday).getTime()) / (1000 * 60 * 60 * 24 * 7));
  }, [household?.baby_birthday]);

  const needsBirthdaySetup = !babyAgeInWeeks || babyAgeInWeeks === 0;

  // TODO: Store calibration flags in localStorage or DB
  const handleConfirmMilestone = (domainId: string, stageNumber: number) => {
    console.log(`Confirmed milestone for ${domainId}: stage ${stageNumber}`);
    // Future: save to localStorage or Supabase
  };

  if (householdLoading) {
    return (
      <div className="flex flex-col h-full bg-background pb-24">
        <GuideLoadingState />
      </div>
    );
  }

  if (!household) {
    return (
      <div className="flex flex-col h-full bg-background pb-24">
        <GuideEmptyState type="no-household" onGoToSettings={onGoToSettings} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background pb-24">
      {needsBirthdaySetup ? (
        <GuideEmptyState type="needs-birthday" onGoToSettings={onGoToSettings} />
      ) : (
        <ScrollArea className="flex-1">
          <DevelopmentTable
            ageInWeeks={babyAgeInWeeks}
            babyName={babyName}
            onConfirmMilestone={handleConfirmMilestone}
          />
        </ScrollArea>
      )}
    </div>
  );
};
