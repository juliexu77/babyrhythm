import { Activity } from "./ActivityCard";
import { useHousehold } from "@/hooks/useHousehold";

interface WeeklyReflectionProps {
  activities: Activity[];
}

export const WeeklyReflection = ({ activities }: WeeklyReflectionProps) => {
  const { household } = useHousehold();
  const babyName = household?.baby_name?.split(' ')[0] || 'Baby';
  
  // Analyze patterns for the week
  const generateReflection = () => {
    const last7Days = new Date();
    last7Days.setDate(last7Days.getDate() - 7);
    
    const weekActivities = activities.filter(a => 
      a.loggedAt && new Date(a.loggedAt) >= last7Days
    );
    
    if (weekActivities.length < 5) {
      return `We're just beginning to understand ${babyName}'s rhythm. Each logged moment helps us see patterns more clearly. Keep going — you're building something beautiful. 💛`;
    }
    
    // Analyze feeds
    const feeds = weekActivities.filter(a => a.type === 'feed');
    const feedsByDay: { [key: string]: number } = {};
    feeds.forEach(f => {
      if (!f.loggedAt) return;
      const day = new Date(f.loggedAt).toDateString();
      feedsByDay[day] = (feedsByDay[day] || 0) + 1;
    });
    const feedCounts = Object.values(feedsByDay);
    const avgFeeds = feedCounts.length > 0 ? feedCounts.reduce((a, b) => a + b, 0) / feedCounts.length : 0;
    const feedVariance = feedCounts.length > 1 ? 
      feedCounts.reduce((sum, count) => sum + Math.pow(count - avgFeeds, 2), 0) / feedCounts.length : 0;
    
    // Analyze naps
    const naps = weekActivities.filter(a => a.type === 'nap' && a.details.startTime && a.details.endTime);
    const napDurations: number[] = [];
    naps.forEach(nap => {
      const start = new Date(`2000/01/01 ${nap.details.startTime}`);
      const end = new Date(`2000/01/01 ${nap.details.endTime}`);
      let diff = end.getTime() - start.getTime();
      if (diff < 0) diff += (24 * 60 * 60 * 1000);
      if (diff > 0) napDurations.push(diff / (1000 * 60 * 60));
    });
    
    const avgNapDuration = napDurations.length > 0 ? 
      napDurations.reduce((a, b) => a + b, 0) / napDurations.length : 0;
    
    // Generate reflection based on patterns
    let reflection = `${babyName}'s rhythm is `;
    
    // Assess overall stability
    if (feedVariance < 2 && avgNapDuration > 1.5) {
      reflection += "evening out beautifully — ";
      
      if (napDurations.length >= 14) {
        reflection += "naps are shorter but more regular, ";
      } else {
        reflection += "you've found a lovely consistency, ";
      }
      
      if (feedVariance < 1) {
        reflection += "and you've kept a steady feeding cadence. ";
      } else {
        reflection += "and feeding patterns are settling in. ";
      }
      
      reflection += "That balance helps both of you feel calmer heading into next week. 💛";
    } else if (feedVariance > 3 || avgNapDuration < 1) {
      reflection += "still finding its shape — ";
      
      if (avgNapDuration < 1) {
        reflection += "naps are brief right now, which is common during leaps or transitions. ";
      }
      
      if (feedVariance > 3) {
        reflection += "Feeding needs vary day to day, and that's perfectly normal. ";
      }
      
      reflection += "Trust the process — every day adds to the picture. 🌿";
    } else {
      reflection += "flowing naturally — ";
      
      if (avgNapDuration > 1.5) {
        reflection += "sleep is consolidating beautifully, ";
      } else {
        reflection += "you're responding thoughtfully to needs, ";
      }
      
      reflection += "and the rhythm you're building together is uniquely yours. Keep trusting your instincts. ✨";
    }
    
    return reflection;
  };
  
  return (
    <div className="bg-gradient-to-br from-primary/5 to-primary/10 rounded-xl p-6 border border-primary/20">
      <h3 className="text-base font-medium text-foreground mb-3">Weekly Reflection</h3>
      <p className="text-sm text-foreground/90 leading-relaxed">
        {generateReflection()}
      </p>
    </div>
  );
};