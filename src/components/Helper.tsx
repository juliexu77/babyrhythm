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
    console.log('Baby age calculation:', {
      birthday: household.baby_birthday,
      birthDate: birthDate.toISOString(),
      today: today.toISOString(),
      diffDays,
      weeks
    });
    return weeks;
  };

  const ageInWeeks = calculateBabyAgeInWeeks();
  console.log('Passing baby age to ParentingChat:', ageInWeeks);

  return (
    <div className="h-full">
      <ParentingChat 
        activities={activities}
        babyName={household?.baby_name}
        babyAgeInWeeks={ageInWeeks}
      />
    </div>
  );
};