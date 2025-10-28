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
  const [daysOffset, setDaysOffset] = useState(0);
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
    
    const formatOptions: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
    const startStr = startDate.toLocaleDateString(language === 'zh' ? "zh-CN" : "en-US", formatOptions);
    const endStr = endDate.toLocaleDateString(language === 'zh' ? "zh-CN" : "en-US", formatOptions);
    
    return {
      start: startDate,
      end: endDate,
      label: `${startStr}–${endStr}`
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
  
  // Calculate previous week data for comparison
  const generatePreviousWeekFeedData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i - daysOffset - 7); // Previous week
      
      const dayFeeds = activities.filter(a => {
        if (a.type !== "feed" || !a.loggedAt) return false;
        const activityDate = new Date(a.loggedAt);
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
          if (activityUnit === "oz") {
            totalValue += quantity * 29.5735;
          } else {
            totalValue += quantity;
          }
        } else {
          if (activityUnit === "ml") {
            totalValue += quantity / 29.5735;
          } else {
            totalValue += quantity;
          }
        }
      });
      
      data.push({
        value: Math.round(totalValue * 10) / 10,
        feedCount: dayFeeds.length
      });
    }
    
    return data;
  };
  
  const generatePreviousWeekNapData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i - daysOffset - 7); // Previous week
      
      const dayNaps = activities.filter(a => {
        if (a.type !== "nap" || !a.loggedAt) return false;
        const activityDate = new Date(a.loggedAt);
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
          if (diff < 0) {
            diff = diff + (24 * 60 * 60 * 1000);
          }
          if (diff > 0) totalHours += diff / (1000 * 60 * 60);
        }
      });
      
      data.push({
        value: Math.round(totalHours * 10) / 10,
        napCount: dayNaps.length
      });
    }
    
    return data;
  };
  
  const prevWeekFeedData = generatePreviousWeekFeedData();
  const prevWeekNapData = generatePreviousWeekNapData();
  
  // Calculate summary metrics
  const feedSummary = {
    avgVolume: feedData.reduce((sum, d) => sum + d.value, 0) / feedData.filter(d => d.value > 0).length || 0,
    totalFeeds: feedData.reduce((sum, d) => sum + d.feedCount, 0),
    avgFeedsPerDay: feedData.reduce((sum, d) => sum + d.feedCount, 0) / feedData.filter(d => d.feedCount > 0).length || 0,
  };
  
  const prevFeedSummary = {
    avgVolume: prevWeekFeedData.reduce((sum, d) => sum + d.value, 0) / prevWeekFeedData.filter(d => d.value > 0).length || 0,
    avgFeedsPerDay: prevWeekFeedData.reduce((sum, d) => sum + d.feedCount, 0) / prevWeekFeedData.filter(d => d.feedCount > 0).length || 0,
  };
  
  const napSummary = {
    avgDuration: napData.reduce((sum, d) => sum + d.value, 0) / napData.filter(d => d.value > 0).length || 0,
    totalNaps: napData.reduce((sum, d) => sum + d.napCount, 0),
    avgNapsPerDay: napData.reduce((sum, d) => sum + d.napCount, 0) / napData.filter(d => d.napCount > 0).length || 0,
  };
  
  const prevNapSummary = {
    avgDuration: prevWeekNapData.reduce((sum, d) => sum + d.value, 0) / prevWeekNapData.filter(d => d.value > 0).length || 0,
  };
  
  // Calculate percentage changes
  const feedVolumeChange = prevFeedSummary.avgVolume > 0 
    ? ((feedSummary.avgVolume - prevFeedSummary.avgVolume) / prevFeedSummary.avgVolume * 100)
    : 0;
  
  const feedCountChange = prevFeedSummary.avgFeedsPerDay > 0
    ? (feedSummary.avgFeedsPerDay - prevFeedSummary.avgFeedsPerDay)
    : 0;
    
  const napDurationChange = prevNapSummary.avgDuration > 0
    ? ((napSummary.avgDuration - prevNapSummary.avgDuration) / prevNapSummary.avgDuration * 100)
    : 0;
  
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
  const avgFeedLine = (feedSummary.avgVolume / maxFeedValue) * 100;

  return (
    <div className="space-y-6">
      {/* Context Bar - Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border/50 -mx-4 px-4 py-3 mb-6">
        <div className="flex items-center justify-between max-w-3xl mx-auto">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDaysOffset(prev => Math.min(prev + 7, maxDaysBack - 7))}
            disabled={!canGoBack}
            className="h-9 gap-1.5 transition-all hover-scale"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">
              {daysOffset === 0 ? 'This Week' : 'Week of'}
            </span>
            <span className="text-sm text-muted-foreground">
              · {dateRange.label}
            </span>
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setDaysOffset(prev => Math.max(prev - 7, 0))}
            disabled={!canGoForward}
            className="h-9 gap-1.5 transition-all hover-scale"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Feeding Trends Section */}
      <div className="space-y-6">
        {/* Section Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-6 bg-gradient-feed rounded-full"></div>
          <h2 className="text-sm font-medium text-foreground uppercase tracking-wider">Feeding Trends</h2>
        </div>

        {/* Level 1: Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Average Volume Card */}
          <div className="bg-card/30 backdrop-blur rounded-2xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-feed/10 flex items-center justify-center">
                <span className="text-xl">🍼</span>
              </div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Average Volume</h3>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-semibold text-foreground tracking-tight">
                {Math.round(feedSummary.avgVolume)} <span className="text-lg text-muted-foreground font-normal">{feedUnit}/day</span>
              </div>
              {prevFeedSummary.avgVolume > 0 && (
                <p className="text-xs text-muted-foreground">
                  {feedVolumeChange >= 0 ? '+' : ''}{feedVolumeChange.toFixed(1)}% vs last week
                </p>
              )}
            </div>
          </div>

          {/* Feed Count Card */}
          <div className="bg-card/30 backdrop-blur rounded-2xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-feed/10 flex items-center justify-center">
                <span className="text-xl">🌙</span>
              </div>
              <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Feed Count</h3>
            </div>
            <div className="space-y-1">
              <div className="text-3xl font-semibold text-foreground tracking-tight">
                {Math.round(feedSummary.avgFeedsPerDay)} <span className="text-lg text-muted-foreground font-normal">/day</span>
              </div>
              {prevFeedSummary.avgFeedsPerDay > 0 && (
                <p className="text-xs text-muted-foreground">
                  {feedCountChange >= 0 ? '+' : ''}{feedCountChange.toFixed(1)} vs last week
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Level 2: Volume Chart */}
        <div ref={feedChartRef} className="bg-card/30 backdrop-blur rounded-2xl p-6 border border-border/50 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <h3 className="text-sm font-medium text-foreground">
                Volume ({feedUnit})
              </h3>
              <div className="flex items-center gap-2 bg-muted/20 px-2.5 py-1 rounded-full">
                <Label htmlFor="unit-toggle" className="text-xs text-muted-foreground cursor-pointer">ml</Label>
                <Switch 
                  id="unit-toggle"
                  checked={feedUnit === "oz"}
                  onCheckedChange={(checked) => setFeedUnit(checked ? "oz" : "ml")}
                  className="scale-75"
                />
                <Label htmlFor="unit-toggle" className="text-xs text-muted-foreground cursor-pointer">oz</Label>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover-scale" onClick={() => onShare(feedChartRef, 'Feeding Trends')}>
              <Share className="h-3.5 w-3.5" />
            </Button>
          </div>
        
          <div className="relative">
            {/* Average line */}
            {feedSummary.avgVolume > 0 && (
              <div 
                className="absolute left-0 right-0 border-t-2 border-dashed border-muted-foreground/30 z-10"
                style={{ bottom: `${avgFeedLine}%` }}
              >
                <span className="absolute -left-1 -top-3 text-xs text-muted-foreground/60 font-medium">Avg</span>
              </div>
            )}
            
            <div className="grid grid-cols-7 gap-3 h-44">
              {feedData.map((day, index) => (
                <div key={index} className="flex flex-col items-center gap-2.5">
                  <div className="flex-1 flex flex-col justify-end w-full relative">
                    {day.value === 0 ? (
                      <div className="w-full h-1 bg-muted/20 rounded-full" />
                    ) : (
                      <button
                        className="bg-gradient-feed rounded-xl w-full relative hover:opacity-90 transition-all cursor-pointer border-none p-0 animate-scale-in group"
                        style={{ height: `${(day.value / maxFeedValue) * 100}%`, minHeight: '40px' }}
                        onClick={() => setSelectedDetail(selectedDetail === `feed-${index}` ? null : `feed-${index}`)}
                      >
                        <span className="absolute inset-x-0 top-2 text-[10px] text-white/95 font-medium">
                          {day.value}
                        </span>
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground/70 font-medium">
                    {day.date}
                  </div>
                  {selectedDetail === `feed-${index}` && (
                    <div className="fixed z-50 bg-popover border border-border rounded-xl p-3 shadow-lg pointer-events-none"
                         style={{
                           left: '50%',
                           top: '50%',
                           transform: 'translate(-50%, -50%)'
                         }}>
                      <p className="text-sm font-medium">{day.detail}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Sleep Trends Section */}
      <div className="space-y-6 mt-8">
        {/* Section Header */}
        <div className="flex items-center gap-2.5">
          <div className="w-1 h-6 bg-gradient-nap rounded-full"></div>
          <h2 className="text-sm font-medium text-foreground uppercase tracking-wider">Sleep Trends</h2>
        </div>

        {/* Level 1: Summary Card */}
        <div className="bg-card/30 backdrop-blur rounded-2xl p-6 border border-border/50">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-nap/10 flex items-center justify-center">
                  <span className="text-xl">🌙</span>
                </div>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Average Duration</h3>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-semibold text-foreground tracking-tight">
                  {napSummary.avgDuration.toFixed(1)} <span className="text-lg text-muted-foreground font-normal">h/day</span>
                </div>
                {prevNapSummary.avgDuration > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {napDurationChange >= 0 ? '+' : ''}{napDurationChange.toFixed(1)} h vs last week
                  </p>
                )}
              </div>
            </div>
            {napData.length > 0 && napData.some(d => d.value > 0) && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground/60 mb-1">Typical window</p>
                <p className="text-sm font-medium text-foreground">8:00 pm–7:00 am</p>
              </div>
            )}
          </div>
        </div>

        {/* Level 2: Duration Chart */}
        <div ref={napChartRef} className="bg-card/30 backdrop-blur rounded-2xl p-6 border border-border/50 transition-all hover:shadow-lg">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-sm font-medium text-foreground">
              Duration (hours)
            </h3>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover-scale" onClick={() => onShare(napChartRef, 'Sleep Trends')}>
              <Share className="h-3.5 w-3.5" />
            </Button>
          </div>
        
          <div className="grid grid-cols-7 gap-3 h-44">
            {napData.map((day, index) => (
              <div key={index} className="flex flex-col items-center gap-2.5 relative">
                <div className="flex-1 flex flex-col justify-end w-full">
                  {day.value === 0 ? (
                    <div className="w-full h-1 bg-muted/20 rounded-full" />
                  ) : (
                    <button
                      className="bg-gradient-nap rounded-xl w-full relative hover:opacity-90 transition-all cursor-pointer border-none p-0 animate-scale-in group"
                      style={{ height: `${(day.value / maxNapValue) * 100}%`, minHeight: '40px' }}
                      onClick={() => setSelectedDetail(selectedDetail === `nap-${index}` ? null : `nap-${index}`)}
                    >
                      <span className="absolute inset-x-0 top-2 text-[10px] text-white/95 font-medium">
                        {day.value}h
                      </span>
                    </button>
                  )}
                </div>
                <div className="text-xs text-muted-foreground/70 font-medium">
                  {day.date}
                </div>
                {selectedDetail === `nap-${index}` && (
                  <div className="fixed z-50 bg-popover border border-border rounded-xl p-3 shadow-lg pointer-events-none"
                       style={{
                         left: '50%',
                         top: '50%',
                         transform: 'translate(-50%, -50%)'
                       }}>
                    <p className="text-sm font-medium">{day.detail}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};