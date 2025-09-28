import { Activity } from "./ActivityCard";
import { Clock, Baby, Moon, Palette, ChevronDown, ChevronUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { isDaytimeActivity, isNightActivity, getNaps, getNighttimeSleep, getDaytimeFeeds, getNightFeeds } from "@/utils/patternAnalysis";

interface NextActivityPredictionProps {
  activities: Activity[];
}

export const NextActivityPrediction = ({ activities }: NextActivityPredictionProps) => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  };

  const getTimeInMinutes = (timeString: string) => {
    const startTime = timeString.includes(' - ') ? timeString.split(' - ')[0] : timeString;
    const [time, period] = startTime.split(' ');
    const [hours, minutes] = time.split(':').map(Number);
    let totalMinutes = (hours % 12) * 60 + minutes;
    if (period === 'PM' && hours !== 12) totalMinutes += 12 * 60;
    if (period === 'AM' && hours === 12) totalMinutes = minutes;
    return totalMinutes;
  };

  const addMinutesToTime = (timeString: string, minutes: number) => {
    const timeInMinutes = getTimeInMinutes(timeString);
    let totalMinutes = timeInMinutes + minutes;
    
    while (totalMinutes < 0) {
      totalMinutes += (24 * 60);
    }
    totalMinutes = totalMinutes % (24 * 60);
    
    const hours = Math.floor(totalMinutes / 60);
    const mins = Math.round(totalMinutes % 60);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  };

  const predictNextActivity = () => {
    const currentTime = getCurrentTime();
    const currentMinutes = getTimeInMinutes(currentTime);
    
    // Group activities by type and time context
    const daytimeFeeds = getDaytimeFeeds(activities);
    const nightFeeds = getNightFeeds(activities);
    const naps = getNaps(activities);
    const nighttimeSleep = getNighttimeSleep(activities);
    
    const canPredictFeeds = daytimeFeeds.length >= 2 || nightFeeds.length >= 2;
    const canPredictNaps = naps.length >= 2 || nighttimeSleep.length >= 2;
    
    // Detect if baby is currently napping (check both naps and nighttime sleep)
    const allSleepActivities = [...naps, ...nighttimeSleep];
    const currentlyNapping = allSleepActivities.find(nap => {
      const noEnd = !nap.details.endTime || nap.details.endTime === "";
      return noEnd;
    });

    const totalFeeds = daytimeFeeds.length + nightFeeds.length;
    const totalNaps = naps.length + nighttimeSleep.length;
    
    if (totalFeeds === 0 && totalNaps === 0) {
      return null;
    }

    let nextFeedPrediction: any = null;
    let nextNapPrediction: any = null;

    // Context-aware feed prediction
    const isCurrentlyDaytime = isDaytimeActivity(currentTime);
    const relevantFeeds = isCurrentlyDaytime ? daytimeFeeds : nightFeeds;
    const feedContext = isCurrentlyDaytime ? "daytime" : "night";
    
    if (relevantFeeds.length >= 2 && canPredictFeeds) {
      const intervals: Array<{ interval: number; feed1: Activity; feed2: Activity }> = [];
      for (let i = 1; i < relevantFeeds.length; i++) {
        const current = getTimeInMinutes(relevantFeeds[i-1].time);
        const previous = getTimeInMinutes(relevantFeeds[i].time);
        let interval = current - previous;
        
        if (interval < 0) {
          interval += 24 * 60;
        }
        
        const minInterval = isCurrentlyDaytime ? 60 : 90;
        const maxInterval = isCurrentlyDaytime ? 300 : 480;
        
        if (interval >= minInterval && interval <= maxInterval) {
          intervals.push({
            interval,
            feed1: relevantFeeds[i],
            feed2: relevantFeeds[i-1]
          });
        }
      }
      
      if (intervals.length >= 1) {
        const avgInterval = intervals.reduce((sum, i) => sum + i.interval, 0) / intervals.length;
        const lastFeed = relevantFeeds[0];
        const timeSinceLastFeed = currentMinutes - getTimeInMinutes(lastFeed.time);
        
        if (timeSinceLastFeed < avgInterval && avgInterval - timeSinceLastFeed > 10) {
          const minutesUntilNextFeed = avgInterval - timeSinceLastFeed;
          const anticipatedTime = addMinutesToTime(currentTime, minutesUntilNextFeed);
          
          nextFeedPrediction = {
            type: "feed",
            anticipatedTime,
            confidence: intervals.length >= 4 ? 'high' as const : intervals.length >= 2 ? 'medium' as const : 'low' as const,
            reason: `${feedContext.charAt(0).toUpperCase() + feedContext.slice(1)} feeding interval pattern`,
            details: {
              description: `Based on ${intervals.length} recent ${feedContext} feeding intervals.`,
              data: intervals.map(({ interval, feed1, feed2 }) => ({
                activity: feed1,
                value: `${Math.round(interval / 60 * 10) / 10}h`,
                calculation: `Time between ${feed2.time} and ${feed1.time}`
              }))
            }
          };
        }
      }
    }

    // Context-aware nap prediction
    if (!currentlyNapping && isCurrentlyDaytime && naps.length >= 2) {
      const intervals: Array<{ interval: number; nap1: Activity; nap2: Activity }> = [];
      for (let i = 1; i < naps.length; i++) {
        const current = getTimeInMinutes(naps[i-1].time);
        const previous = getTimeInMinutes(naps[i].time);
        let interval = current - previous;
        
        if (interval < 0) {
          interval += 24 * 60;
        }
        
        if (interval >= 60 && interval <= 360) {
          intervals.push({
            interval,
            nap1: naps[i],
            nap2: naps[i-1]
          });
        }
      }
      
      if (intervals.length >= 1) {
        const avgInterval = intervals.reduce((sum, i) => sum + i.interval, 0) / intervals.length;
        const lastNap = naps[0];
        const timeSinceLastNap = currentMinutes - getTimeInMinutes(lastNap.time);
        
        if (timeSinceLastNap < avgInterval && avgInterval - timeSinceLastNap > 15) {
          const minutesUntilNextNap = avgInterval - timeSinceLastNap;
          const anticipatedTime = addMinutesToTime(currentTime, minutesUntilNextNap);
          
          if (isDaytimeActivity(anticipatedTime)) {
            nextNapPrediction = {
              type: "nap",
              anticipatedTime,
              confidence: intervals.length >= 3 ? 'high' as const : 'medium' as const,
              reason: "Daytime nap interval pattern",
              details: {
                description: `Based on ${intervals.length} recent nap intervals.`,
                data: intervals.map(({ interval, nap1, nap2 }) => ({
                  activity: nap1,
                  value: `${Math.round(interval / 60 * 10) / 10}h`,
                  calculation: `Time between ${nap2.time} and ${nap1.time}`
                }))
              }
            };
          }
        }
      }
    }

    // Nighttime sleep prediction
    if (!currentlyNapping && !isCurrentlyDaytime && nighttimeSleep.length >= 2) {
      const intervals: Array<{ interval: number; sleep1: Activity; sleep2: Activity }> = [];
      for (let i = 1; i < nighttimeSleep.length; i++) {
        const current = getTimeInMinutes(nighttimeSleep[i-1].time);
        const previous = getTimeInMinutes(nighttimeSleep[i].time);
        let interval = current - previous;
        
        if (interval < 0) {
          interval += 24 * 60;
        }
        
        if (interval >= 18 * 60 && interval <= 30 * 60) {
          intervals.push({
            interval,
            sleep1: nighttimeSleep[i],
            sleep2: nighttimeSleep[i-1]
          });
        }
      }
      
      if (intervals.length >= 1) {
        const avgInterval = intervals.reduce((sum, i) => sum + i.interval, 0) / intervals.length;
        const lastBedtime = nighttimeSleep[0];
        const timeSinceLastBedtime = currentMinutes - getTimeInMinutes(lastBedtime.time);
        
        if (timeSinceLastBedtime < avgInterval && avgInterval - timeSinceLastBedtime > 15) {
          const minutesUntilBedtime = avgInterval - timeSinceLastBedtime;
          const anticipatedTime = addMinutesToTime(currentTime, minutesUntilBedtime);
          
          nextNapPrediction = {
            type: "nap",
            anticipatedTime,
            confidence: intervals.length >= 3 ? 'high' as const : 'medium' as const,
            reason: "Bedtime routine pattern",
            details: {
              description: `Based on ${intervals.length} recent bedtime patterns.`,
              data: intervals.map(({ interval, sleep1, sleep2 }) => ({
                activity: sleep1,
                value: `${Math.round(interval / 60)}h`,
                calculation: `Time between ${sleep2.time} and ${sleep1.time}`
              }))
            }
          };
        }
      }
    }

    // Return the most relevant prediction
    if (nextFeedPrediction && nextNapPrediction) {
      const feedTime = getTimeInMinutes(nextFeedPrediction.anticipatedTime);
      const napTime = getTimeInMinutes(nextNapPrediction.anticipatedTime);
      const feedMinutes = Math.abs(feedTime - currentMinutes);
      const napMinutes = Math.abs(napTime - currentMinutes);
      
      return feedMinutes <= napMinutes ? nextFeedPrediction : nextNapPrediction;
    }
    
    return nextFeedPrediction || nextNapPrediction;
  };

  const prediction = predictNextActivity();

  if (!prediction) {
    return (
      <Card className="shadow-card border-border">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-xl font-sans font-semibold dark:font-bold">
            <Clock className="h-5 w-5 text-primary" />
            {t('nextActivity')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
            <p className="text-muted-foreground">
              Keep logging activities to get predictions for your baby's next activity.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Predictions appear after logging multiple activities of the same type.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getIcon = (type: string) => {
    switch (type) {
      case 'feed': return Baby;
      case 'nap': return Moon;
      default: return Palette;
    }
  };


  const IconComponent = getIcon(prediction.type);

  return (
    <Card className="shadow-card border-border">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-xl font-sans font-semibold dark:font-bold">
          <Clock className="h-5 w-5 text-primary" />
          {t('nextActivity')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <div className="rounded-lg p-4 bg-muted/50 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <IconComponent className="h-5 w-5 text-primary" />
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">
                    {prediction.type === 'feed' ? t('nextFeed') : t('nextNap')} at {prediction.anticipatedTime}
                  </h3>
                  <p className="text-sm text-muted-foreground">{prediction.reason}</p>
                </div>
              </div>
              <CollapsibleTrigger asChild>
                <button className="p-2 hover:bg-muted rounded-md transition-colors">
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>
              </CollapsibleTrigger>
            </div>
            
            <CollapsibleContent>
              <div className="mt-4 pt-4 border-t border-border">
                <p className="text-sm mb-4 text-muted-foreground">
                  {prediction.details.description}
                </p>
                
                {prediction.details.data && prediction.details.data.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Supporting Data
                    </h5>
                    <div className="space-y-1">
                      {prediction.details.data.slice(0, 3).map((dataPoint: any, dataIndex: number) => (
                        <div key={dataIndex} className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">
                            {dataPoint.calculation}
                          </span>
                          <span className="font-medium text-foreground">
                            {dataPoint.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      </CardContent>
    </Card>
  );
};