import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const BabyAge = () => {
  const { user } = useAuth();
  const [babyData, setBabyData] = useState<{
    name: string | null;
    birthDate: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user) return;

    const fetchBabyProfile = async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("baby_name, baby_birth_date")
        .eq("user_id", user.id)
        .single();

      if (data && !error) {
        setBabyData({
          name: data.baby_name,
          birthDate: data.baby_birth_date,
        });
      }
    };

    fetchBabyProfile();
  }, [user]);

  const calculateAge = (birthDate: string) => {
    const birth = new Date(birthDate);
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - birth.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} old`;
    } else if (diffDays < 30) {
      const weeks = Math.floor(diffDays / 7);
      const remainingDays = diffDays % 7;
      if (remainingDays === 0) {
        return `${weeks} week${weeks !== 1 ? 's' : ''} old`;
      }
      return `${weeks}w ${remainingDays}d old`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      const remainingDays = diffDays % 30;
      if (remainingDays < 7) {
        return `${months} month${months !== 1 ? 's' : ''} old`;
      }
      const weeks = Math.floor(remainingDays / 7);
      return `${months}m ${weeks}w old`;
    } else {
      const years = Math.floor(diffDays / 365);
      const remainingMonths = Math.floor((diffDays % 365) / 30);
      if (remainingMonths === 0) {
        return `${years} year${years !== 1 ? 's' : ''} old`;
      }
      return `${years}y ${remainingMonths}m old`;
    }
  };

  if (!babyData?.birthDate) return null;

  return (
    <div className="text-center mb-4">
      <h2 className="text-lg font-medium text-white/95 mb-1">
        {babyData.name || "Baby"}
      </h2>
      <p className="text-sm text-white/80 font-medium">
        {calculateAge(babyData.birthDate)}
      </p>
    </div>
  );
};