import { ParentingChat } from "@/components/ParentingChat";
import { useHousehold } from "@/hooks/useHousehold";

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
  
  const calculateBabyAgeInWeeks = () => {
    if (!household?.baby_birthday) return 0;
    const birthDate = new Date(household.baby_birthday);
    const today = new Date();
    const diffTime = today.getTime() - birthDate.getTime();
    const diffDays = Math.max(0, Math.floor(diffTime / (1000 * 60 * 60 * 24)));
    const weeks = Math.floor(diffDays / 7);
    return weeks;
  };

  return (
    <div className="h-full">
      <ParentingChat 
        activities={activities}
        babyName={household?.baby_name}
        babyAgeInWeeks={calculateBabyAgeInWeeks()}
      />
    </div>
  );
};