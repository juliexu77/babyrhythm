import { ParentingChat } from "@/components/ParentingChat";
import { useHousehold } from "@/hooks/useHousehold";
import { useUserProfile } from "@/hooks/useUserProfile";

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

interface HelperProps {
  activities: Activity[];
  babyBirthDate?: Date;
  onGoToSettings?: () => void;
}

export const Helper = ({ activities, babyBirthDate, onGoToSettings }: HelperProps) => {
  const { household, loading: householdLoading } = useHousehold();
  const { userProfile, loading: profileLoading } = useUserProfile();
  
  const calculateBabyAgeInWeeks = () => {
    if (!household?.baby_birthday) return 0;
    const birthDate = new Date(household.baby_birthday);
    const today = new Date();
    const diffTime = today.getTime() - birthDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    const weeks = Math.floor(diffDays / 7);
    return weeks;
  };

  const ageInWeeks = calculateBabyAgeInWeeks();
  
  // Get prediction signals
  const getPredictionSignals = () => {
    const now = new Date();
    const recentActivities = activities.filter(a => {
      const activityDate = new Date(a.logged_at);
      const hoursDiff = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 4;
    });
    
    const hasRecentSleep = recentActivities.some(a => a.type === 'nap' && !a.details?.endTime);
    const hasRecentFeed = recentActivities.some(a => a.type === 'feed');
    
    if (hasRecentSleep) {
      return { intent: 'LET_SLEEP_CONTINUE', confidence: 'medium' };
    } else if (hasRecentFeed) {
      return { intent: 'START_WIND_DOWN', confidence: 'medium' };
    }
    return { intent: 'FEED_SOON', confidence: 'low' };
  };
  
  const predictionSignals = getPredictionSignals();
  
  // Extract first name from full name
  const userName = userProfile?.full_name?.split(' ')[0] || userProfile?.full_name;
  
  // Wait for essential data to load before showing chat
  if (householdLoading || profileLoading || !household) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto animate-pulse">
            <span className="text-2xl">🌿</span>
          </div>
          <p className="text-sm text-muted-foreground">Preparing your guide...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full">
      <ParentingChat 
        activities={activities}
        babyName={household.baby_name || 'Baby'}
        babyAgeInWeeks={ageInWeeks}
        userName={userName || 'Parent'}
        predictionIntent={predictionSignals.intent}
        predictionConfidence={predictionSignals.confidence}
        onGoToSettings={onGoToSettings}
      />
    </div>
  );
};