import { Activity } from "./ActivityCard";
import { TrendingUp, Share, ChevronLeft, ChevronRight } from "lucide-react";
import { normalizeVolume } from "@/utils/unitConversion";
import { useState, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { shareElement, getWeekCaption } from "@/utils/share/chartShare";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface TrendChartProps {
  activities: Activity[];
}

export const TrendChart = ({ activities = [] }: TrendChartProps) => {
  const { t, language } = useLanguage();
  const [selectedDetail, setSelectedDetail] = useState<string | null>(null);
  const [daysOffset, setDaysOffset] = useState(0); // 0 = today, 7 = 1 week back, etc.
  const feedChartRef = useRef<HTMLDivElement>(null);
  const napChartRef = useRef<HTMLDivElement>(null);
  
  const maxDaysBack = 30;
  const canGoBack = daysOffset < maxDaysBack - 7;
  const canGoForward = daysOffset > 0;

  // Determine preferred unit from last feed entry
  const getPreferredUnit = () => {
    if (!activities || activities.length === 0) return "oz";
    
    const feedActivities = activities.filter(a => a.type === "feed" && a.details?.quantity);
    if (feedActivities.length === 0) return "oz";
    
    const lastFeed = feedActivities[feedActivities.length - 1];
    const quantity = parseFloat(lastFeed.details.quantity || "0");
    
    // If quantity > 50, assume it's ml, otherwise oz
    return quantity > 50 ? "ml" : "oz";
  };

  const [feedUnit, setFeedUnit] = useState<"ml" | "oz">(getPreferredUnit());

  const onShare = async (ref: React.RefObject<HTMLDivElement>, title: string) => {
    if (!ref.current) return;
    try {
      await shareElement(ref.current, title, getWeekCaption(0));
    } catch (e) {
      console.error('Share failed', e);
    }
  };

  // Get the date range being viewed
  const getDateRange = () => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() - daysOffset);
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 6);
    
    return {
      start: startDate,
      end: endDate,
      label: daysOffset === 0 
        ? "Last 7 Days"
        : `${startDate.toLocaleDateString(language === 'zh' ? "zh-CN" : "en-US", { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString(language === 'zh' ? "zh-CN" : "en-US", { month: 'short', day: 'numeric' })}`
    };
  };

  // Calculate real feed volume data for the past 7 days
  const generateFeedData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i - daysOffset);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Filter activities for this specific date using loggedAt timestamp
      const dayFeeds = activities.filter(a => {
        if (a.type !== "feed" || !a.loggedAt) return false;
        const activityDate = new Date(a.loggedAt);
        // Compare dates by year, month, and day to avoid timezone issues
        return activityDate.getFullYear() === date.getFullYear() &&
               activityDate.getMonth() === date.getMonth() &&
               activityDate.getDate() === date.getDate();
      });
      
      let totalValue = 0;
      
      dayFeeds.forEach(feed => {
        if (!feed.details.quantity) return;
        const quantity = parseFloat(feed.details.quantity);
        const activityUnit = feed.details.unit || (quantity > 50 ? "ml" : "oz");
        
        if (feedUnit === "ml") {
          // Convert to ml if needed
          if (activityUnit === "oz") {
            totalValue += quantity * 29.5735; // Convert oz to ml
          } else {
            totalValue += quantity;
          }
        } else {
          // Convert to oz if needed  
          if (activityUnit === "ml") {
            totalValue += quantity / 29.5735; // Convert ml to oz
          } else {
            totalValue += quantity;
          }
        }
      });
      
      const value = Math.round(totalValue * 10) / 10;
      const feedCount = dayFeeds.length;
      const unit = feedUnit;
      
      data.push({
        date: date.toLocaleDateString(language === 'zh' ? "zh-CN" : "en-US", { weekday: "short" }),
        value,
        feedCount,
        unit,
        detail: value > 0 ? `${value} ${unit}, ${feedCount} ${t('feeds')}` : t('noFeeds')
      });
    }
    
    return data;
  };

  // Calculate real nap duration data for the past 7 days
  const generateNapData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i - daysOffset);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Filter activities for this specific date using loggedAt timestamp
      const dayNaps = activities.filter(a => {
        if (a.type !== "nap" || !a.loggedAt) return false;
        const activityDate = new Date(a.loggedAt);
        // Compare dates by year, month, and day to avoid timezone issues
        return activityDate.getFullYear() === date.getFullYear() &&
               activityDate.getMonth() === date.getMonth() &&
               activityDate.getDate() === date.getDate();
      });
      
      let totalHours = 0;
      dayNaps.forEach(nap => {
        if (nap.details.startTime && nap.details.endTime) {
          const start = new Date(`2000/01/01 ${nap.details.startTime}`);
          const end = new Date(`2000/01/01 ${nap.details.endTime}`);
          let diff = end.getTime() - start.getTime();
          
          // Handle overnight naps (end time is next day)
          if (diff < 0) {
            diff = diff + (24 * 60 * 60 * 1000); // Add 24 hours
          }
          
          if (diff > 0) totalHours += diff / (1000 * 60 * 60);
        }
      });
      
      const value = Math.round(totalHours * 10) / 10;
      const napCount = dayNaps.length;
      
      data.push({
        date: date.toLocaleDateString(language === 'zh' ? "zh-CN" : "en-US", { weekday: "short" }),
        value,
        napCount,
        detail: value > 0 ? `${value}h, ${napCount} ${t('naps')}` : t('noNaps')
      });
    }
    
    return data;
  };

  const feedData = generateFeedData();
  const napData = generateNapData();
  const dateRange = getDateRange();
  
  // Generate interpretive text based on patterns
  const getFeedInterpretation = () => {
    const nonZeroDays = feedData.filter(d => d.value > 0);
    if (nonZeroDays.length === 0) return "Still gathering data to understand patterns.";
    
    const values = nonZeroDays.map(d => d.value);
    const avg = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    
    // Low variance = consistent
    if (stdDev < avg * 0.15) {
      return "Steady feeding rhythm — confidence comes from consistency.";
    }
    // High variance = still finding balance
    if (stdDev > avg * 0.3) {
      return "Finding balance day to day — every rhythm is unique.";
    }
    // Moderate
    return "Natural variation — responding beautifully to needs.";
  };
  
  const getSleepInterpretation = () => {
    const nonZeroDays = napData.filter(d => d.value > 0);
    if (nonZeroDays.length === 0) return "Building sleep data to find patterns.";
    
    const values = nonZeroDays.map(d => d.value);
    const napCounts = nonZeroDays.map(d => d.napCount);
    const avgDuration = values.reduce((a, b) => a + b, 0) / values.length;
    const avgNapCount = napCounts.reduce((a, b) => a + b, 0) / napCounts.length;
    
    // Check if naps are getting longer (consolidating)
    const firstHalf = values.slice(0, Math.ceil(values.length / 2));
    const secondHalf = values.slice(Math.ceil(values.length / 2));
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    if (secondAvg > firstAvg * 1.2) {
      return "Longer naps midweek — body finding its groove.";
    }
    if (avgNapCount < 2.5) {
      return "Consolidating beautifully into fewer, longer stretches.";
    }
    if (avgDuration > 2.5) {
      return "Strong sleep patterns emerging — lovely consistency.";
    }
    return "Natural sleep rhythm developing day by day.";
  };

  const maxFeedValue = Math.max(1, ...feedData.map(d => d.value));
  const maxNapValue = Math.max(1, ...napData.map(d => d.value));

  return (
    <div className="space-y-6">
      {/* Date Navigation */}
      <div className="flex items-center justify-between px-2">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setDaysOffset(prev => Math.min(prev + 7, maxDaysBack - 7))}
          disabled={!canGoBack}
          className="h-8 gap-1"
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="text-sm">Earlier</span>
        </Button>
        
        <div className="text-sm font-medium text-muted-foreground">
          {dateRange.label}
        </div>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={() => setDaysOffset(prev => Math.max(prev - 7, 0))}
          disabled={!canGoForward}
          className="h-8 gap-1"
        >
          <span className="text-sm">Recent</span>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Daily Feed Totals */}
      <div ref={feedChartRef} className="bg-card/50 backdrop-blur rounded-xl p-6 shadow-card border border-border">
        <div className="space-y-1 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-sans font-medium text-foreground dark:font-bold">
                {t('dailyFeedTotals')}
              </h3>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onShare(feedChartRef, 'Daily Feed Totals')}>
              <Share className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[13px] text-muted-foreground pl-7">
            {getFeedInterpretation()}
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gradient-feed"></div>
              <span className="text-sm text-muted-foreground">{t('feedVolume')} ({feedUnit})</span>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="unit-toggle" className="text-xs text-muted-foreground">ml</Label>
              <Switch 
                id="unit-toggle"
                checked={feedUnit === "oz"}
                onCheckedChange={(checked) => setFeedUnit(checked ? "oz" : "ml")}
              />
              <Label htmlFor="unit-toggle" className="text-xs text-muted-foreground">oz</Label>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-2 h-32">
            {feedData.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-1">
                <div className="flex-1 flex flex-col justify-end w-full">
                  {day.value === 0 ? (
                    <div className="w-3/4 mx-auto h-1 bg-muted rounded opacity-30" />
                  ) : (
                    <button
                      className="bg-gradient-feed rounded-t opacity-80 w-3/4 mx-auto relative hover:opacity-100 transition-opacity cursor-pointer border-none p-0"
                      style={{ height: `${(day.value / maxFeedValue) * 100}%` }}
                      onClick={() => setSelectedDetail(selectedDetail === `feed-${index}` ? null : `feed-${index}`)}
                    >
                      <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground font-medium">
                        {day.value}
                      </span>
                    </button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {day.date}
                </div>
                 {selectedDetail === `feed-${index}` && (
                   <div className="fixed z-50 bg-popover border border-border rounded-lg p-2 shadow-lg pointer-events-none"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}>
                     <p className="text-xs font-medium">{day.detail}</p>
                   </div>
                 )}
              </div>
            ))}
          </div>
          
          {/* Missing data note */}
          {feedData.filter(d => d.value === 0).length > 0 && (
            <p className="text-xs text-muted-foreground italic mt-2">
              Missing data — skip day or travel?
            </p>
          )}
        </div>
      </div>

      {/* Daily Sleep Totals */}
      <div ref={napChartRef} className="bg-card/50 backdrop-blur rounded-xl p-6 shadow-card border border-border">
        <div className="space-y-1 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-muted-foreground" />
              <h3 className="text-lg font-sans font-medium text-foreground dark:font-bold">
                {t('dailySleepTotalsChart')}
              </h3>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onShare(napChartRef, 'Daily Sleep Totals')}>
              <Share className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-[13px] text-muted-foreground pl-7">
            {getSleepInterpretation()}
          </p>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gradient-nap"></div>
            <span className="text-sm text-muted-foreground">{t('sleepHours')}</span>
          </div>

          <div className="grid grid-cols-7 gap-2 h-32">
            {napData.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-1 relative">
                <div className="flex-1 flex flex-col justify-end w-full">
                  {day.value === 0 ? (
                    <div className="w-3/4 mx-auto h-1 bg-muted rounded opacity-30" />
                  ) : (
                    <button
                      className="bg-gradient-nap rounded-t opacity-80 w-3/4 mx-auto relative hover:opacity-100 transition-opacity cursor-pointer border-none p-0"
                      style={{ height: `${(day.value / maxNapValue) * 100}%` }}
                      onClick={() => setSelectedDetail(selectedDetail === `nap-${index}` ? null : `nap-${index}`)}
                    >
                      <span className="absolute -top-5 left-1/2 transform -translate-x-1/2 text-xs text-muted-foreground font-medium">
                        {day.value}h
                      </span>
                    </button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground font-medium">
                  {day.date}
                </div>
                 {selectedDetail === `nap-${index}` && (
                   <div className="fixed z-50 bg-popover border border-border rounded-lg p-2 shadow-lg pointer-events-none"
                        style={{
                          left: '50%',
                          top: '50%',
                          transform: 'translate(-50%, -50%)'
                        }}>
                     <p className="text-xs font-medium">{day.detail}</p>
                   </div>
                 )}
              </div>
            ))}
          </div>
          
          {/* Missing data note */}
          {napData.filter(d => d.value === 0).length > 0 && (
            <p className="text-xs text-muted-foreground italic mt-2">
              Missing data — skip day or travel?
            </p>
          )}
        </div>
      </div>
    </div>
  );
};