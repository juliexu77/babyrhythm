import { useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Moon } from "lucide-react";
import { useHousehold } from "@/hooks/useHousehold";

interface Activity {
  id: string;
  type: string;
  logged_at: string;
  details: any;
}

interface NightDoulaReviewProps {
  activities: Activity[];
  babyName?: string;
}

interface NapClassification {
  type: 'all-short' | 'all-long' | 'mix' | 'single-short' | 'single-long';
  description: string;
}

interface DayStats {
  feeds: number;
  volume: number;
  unit: string;
  naps: number;
  napDuration: number;
  bedtime: string | null;
  notes: Activity[];
  photos: string[];
}

// Age norms in months
const AGE_NORMS = {
  '0-2': { feeds: [8, 12], naps: [4, 6], napTime: [4, 6] },
  '3-4': { feeds: [6, 10], naps: [4, 5], napTime: [4, 5] },
  '5-6': { feeds: [5, 8], naps: [3, 4], napTime: [3, 4] },
  '7-9': { feeds: [4, 7], naps: [2, 3], napTime: [2.5, 3.5] },
  '10-12': { feeds: [3, 6], naps: [2, 3], napTime: [2, 3] },
  '12+': { feeds: [3, 5], naps: [1, 2], napTime: [1.5, 2.5] }
};

