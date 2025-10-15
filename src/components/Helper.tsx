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
}

export const Helper = ({ activities, babyBirthDate }: HelperProps) => {
  const { household } = useHousehold();
  const { userProfile } = useUserProfile();
  
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
  
  // Get prediction signals (simplified - you can enhance this with actual prediction engine)
  const getPredictionSignals = () => {
    const now = new Date();
    const recentActivities = activities.filter(a => {
      const activityDate = new Date(a.logged_at);
      const hoursDiff = (now.getTime() - activityDate.getTime()) / (1000 * 60 * 60);
      return hoursDiff <= 4; // Last 4 hours
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

  return (
    <div className="h-full">
      <ParentingChat 
        activities={activities}
        babyName={household?.baby_name}
        babyAgeInWeeks={ageInWeeks}
        userName={userProfile?.full_name?.split(' ')[0]}
        predictionIntent={predictionSignals.intent}
        predictionConfidence={predictionSignals.confidence}
      />
    </div>
  );
};