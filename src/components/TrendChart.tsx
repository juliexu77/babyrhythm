import { Activity } from "./ActivityCard";
import { TrendingUp, TrendingDown, Share, ChevronLeft, ChevronRight, Milk, Moon, Activity as ActivityIcon } from "lucide-react";
import { normalizeVolume } from "@/utils/unitConversion";
import { toZonedTime } from "date-fns-tz";
import { useState, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { shareElement, getWeekCaption } from "@/utils/share/chartShare";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { getActivitiesByDate } from "@/utils/activityDateFilters";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { isDaytimeNap } from "@/utils/napClassification";
import { calculateNapStatistics } from "@/utils/napStatistics";
import { useHousehold } from "@/hooks/useHousehold";
import { CollectivePulse } from "@/components/home/CollectivePulse";

interface TrendChartProps {
  activities: Activity[];
}

export const TrendChart = ({ activities = [] }: TrendChartProps) => {
  const { t, language } = useLanguage();
  const { nightSleepStartHour, nightSleepEndHour } = useNightSleepWindow();
  const { household } = useHousehold();
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

  // Calculate real feed volume data for the past 7 days (including today)
  const generateFeedData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    // Start from today (i = 0) to include current day
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i - daysOffset);
      
      // Use shared date filtering utility (same as Log tab)
      const dayActivities = getActivitiesByDate(activities, date);
      const dayFeeds = dayActivities.filter(a => a.type === "feed");
      
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

  // Helper function to calculate nap duration from UTC timestamps
  const calculateNapDuration = (nap: Activity): number => {
    if (!nap.loggedAt) return 0;
    
    // Get the start time from logged_at (UTC)
    const startUtc = new Date(nap.loggedAt);
    
    // If there's an endTime in details, we need to parse it relative to the start time
    if (nap.details.endTime && nap.details.startTime) {
      const timezone = nap.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Convert start UTC to local time in the activity's timezone (for the correct date)
      const baseLocal = toZonedTime(startUtc, timezone);
      
      // Parse start time string (e.g., "7:15 PM")
      const startMatch = nap.details.startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      const endMatch = nap.details.endTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!startMatch || !endMatch) return 0;
      
      let startHours = parseInt(startMatch[1], 10);
      const startMinutes = parseInt(startMatch[2], 10);
      const startPeriod = startMatch[3].toUpperCase();
      
      let endHours = parseInt(endMatch[1], 10);
      const endMinutes = parseInt(endMatch[2], 10);
      const endPeriod = endMatch[3].toUpperCase();
      
      if (startPeriod === 'PM' && startHours !== 12) startHours += 12;
      if (startPeriod === 'AM' && startHours === 12) startHours = 0;
      if (endPeriod === 'PM' && endHours !== 12) endHours += 12;
      if (endPeriod === 'AM' && endHours === 12) endHours = 0;
      
      // Build start and end local Date objects on the same base date
      const startLocal = new Date(baseLocal);
      startLocal.setHours(startHours, startMinutes, 0, 0);
      const endLocal = new Date(baseLocal);
      endLocal.setHours(endHours, endMinutes, 0, 0);
      
      // Handle overnight sleep (end time on the next day)
      if (endLocal < startLocal) {
        endLocal.setDate(endLocal.getDate() + 1);
      }
      
      const diffMs = endLocal.getTime() - startLocal.getTime();
      
      // Validate duration is reasonable (max 24 hours)
      if (diffMs > 0 && diffMs <= 24 * 60 * 60 * 1000) {
        return diffMs / (1000 * 60 * 60); // Convert to hours
      }
    }
    
    return 0;
  };

  // Calculate real nap duration data for the past 7 days (including today)
  const generateNapData = () => {
    const days = 7;
    const data = [];
    const today = new Date();
    
    // Start from today (i = 0) to include current day
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i - daysOffset);
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format
      
      // Use shared date filtering utility (same as Log tab)
      const dayActivities = getActivitiesByDate(activities, date);
      const dayNaps = dayActivities.filter(a => a.type === "nap");
      
      // Use shared utility to check if nap is daytime
      // This ensures consistency with CollectivePulse and other components
      // Uses user's configured night sleep hours from settings
      const daytimeNaps = dayNaps.filter(nap => isDaytimeNap(nap, nightSleepStartHour, nightSleepEndHour));
      
      let totalHours = 0;
      dayNaps.forEach(nap => {
        const duration = calculateNapDuration(nap);
        if (duration > 0) {
          console.log(`[TrendChart] ${dateStr}: Nap from ${nap.details.startTime} to ${nap.details.endTime} = ${duration.toFixed(2)}h`);
          totalHours += duration;
        }
      });
      
      if (totalHours > 24) {
        console.warn(`[TrendChart] ${dateStr}: Total sleep exceeds 24h (${totalHours.toFixed(2)}h) - ${dayNaps.length} naps found`);
        console.log('[TrendChart] Naps:', dayNaps.map(n => ({
          id: n.id,
          loggedAt: n.loggedAt,
          start: n.details.startTime,
          end: n.details.endTime,
          timezone: n.timezone
        })));
      }
      
      const value = Math.round(totalHours * 10) / 10;
      const napCount = dayNaps.length;
      const daytimeNapCount = daytimeNaps.length;
      
      data.push({
        date: date.toLocaleDateString(language === 'zh' ? "zh-CN" : "en-US", { weekday: "short" }),
        value,
        napCount,
        daytimeNapCount,
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
      
      // Use shared date filtering utility
      const dayActivities = getActivitiesByDate(activities, date);
      const dayFeeds = dayActivities.filter(a => a.type === "feed");
      
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
      
      // Use shared date filtering utility
      const dayActivities = getActivitiesByDate(activities, date);
      const dayNaps = dayActivities.filter(a => a.type === "nap");
      
      let totalHours = 0;
      dayNaps.forEach(nap => {
        const duration = calculateNapDuration(nap);
        if (duration > 0) {
          totalHours += duration;
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
  
  // For summary calculations, exclude today (last item) when viewing current week
  const feedDataForSummary = daysOffset === 0 ? feedData.slice(0, -1) : feedData;
  const napDataForSummary = daysOffset === 0 ? napData.slice(0, -1) : napData;
  
  // Calculate summary metrics (excluding today if viewing current week)
  const feedSummary = {
    avgVolume: feedDataForSummary.reduce((sum, d) => sum + d.value, 0) / feedDataForSummary.filter(d => d.value > 0).length || 0,
    totalFeeds: feedDataForSummary.reduce((sum, d) => sum + d.feedCount, 0),
    avgFeedsPerDay: feedDataForSummary.reduce((sum, d) => sum + d.feedCount, 0) / feedDataForSummary.filter(d => d.feedCount > 0).length || 0,
  };
  
  const prevFeedSummary = {
    avgVolume: prevWeekFeedData.reduce((sum, d) => sum + d.value, 0) / prevWeekFeedData.filter(d => d.value > 0).length || 0,
    avgFeedsPerDay: prevWeekFeedData.reduce((sum, d) => sum + d.feedCount, 0) / prevWeekFeedData.filter(d => d.feedCount > 0).length || 0,
  };
  
  
  // Get date range for current and previous week
  const today = new Date();
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(currentWeekStart.getDate() - 6 - daysOffset);
  const currentWeekEnd = new Date(today);
  currentWeekEnd.setDate(currentWeekEnd.getDate() - daysOffset);
  
  const prevWeekStart = new Date(currentWeekStart);
  prevWeekStart.setDate(prevWeekStart.getDate() - 7);
  const prevWeekEnd = new Date(currentWeekStart);
  
  // Get activities for current and previous week
  const currentWeekActivities = activities.filter(a => {
    const activityDate = new Date(a.loggedAt || '');
    return activityDate >= currentWeekStart && activityDate <= currentWeekEnd;
  });
  
  const prevWeekActivities = activities.filter(a => {
    const activityDate = new Date(a.loggedAt || '');
    return activityDate >= prevWeekStart && activityDate < prevWeekEnd;
  });
  
  // Use shared utility for consistent nap statistics
  const currentWeekStats = calculateNapStatistics(currentWeekActivities, nightSleepStartHour, nightSleepEndHour);
  const prevWeekStats = calculateNapStatistics(prevWeekActivities, nightSleepStartHour, nightSleepEndHour);
  
  const napSummary = {
    avgDuration: Math.max(0, napDataForSummary.reduce((sum, d) => sum + d.value, 0) / napDataForSummary.filter(d => d.value > 0).length || 0),
    totalNaps: currentWeekStats.totalNaps,
    avgNapsPerDay: currentWeekStats.avgNapsPerDay,
    avgDaytimeNapsPerDay: currentWeekStats.avgDaytimeNapsPerDay,
  };
  
  const prevNapSummary = {
    avgDuration: prevWeekNapData.reduce((sum, d) => sum + d.value, 0) / prevWeekNapData.filter(d => d.value > 0).length || 0,
    avgNapsPerDay: prevWeekStats.avgNapsPerDay,
  };
  
  // Calculate absolute changes
  const feedVolumeChange = prevFeedSummary.avgVolume > 0 
    ? (feedSummary.avgVolume - prevFeedSummary.avgVolume)
    : 0;
  
  const feedCountChange = prevFeedSummary.avgFeedsPerDay > 0
    ? (feedSummary.avgFeedsPerDay - prevFeedSummary.avgFeedsPerDay)
    : 0;
    
  const napDurationChange = prevNapSummary.avgDuration > 0
    ? (napSummary.avgDuration - prevNapSummary.avgDuration)
    : 0;
  
  const napCountChange = prevNapSummary.avgNapsPerDay > 0
    ? (napSummary.avgDaytimeNapsPerDay - prevNapSummary.avgNapsPerDay)
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
  const avgNapLine = (napSummary.avgDuration / maxNapValue) * 100;

  return (
    <div className="space-y-4">
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
      <div className="space-y-4">
        {/* Section Header */}
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Feeding Trends</h2>

        {/* Level 1: Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Average Volume Card */}
          <div className="bg-card/30 backdrop-blur rounded-2xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-feed/10 flex items-center justify-center">
                <Milk className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Average Volume</h3>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-semibold text-foreground tracking-tight">
                {Math.round(feedSummary.avgVolume)} <span className="text-base text-muted-foreground font-normal">{feedUnit}/day</span>
              </div>
              {prevFeedSummary.avgVolume > 0 && (
                <div className="flex items-center gap-1.5">
                  {feedVolumeChange > 0 ? (
                    <TrendingUp className="w-3 h-3 text-primary" />
                  ) : feedVolumeChange < 0 ? (
                    <TrendingDown className="w-3 h-3 text-secondary" />
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {feedVolumeChange > 0 ? '+' : ''}{Math.round(feedVolumeChange)} {feedUnit} vs last week
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Feed Count Card */}
          <div className="bg-card/30 backdrop-blur rounded-2xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-feed/10 flex items-center justify-center">
                <ActivityIcon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Feed Count</h3>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-semibold text-foreground tracking-tight">
                {Math.round(feedSummary.avgFeedsPerDay)} <span className="text-base text-muted-foreground font-normal">/day</span>
              </div>
              {prevFeedSummary.avgFeedsPerDay > 0 && (
                <div className="flex items-center gap-1.5">
                  {feedCountChange > 0 ? (
                    <TrendingUp className="w-3 h-3 text-primary" />
                  ) : feedCountChange < 0 ? (
                    <TrendingDown className="w-3 h-3 text-secondary" />
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {feedCountChange > 0 ? '+' : ''}{feedCountChange.toFixed(1)} vs last week
                  </p>
                </div>
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
      <div className="space-y-4 mt-8">
        {/* Section Header */}
        <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">Sleep Trends</h2>

        {/* Sleep Summary Cards */}
        <div className="grid grid-cols-2 gap-4">
          {/* Total Sleep */}
          <div className="bg-card/30 backdrop-blur rounded-2xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-nap/10 flex items-center justify-center">
                <Moon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Total Sleep</h3>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-semibold text-foreground tracking-tight">
                {napSummary.avgDuration.toFixed(1)} <span className="text-base text-muted-foreground font-normal">h/day</span>
              </div>
              {prevNapSummary.avgDuration > 0 && (
                <div className="flex items-center gap-1.5">
                  {napDurationChange > 0 ? (
                    <TrendingUp className="w-3 h-3 text-primary" />
                  ) : napDurationChange < 0 ? (
                    <TrendingDown className="w-3 h-3 text-secondary" />
                  ) : null}
                  <p className="text-xs text-muted-foreground">
                    {napDurationChange > 0 ? '+' : ''}{napDurationChange.toFixed(1)}h vs last week
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Nap Length Change */}
          <div className="bg-card/30 backdrop-blur rounded-2xl p-5 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-xl bg-gradient-nap/10 flex items-center justify-center">
                <Moon className="w-4 h-4 text-primary" />
              </div>
              <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Nap Length</h3>
            </div>
            <div className="space-y-1">
              <div className="text-2xl font-semibold text-foreground tracking-tight">
                {napSummary.avgDaytimeNapsPerDay.toFixed(1)} <span className="text-base text-muted-foreground font-normal">naps/day</span>
              </div>
              <div className="flex items-center gap-1.5">
                {napCountChange > 0 ? (
                  <TrendingUp className="w-3 h-3 text-primary" />
                ) : napCountChange < 0 ? (
                  <TrendingDown className="w-3 h-3 text-secondary" />
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {napCountChange > 0 ? '+' : ''}{napCountChange.toFixed(1)} vs last week
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Week-over-week Insights */}
        <div className="bg-card/30 backdrop-blur rounded-2xl p-5 border border-border/50">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-primary/10 flex items-center justify-center">
              <ActivityIcon className="w-4 h-4 text-primary" />
            </div>
            <h3 className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Week Insights</h3>
          </div>
          <p className="text-sm text-foreground/90 leading-relaxed">
            {getSleepInterpretation()}
          </p>
        </div>
      </div>

      {/* Collective Pulse Section */}
      <div className="mt-8">
        <CollectivePulse babyBirthday={household?.baby_birthday} />
      </div>
    </div>
  );
};