export const NightDoulaReview = ({ activities, babyName }: NightDoulaReviewProps) => {
  const { household } = useHousehold();
  const [showReview, setShowReview] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [reviewGenerated, setReviewGenerated] = useState(false);
  const [fullReviewText, setFullReviewText] = useState("");
  const [isPulsing, setIsPulsing] = useState(false);

  // Check if review was already shown today
  useEffect(() => {
    const today = new Date().toDateString();
    const reviewShown = localStorage.getItem(`night-doula-${today}`);
    if (reviewShown) {
      setShowReview(true);
      setTypedText(reviewShown);
      setReviewGenerated(true);
    }
  }, []);

  // Calculate baby's age in months
  const getBabyAgeInMonths = (): number => {
    if (!household?.baby_birthday) return 6; // Default to 6 months
    const birthDate = new Date(household.baby_birthday);
    const today = new Date();
    const months = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                   (today.getMonth() - birthDate.getMonth());
    return Math.max(0, months);
  };

  const getAgeNorms = (ageInMonths: number) => {
    if (ageInMonths <= 2) return AGE_NORMS['0-2'];
    if (ageInMonths <= 4) return AGE_NORMS['3-4'];
    if (ageInMonths <= 6) return AGE_NORMS['5-6'];
    if (ageInMonths <= 9) return AGE_NORMS['7-9'];
    if (ageInMonths <= 12) return AGE_NORMS['10-12'];
    return AGE_NORMS['12+'];
  };

  // Check trigger logic: after 7 PM with 30-45 min of no activity
  useEffect(() => {
    const checkTrigger = () => {
      const now = new Date();
      const hour = now.getHours();
      
      if (hour < 19) return; // Before 7 PM
      
      const hasActivitiesToday = activities.some(activity => {
        const activityDate = new Date(activity.logged_at);
        return activityDate.toDateString() === now.toDateString();
      });
      
      if (!hasActivitiesToday) return;
      
      // Check if bedtime was logged
      const todayActivities = activities.filter(activity => {
        const activityDate = new Date(activity.logged_at);
        return activityDate.toDateString() === now.toDateString();
      });
      
      const hasBedtime = todayActivities.some(a => 
        a.type === 'nap' && a.details?.isNightSleep
      );
      
      if (!hasBedtime) return;
      
      // Check for 30+ minutes of no activity
      const lastActivity = todayActivities
        .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime())[0];
      
      if (lastActivity) {
        const timeSinceLastActivity = now.getTime() - new Date(lastActivity.logged_at).getTime();
        const minutesSince = timeSinceLastActivity / (1000 * 60);
        
        if (minutesSince >= 30 && !reviewGenerated) {
          setShowPrompt(true);
        }
      }
    };

    checkTrigger();
    const interval = setInterval(checkTrigger, 60000);
    return () => clearInterval(interval);
  }, [activities, reviewGenerated]);

  // Classify naps by duration
  const classifyNaps = (napDurations: number[]): NapClassification => {
    if (napDurations.length === 0) {
      return { type: 'mix', description: 'no naps today' };
    }
    
    const shortNaps = napDurations.filter(d => d <= 40);
    const longNaps = napDurations.filter(d => d >= 60);
    
    if (napDurations.length === 1) {
      return {
        type: napDurations[0] <= 40 ? 'single-short' : 'single-long',
        description: napDurations[0] <= 40 ? 
          `one shorter nap around ${napDurations[0]} minutes` :
          `one solid stretch, just over ${Math.round(napDurations[0] / 60 * 10) / 10} hours`
      };
    }
    
    if (shortNaps.length === napDurations.length) {
      return {
        type: 'all-short',
        description: `all on the shorter side, around ${Math.round(napDurations.reduce((a, b) => a + b) / napDurations.length)} minutes each`
      };
    }
    
    if (longNaps.length === napDurations.length) {
      return {
        type: 'all-long',
        description: `${longNaps.length} solid stretches, each over an hour`
      };
    }
    
    return {
      type: 'mix',
      description: `a mix — ${shortNaps.length} short nap${shortNaps.length > 1 ? 's' : ''} and ${longNaps.length} long anchor nap${longNaps.length > 1 ? 's' : ''}`
    };
  };

  // Extract day stats
  const getDayStats = (date: Date): DayStats => {
    const activities_filtered = activities.filter(activity => {
      const activityDate = new Date(activity.logged_at);
      return activityDate.toDateString() === date.toDateString();
    });

    const feeds = activities_filtered.filter(a => a.type === 'feed');
    const naps = activities_filtered.filter(a => a.type === 'nap' && !a.details?.isNightSleep);
    const bedtimeNap = activities_filtered.find(a => a.type === 'nap' && a.details?.isNightSleep);
    const notes = activities_filtered.filter(a => a.type === 'note');

    const volume = feeds.reduce((sum, f) => {
      const qty = f.details?.quantity || 0;
      return sum + (parseFloat(qty as string) || 0);
    }, 0);

    const unit = feeds.find(f => f.details?.unit)?.details?.unit || 'ml';

    const napDuration = naps.reduce((sum, n) => {
      if (n.details?.startTime && n.details?.endTime) {
        const start = new Date(`1970-01-01 ${n.details.startTime}`);
        const end = new Date(`1970-01-01 ${n.details.endTime}`);
        return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60));
      }
      return sum;
    }, 0);

    const bedtime = bedtimeNap?.details?.startTime || null;

    const photos = notes.flatMap(n => n.details?.photos || []);

    return {
      feeds: feeds.length,
      volume,
      unit,
      naps: naps.length,
      napDuration,
      bedtime,
      notes,
      photos
    };
  };

  // Generate the night doula message
  const generateNightDoulaMessage = (): string => {
    const name = babyName || household?.baby_name || "your little one";
    const today = new Date();
    const yesterday = new Date(Date.now() - 86400000);
    
    const todayStats = getDayStats(today);
    const yesterdayStats = getDayStats(yesterday);
    
    const ageInMonths = getBabyAgeInMonths();
    const norms = getAgeNorms(ageInMonths);
    
    let message = "";
    
    // 1. Daily Recap
    message += `${name} had ${todayStats.feeds} feed${todayStats.feeds !== 1 ? 's' : ''} today`;
    if (todayStats.volume > 0) {
      message += ` (about ${Math.round(todayStats.volume)} ${todayStats.unit})`;
    }
    message += ". ";
    
    if (todayStats.naps > 0) {
      const napDurations = activities
        .filter(a => a.type === 'nap' && !a.details?.isNightSleep && 
                new Date(a.logged_at).toDateString() === today.toDateString())
        .map(n => {
          if (n.details?.startTime && n.details?.endTime) {
            const start = new Date(`1970-01-01 ${n.details.startTime}`);
            const end = new Date(`1970-01-01 ${n.details.endTime}`);
            return Math.round((end.getTime() - start.getTime()) / (1000 * 60));
          }
          return 0;
        })
        .filter(d => d > 0);
      
      const classification = classifyNaps(napDurations);
      message += `${name}'s naps were ${classification.description}. `;
    }
    
    if (todayStats.bedtime) {
      message += `Bedtime was ${todayStats.bedtime}. `;
    }
    
    // 2. Note Reference
    if (todayStats.notes.length > 0) {
      const noteContent = todayStats.notes[0].details?.content || "";
      if (noteContent.toLowerCase().includes('teeth') || noteContent.toLowerCase().includes('fuss')) {
        message += `You mentioned some fussiness today — that could explain any shorter naps or extra feeds. `;
      } else if (noteContent.length > 0) {
        message += `You noted "${noteContent.slice(0, 30)}${noteContent.length > 30 ? '...' : ''}" — these observations help track ${name}'s patterns. `;
      }
    }
    
    // 3. Comparison to Yesterday
    if (yesterdayStats.feeds > 0 || yesterdayStats.volume > 0) {
      const volumeDiff = todayStats.volume - yesterdayStats.volume;
      const feedDiff = todayStats.feeds - yesterdayStats.feeds;
      
      if (Math.abs(volumeDiff) > todayStats.volume * 0.1 || Math.abs(feedDiff) > 0) {
        message += `Compared to yesterday, `;
        if (volumeDiff > todayStats.volume * 0.1) {
          message += `${name} drank about ${Math.round(Math.abs(volumeDiff))} ${todayStats.unit} ${volumeDiff > 0 ? 'more' : 'less'}`;
        }
        if (feedDiff !== 0 && Math.abs(volumeDiff) > todayStats.volume * 0.1) {
          message += ` and had ${Math.abs(feedDiff)} ${feedDiff > 0 ? 'extra' : 'fewer'} feed${Math.abs(feedDiff) > 1 ? 's' : ''}`;
        } else if (feedDiff !== 0) {
          message += `${name} had ${Math.abs(feedDiff)} ${feedDiff > 0 ? 'extra' : 'fewer'} feed${Math.abs(feedDiff) > 1 ? 's' : ''}`;
        }
        
        if (volumeDiff > todayStats.volume * 0.15 || feedDiff > 1) {
          message += `, which often points to a growth spurt. `;
        } else {
          message += `. `;
        }
      }
    }
    
    // 4. Age Norm Comparison
    const feedsInRange = todayStats.feeds >= norms.feeds[0] && todayStats.feeds <= norms.feeds[1];
    const napsInRange = todayStats.naps >= norms.naps[0] && todayStats.naps <= norms.naps[1];
    
    if (feedsInRange && napsInRange) {
      message += `For ${name}'s age, most babies feed ${norms.feeds[0]}–${norms.feeds[1]} times daily and nap ${norms.naps[0]}–${norms.naps[1]} times, so this pattern is right on track. `;
    } else if (feedsInRange) {
      message += `For ${name}'s age, most babies feed ${norms.feeds[0]}–${norms.feeds[1]} times daily — ${name}'s ${todayStats.feeds} feeds are right in range. `;
    } else {
      message += `Most babies ${name}'s age typically have ${norms.feeds[0]}–${norms.feeds[1]} feeds and ${norms.naps[0]}–${norms.naps[1]} naps daily. `;
    }
    
    // 5. Expert Insight
    if (todayStats.volume > yesterdayStats.volume * 1.15) {
      message += `That extra intake is a great sign ${name}'s fueling up for growth. `;
    } else if (todayStats.bedtime && todayStats.naps > 0) {
      message += `The combination of good naps and an earlier bedtime often means better overnight sleep. `;
    } else {
      message += `${name}'s rhythm is developing beautifully. `;
    }
    
    // 6. Encouragement/Close
    if (todayStats.napDuration < yesterdayStats.napDuration * 0.8) {
      message += `Tomorrow ${name} may want that first nap a bit earlier if they're catching up. `;
    }
    
    message += `You're doing a wonderful job keeping ${name}'s rhythm steady.`;
    
    return message;
  };

  // ChatGPT-style streaming effect
  const startReview = useCallback(() => {
    const reviewText = generateNightDoulaMessage();
    setFullReviewText(reviewText);
    setShowReview(true);
    setShowPrompt(false);
    setIsTyping(true);
    setIsPulsing(true);
    setTypedText("");
    setCurrentCharIndex(0);
    
    // Store in localStorage
    const today = new Date().toDateString();
    localStorage.setItem(`night-doula-${today}`, reviewText);
    
    setReviewGenerated(true);
  }, [activities, babyName, household]);

  // Streaming animation effect
  useEffect(() => {
    if (!isTyping || !fullReviewText) return;
    
    const targetWPM = 50; // 45-55 words per minute
    const avgCharsPerWord = 4.7;
    const charsPerMinute = targetWPM * avgCharsPerWord;
    const msPerChar = (60 * 1000) / charsPerMinute;
    
    const timer = setTimeout(() => {
      if (currentCharIndex < fullReviewText.length) {
        // Add slight jitter (3-6 chars per tick)
        const jitter = Math.floor(Math.random() * 4) + 3;
        const nextIndex = Math.min(currentCharIndex + jitter, fullReviewText.length);
        setTypedText(fullReviewText.substring(0, nextIndex));
        setCurrentCharIndex(nextIndex);
      } else {
        setIsTyping(false);
        setIsPulsing(false);
      }
    }, msPerChar * (Math.floor(Math.random() * 4) + 3)); // Jitter timing too
    
    return () => clearTimeout(timer);
  }, [currentCharIndex, fullReviewText, isTyping]);

  // Don't show if no trigger conditions met
  if (!showPrompt && !showReview) {
    return null;
  }

  // Show prompt
  if (showPrompt && !showReview) {
    return (
      <Card className="mb-6 bg-card border-border shadow-card">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="relative">
                <Moon className="w-5 h-5 text-primary" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm font-medium text-foreground">
                Ready to hear how today went?
              </span>
            </div>
            <Button 
              onClick={startReview}
              size="sm"
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Yes please
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show review with streaming
  return (
    <Card className="mb-6 bg-card border-border shadow-card">
      <CardContent className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <Moon className="w-6 h-6 text-primary" />
            {isPulsing && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            )}
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            Night Doula
          </h3>
        </div>
        
        <div className="prose prose-sm max-w-none">
          <div className="text-foreground leading-relaxed text-base">
            {typedText}
            {isTyping && (
              <span className="inline-block w-0.5 h-5 bg-primary ml-1 animate-pulse"></span>
            )}
          </div>
          
          {/* Photos appear after text is complete */}
          {!isTyping && getDayStats(new Date()).photos.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {getDayStats(new Date()).photos.map((photo, index) => (
                <img 
                  key={index}
                  src={photo} 
                  alt="Baby photo from today" 
                  className="w-20 h-20 object-cover rounded-lg border border-border"
                />
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};