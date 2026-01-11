import { Activity } from "@/components/ActivityCard";
import { TrendingUp, Baby, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { differenceInMinutes, startOfDay, subDays } from "date-fns";

interface GrowthIndicatorsProps {
  activities: Activity[];
  babyBirthday?: string;
}

export const GrowthIndicators = ({ activities, babyBirthday }: GrowthIndicatorsProps) => {
  const today = startOfDay(new Date());
  const todayActivities = activities.filter(
    (a) => startOfDay(new Date(a.loggedAt || a.time || "")).getTime() === today.getTime()
  );

  // Detect cluster feeding: 3+ feeds within 3 hours
  const detectClusterFeeding = () => {
    const feeds = todayActivities
      .filter((a) => a.type === "feed")
      .sort((a, b) => 
        new Date(a.loggedAt || a.time || "").getTime() - 
        new Date(b.loggedAt || b.time || "").getTime()
      );

    for (let i = 0; i < feeds.length - 2; i++) {
      const firstFeedTime = new Date(feeds[i].loggedAt || feeds[i].time || "");
      const thirdFeedTime = new Date(feeds[i + 2].loggedAt || feeds[i + 2].time || "");
      const minutesDiff = differenceInMinutes(thirdFeedTime, firstFeedTime);
      
      if (minutesDiff <= 180) { // 3 hours
        return true;
      }
    }
    return false;
  };

  // Detect growth spurt: feed volume 20%+ higher than 7-day average
  const detectGrowthSpurt = () => {
    const last7Days = subDays(today, 7);
    const recentActivities = activities.filter(
      (a) => new Date(a.loggedAt || a.time || "").getTime() >= last7Days.getTime()
    );

    const todayVolume = todayActivities
      .filter((a) => a.type === "feed" && a.details?.quantity)
      .reduce((sum, a) => sum + (Number(a.details.quantity) || 0), 0);

    const last7DaysVolumes = [];
    for (let i = 1; i <= 7; i++) {
      const dayStart = startOfDay(subDays(today, i));
      const dayFeeds = recentActivities.filter(
        (a) => a.type === "feed" && 
          startOfDay(new Date(a.loggedAt || a.time || "")).getTime() === dayStart.getTime() &&
          a.details?.quantity
      );
      const dayVolume = dayFeeds.reduce((sum, a) => sum + (Number(a.details.quantity) || 0), 0);
      if (dayVolume > 0) last7DaysVolumes.push(dayVolume);
    }

    if (last7DaysVolumes.length === 0) return false;
    const avgVolume = last7DaysVolumes.reduce((a, b) => a + b, 0) / last7DaysVolumes.length;
    
    return todayVolume > avgVolume * 1.2; // 20% higher
  };

  // Detect sleep regression windows based on age
  const detectRegressionWindow = () => {
    if (!babyBirthday) return null;
    
    const birthDate = new Date(babyBirthday);
    const ageInMonths = Math.floor(
      (new Date().getTime() - birthDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    );

    // Common regression windows with ±2 week buffer
    const regressions = [
      { months: 4, label: "4-month" },
      { months: 8, label: "8-month" },
      { months: 12, label: "12-month" },
      { months: 18, label: "18-month" },
    ];

    for (const regression of regressions) {
      // Check if within ±2 weeks of regression milestone
      if (Math.abs(ageInMonths - regression.months) <= 0.5) {
        return regression.label;
      }
    }
    return null;
  };

  const isClusterFeeding = detectClusterFeeding();
  const isGrowthSpurt = detectGrowthSpurt();
  const regressionWindow = detectRegressionWindow();

  if (!isClusterFeeding && !isGrowthSpurt && !regressionWindow) {
    return null;
  }

  return (
    <div className="pb-4 space-y-2">
      {isClusterFeeding && (
        <Badge variant="secondary" className="w-full justify-start gap-2 py-2 text-sm font-normal">
          <TrendingUp className="h-4 w-4 text-warning" />
          <span>Cluster feeding detected</span>
        </Badge>
      )}
      
      {isGrowthSpurt && (
        <Badge variant="secondary" className="w-full justify-start gap-2 py-2 text-sm font-normal">
          <Baby className="h-4 w-4 text-info" />
          <span>Possible growth spurt - increased feeding</span>
        </Badge>
      )}
      
      {regressionWindow && (
        <Badge variant="secondary" className="w-full justify-start gap-2 py-2 text-sm font-normal">
          <AlertCircle className="h-4 w-4 text-warning" />
          <span>Entering {regressionWindow} regression window</span>
        </Badge>
      )}
    </div>
  );
};
