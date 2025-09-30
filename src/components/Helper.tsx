import { NightDoulaReview } from "@/components/NightDoulaReview";
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

  return (
    <div className="space-y-6 p-4">
      <NightDoulaReview 
        activities={activities} 
        babyName={household?.baby_name} 
      />
      
      <ParentingChat />
    </div>
  );
};