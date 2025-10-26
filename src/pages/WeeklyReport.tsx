import { useEffect, useMemo } from "react";
import { useActivities } from "@/hooks/useActivities";
import { useHousehold } from "@/hooks/useHousehold";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getWeekCaption } from "@/utils/share/chartShare";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, differenceInMinutes } from "date-fns";
import { ReportConfig } from "@/components/ReportConfigModal";

interface WeeklyReportProps {
  config?: ReportConfig;
}

function formatAge(birthday?: string | null) {
  if (!birthday) return "";
  const birthDate = new Date(birthday);
  const today = new Date();
  
  const totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                      (today.getMonth() - birthDate.getMonth());
  const months = Math.max(0, totalMonths);
  
  // Calculate remaining weeks
  const monthsDate = new Date(birthDate);
  monthsDate.setMonth(monthsDate.getMonth() + totalMonths);
  const daysDiff = Math.floor((today.getTime() - monthsDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(daysDiff / 7);
  
  return `${months} months ${weeks} weeks`;
}

export default function WeeklyReport({ config }: WeeklyReportProps) {
  const { activities, loading } = useActivities();
  const { household } = useHousehold();
  const { isNightHour } = useNightSleepWindow();

  const babyName = household?.baby_name || "Baby";
  const babyBirthday = household?.baby_birthday;
  const ageText = formatAge(babyBirthday);
  
  // Format birth context
  const getBirthContext = () => {
    if (!babyBirthday) return "";
    const birthDate = new Date(babyBirthday);
    return `Born ${format(birthDate, 'MMMM dd, yyyy')} — term, healthy growth curve`;
  };
  
  // Determine date range based on config
  const getDateRange = () => {
    const now = new Date();
    
    if (config?.dateRange === 'custom' && config.customStartDate && config.customEndDate) {
      return {
        start: config.customStartDate,
        end: config.customEndDate
      };
    }
    
    if (config?.dateRange === 'last-week') {
      const lastWeekStart = startOfWeek(now, { weekStartsOn: 0 });
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const lastWeekEnd = endOfWeek(lastWeekStart, { weekStartsOn: 0 });
      return { start: lastWeekStart, end: lastWeekEnd };
    }
    
    // Default: this week
    return {
      start: startOfWeek(now, { weekStartsOn: 0 }),
      end: endOfWeek(now, { weekStartsOn: 0 })
    };
  };

  const { start: weekStart, end: weekEnd } = getDateRange();
  
  const weekCaption = config?.dateRange === 'custom' && config.customStartDate && config.customEndDate
    ? `${format(config.customStartDate, 'MMM dd')} – ${format(config.customEndDate, 'MMM dd, yyyy')}`
    : config?.dateRange === 'last-week'
    ? getWeekCaption(1)
    : getWeekCaption(0);

  // Helper to parse time string to minutes
  const parseTimeToMinutes = (timeStr: string): number | null => {
    // Handle both "HH:MM AM/PM" and "HH:MM" formats
    const match12h = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match12h) {
      let hours = parseInt(match12h[1], 10);
      const minutes = parseInt(match12h[2], 10);
      const period = match12h[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    }
    
    // Try 24h format
    const match24h = timeStr.match(/(\d+):(\d+)/);
    if (match24h) {
      const hours = parseInt(match24h[1], 10);
      const minutes = parseInt(match24h[2], 10);
      return hours * 60 + minutes;
    }
    
    return null;
  };

  // Detect first solids milestone across all activities
  const firstSolidDate = useMemo(() => {
    const solidFeeds = activities.filter(a => 
      a.type === 'feed' && a.details.feedType === 'solid'
    );
    
    if (solidFeeds.length === 0) return null;
    
    // Find the earliest solid feed
    const earliest = solidFeeds.reduce((earliest, current) => {
      const currentDate = new Date(current.logged_at);
      const earliestDate = new Date(earliest.logged_at);
      return currentDate < earliestDate ? current : earliest;
    });
    
    return new Date(earliest.logged_at);
  }, [activities]);

  // Calculate weekly stats
  const weekStats = useMemo(() => {
    console.log('WeeklyReport: Calculating stats', { 
      totalActivities: activities.length, 
      weekStart: weekStart.toISOString(), 
      weekEnd: weekEnd.toISOString() 
    });

    const weekActivities = activities.filter(a => {
      const actDate = new Date(a.logged_at);
      return actDate >= weekStart && actDate <= weekEnd;
    });

    console.log('WeeklyReport: Filtered activities', { 
      weekActivitiesCount: weekActivities.length,
      activityTypes: weekActivities.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    });

    const feeds = weekActivities.filter(a => a.type === 'feed');
    const sleeps = weekActivities.filter(a => a.type === 'nap');
    const diapers = weekActivities.filter(a => a.type === 'diaper');
    const notes = weekActivities.filter(a => a.type === 'note');
    
    // Feeding stats
    const totalFeeds = feeds.length;
    const totalVolume = feeds.reduce((sum, f) => {
      const qtyStr = f.details.quantity;
      if (!qtyStr) return sum;
      
      const qty = parseFloat(qtyStr);
      if (isNaN(qty)) return sum;
      
      const unit = f.details.unit || (qty > 50 ? 'ml' : 'oz');
      const ml = unit === 'oz' ? qty * 29.5735 : qty;
      
      return sum + ml;
    }, 0);
    const avgPerFeed = totalFeeds > 0 ? totalVolume / totalFeeds : 0;

    console.log('WeeklyReport: Feed stats', { totalFeeds, totalVolume, avgPerFeed });
    
    // Daily feed volumes
    const dailyVolumes = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(day => {
      const dayFeeds = feeds.filter(f => {
        const fDate = new Date(f.logged_at);
        return format(fDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });
      return dayFeeds.reduce((sum, f) => {
        const qtyStr = f.details.quantity;
        if (!qtyStr) return sum;
        
        const qty = parseFloat(qtyStr);
        if (isNaN(qty)) return sum;
        
        const unit = f.details.unit || (qty > 50 ? 'ml' : 'oz');
        const ml = unit === 'oz' ? qty * 29.5735 : qty;
        
        return sum + ml;
      }, 0);
    }).filter(v => v > 0);
    
    const minVolume = dailyVolumes.length > 0 ? Math.min(...dailyVolumes) : 0;
    const maxVolume = dailyVolumes.length > 0 ? Math.max(...dailyVolumes) : 0;
    
    // Separate overnight sleeps from daytime naps using night sleep window
    const overnightSleeps = sleeps.filter(s => {
      if (!s.details.startTime) return false;
      const startMins = parseTimeToMinutes(s.details.startTime);
      if (startMins === null) return false;
      
      const startHour = Math.floor(startMins / 60);
      return isNightHour(startHour);
    });
    
    const daytimeNaps = sleeps.filter(s => {
      if (!s.details.startTime) return false;
      const startMins = parseTimeToMinutes(s.details.startTime);
      if (startMins === null) return false;
      
      const startHour = Math.floor(startMins / 60);
      return !isNightHour(startHour);
    });
    
    // Calculate total sleep time (all sleeps)
    const totalSleepMinutes = sleeps.reduce((sum, s) => {
      if (!s.details.startTime || !s.details.endTime) return sum;
      
      const startMins = parseTimeToMinutes(s.details.startTime);
      const endMins = parseTimeToMinutes(s.details.endTime);
      
      if (startMins === null || endMins === null) return sum;
      
      let duration = endMins - startMins;
      if (duration < 0) duration += 24 * 60; // Handle overnight
      
      return sum + duration;
    }, 0);
    
    // Calculate average nap length (daytime naps only)
    const totalDaytimeNapMinutes = daytimeNaps.reduce((sum, s) => {
      if (!s.details.startTime || !s.details.endTime) return sum;
      
      const startMins = parseTimeToMinutes(s.details.startTime);
      const endMins = parseTimeToMinutes(s.details.endTime);
      
      if (startMins === null || endMins === null) return sum;
      
      let duration = endMins - startMins;
      if (duration < 0) duration += 24 * 60;
      
      return sum + duration;
    }, 0);
    
    const totalNaps = daytimeNaps.length;
    const avgNapMinutes = totalNaps > 0 ? totalDaytimeNapMinutes / totalNaps : 0;

    console.log('WeeklyReport: Sleep stats', { 
      totalSleeps: sleeps.length,
      overnightSleeps: overnightSleeps.length,
      daytimeNaps: totalNaps,
      totalSleepMinutes, 
      totalSleepHours: totalSleepMinutes / 60,
      totalDaytimeNapMinutes,
      avgNapMinutes 
    });
    
    const overnightDurationsWithDates = overnightSleeps.map(s => {
      if (!s.details.startTime || !s.details.endTime) return null;
      
      const startMins = parseTimeToMinutes(s.details.startTime);
      const endMins = parseTimeToMinutes(s.details.endTime);
      
      if (startMins === null || endMins === null) return null;
      
      let duration = endMins - startMins;
      if (duration < 0) duration += 24 * 60;
      
      return {
        duration,
        date: new Date(s.logged_at),
        startTime: s.details.startTime
      };
    }).filter(d => d !== null) as { duration: number; date: Date; startTime: string }[];
    
    const longestOvernightMinutes = overnightDurationsWithDates.length > 0 
      ? Math.max(...overnightDurationsWithDates.map(d => d.duration)) 
      : 0;
    const longestOvernightDate = overnightDurationsWithDates.length > 0
      ? overnightDurationsWithDates.reduce((longest, current) => 
          current.duration > longest.duration ? current : longest
        ).date
      : null;
    const avgOvernightMinutes = overnightDurationsWithDates.length > 0 
      ? overnightDurationsWithDates.reduce((a, b) => a + b.duration, 0) / overnightDurationsWithDates.length 
      : 0;
    
    // Calculate bedtime consistency (from overnight sleep start times)
    const bedtimes = overnightDurationsWithDates.map(s => {
      const startMins = parseTimeToMinutes(s.startTime);
      return startMins;
    }).filter(m => m !== null) as number[];
    
    const avgBedtimeMinutes = bedtimes.length > 0
      ? bedtimes.reduce((a, b) => a + b, 0) / bedtimes.length
      : null;
    
    const bedtimeVariance = bedtimes.length > 1 && avgBedtimeMinutes !== null
      ? Math.sqrt(bedtimes.reduce((sum, bt) => sum + Math.pow(bt - avgBedtimeMinutes, 2), 0) / bedtimes.length)
      : null;
    
    // Daily breakdown
    const dailyData = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayFeeds = feeds.filter(f => 
        format(new Date(f.logged_at), 'yyyy-MM-dd') === dayStr
      );
      const daySleeps = sleeps.filter(s => 
        format(new Date(s.logged_at), 'yyyy-MM-dd') === dayStr
      );
      
      const sleepMinutes = daySleeps.reduce((sum, s) => {
        if (!s.details.startTime || !s.details.endTime) return sum;
        
        const startMins = parseTimeToMinutes(s.details.startTime);
        const endMins = parseTimeToMinutes(s.details.endTime);
        
        if (startMins === null || endMins === null) return sum;
        
        let duration = endMins - startMins;
        if (duration < 0) duration += 24 * 60;
        
        return sum + duration;
      }, 0);
      
      const feedVolume = dayFeeds.reduce((sum, f) => {
        const qtyStr = f.details.quantity;
        if (!qtyStr) return sum;
        
        const qty = parseFloat(qtyStr);
        if (isNaN(qty)) return sum;
        
        const unit = f.details.unit || (qty > 50 ? 'ml' : 'oz');
        const ml = unit === 'oz' ? qty * 29.5735 : qty;
        
        return sum + ml;
      }, 0);
      
      return {
        date: format(day, 'MMM dd'),
        sleepHours: sleepMinutes / 60,
        naps: daySleeps.length,
        feedVolume: Math.round(feedVolume),
        feeds: dayFeeds.length
      };
    });
    
    // Nap count statistics
    const napCounts = dailyData.map(d => d.naps).filter(n => n > 0);
    const napCountMin = napCounts.length > 0 ? Math.min(...napCounts) : 0;
    const napCountMax = napCounts.length > 0 ? Math.max(...napCounts) : 0;
    const napCountMedian = napCounts.length > 0 
      ? napCounts.sort((a, b) => a - b)[Math.floor(napCounts.length / 2)]
      : 0;
    
    const daysWithSleepData = dailyData.filter(d => d.sleepHours > 0).length;
    const hasIncompleteSleepData = daysWithSleepData < 7;

    // Outlier detection per activity type
    const detectOutliers = (data: typeof dailyData) => {
      // Calculate average feed volume for days with data
      const feedVolumes = data.map(d => d.feedVolume).filter(v => v > 0);
      const avgFeedVolume = feedVolumes.length > 0 
        ? feedVolumes.reduce((a, b) => a + b, 0) / feedVolumes.length 
        : 0;
      
      // Calculate average sleep for days with data  
      const sleepHours = data.map(d => d.sleepHours).filter(h => h > 0);
      const avgSleepHours = sleepHours.length > 0
        ? sleepHours.reduce((a, b) => a + b, 0) / sleepHours.length
        : 0;

      // Mark which activity types are outliers for each day (not the whole day)
      const threshold = 0.5; // 50% of average
      
      return data.map(day => {
        const isFeedOutlier = (config?.includeFeeds ?? true) && 
          (avgFeedVolume > 0 && day.feedVolume > 0 && day.feedVolume < avgFeedVolume * threshold) ||
          (day.feedVolume === 0);
        const isSleepOutlier = (config?.includeSleep ?? true) &&
          (avgSleepHours > 0 && day.sleepHours > 0 && day.sleepHours < avgSleepHours * threshold) ||
          (day.sleepHours === 0);
        
        return {
          ...day,
          isFeedOutlier,
          isSleepOutlier
        };
      });
    };

    const dailyDataWithOutliers = detectOutliers(dailyData);
    
    // For display, only mark a day as fully excluded if ALL selected activity types are outliers
    const outlierDays = config?.hideOutliers 
      ? dailyDataWithOutliers.filter(d => {
          const selectedTypes = [
            config.includeFeeds && d.isFeedOutlier,
            config.includeSleep && d.isSleepOutlier
          ].filter(Boolean);
          // Only exclude if all selected types are outliers
          return selectedTypes.length > 0 && selectedTypes.every(v => v);
        }).map(d => d.date)
      : [];

    console.log('WeeklyReport: Final stats (pre-filter)', {
      totalFeeds,
      totalVolume,
      avgPerFeed,
      totalSleepHours: totalSleepMinutes / 60,
      avgDailySleep: daysWithSleepData > 0 ? totalSleepMinutes / 60 / daysWithSleepData : 0,
      daysWithSleepData,
      outlierDays,
      dailyData: dailyDataWithOutliers
    });

    // Calculate stats using only non-outlier days FOR EACH ACTIVITY TYPE
    // Feed stats - exclude days that are feed outliers
    const feedIncludedDays = config?.hideOutliers
      ? dailyDataWithOutliers.filter(d => !d.isFeedOutlier)
      : dailyDataWithOutliers;
    
    const incFeedVolumes = feedIncludedDays.map(d => d.feedVolume).filter(v => v > 0);
    const incMinVolume = incFeedVolumes.length > 0 ? Math.min(...incFeedVolumes) : 0;
    const incMaxVolume = incFeedVolumes.length > 0 ? Math.max(...incFeedVolumes) : 0;
    const incTotalFeeds = feedIncludedDays.reduce((sum, d) => sum + d.feeds, 0);
    const incTotalVolume = feedIncludedDays.reduce((sum, d) => sum + d.feedVolume, 0);
    const incAvgPerFeed = incTotalFeeds > 0 ? incTotalVolume / incTotalFeeds : 0;
    const feedsPerDayAvg = feedIncludedDays.length > 0 ? incTotalFeeds / feedIncludedDays.length : 0;

    // Sleep stats - exclude days that are sleep outliers
    const sleepIncludedDays = config?.hideOutliers
      ? dailyDataWithOutliers.filter(d => !d.isSleepOutlier)
      : dailyDataWithOutliers;
    
    const incTotalSleepHours = sleepIncludedDays.reduce((sum, d) => sum + d.sleepHours, 0);
    const incDaysWithSleepData = sleepIncludedDays.filter(d => d.sleepHours > 0).length;
    const incAvgDailySleep = incDaysWithSleepData > 0 ? incTotalSleepHours / incDaysWithSleepData : 0;
    const incTotalNaps = sleepIncludedDays.reduce((sum, d) => sum + d.naps, 0);
    const incNapCounts = sleepIncludedDays.map(d => d.naps).filter(n => n > 0);
    const incNapCountMin = incNapCounts.length > 0 ? Math.min(...incNapCounts) : 0;
    const incNapCountMax = incNapCounts.length > 0 ? Math.max(...incNapCounts) : 0;
    const incNapCountMedian = incNapCounts.length > 0
      ? incNapCounts.slice().sort((a, b) => a - b)[Math.floor(incNapCounts.length / 2)]
      : 0;

    // Detect sustained nap pattern transition (not just daily variation)
    const napTransition = (() => {
      if (incNapCounts.length < 5) return null; // Need sufficient data
      const firstHalf = incNapCounts.slice(0, Math.floor(incNapCounts.length / 2));
      const secondHalf = incNapCounts.slice(Math.floor(incNapCounts.length / 2));
      if (firstHalf.length === 0 || secondHalf.length === 0) return null;
      
      const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
      const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
      
      // Only flag if there's a clear sustained drop of at least 1 nap
      if (avgFirst - avgSecond >= 1) {
        return { from: Math.round(avgFirst), to: Math.round(avgSecond) };
      }
      return null;
    })();

    // Detect stable bedtime (consistently within ±15 min)
    const stableBedtime = bedtimeVariance !== null && bedtimeVariance <= 15 && bedtimes.length >= 5
      ? avgBedtimeMinutes
      : null;

    // Detect solids dominance (>25% of feeds are solids for this period)
    const totalFeedsInPeriod = feeds.length;
    const solidFeedsInPeriod = feeds.filter(f => f.details.feedType === 'solid').length;
    const solidsDominant = totalFeedsInPeriod > 0 && (solidFeedsInPeriod / totalFeedsInPeriod) > 0.25;

    // Detect feed frequency stabilization (feeds/day consistent across period)
    const dailyFeedCounts = feedIncludedDays.map(d => d.feeds).filter(f => f > 0);
    const feedFrequencyStable = (() => {
      if (dailyFeedCounts.length < 5) return false;
      const avgFeeds = dailyFeedCounts.reduce((a, b) => a + b, 0) / dailyFeedCounts.length;
      const variance = Math.sqrt(
        dailyFeedCounts.reduce((sum, count) => sum + Math.pow(count - avgFeeds, 2), 0) / dailyFeedCounts.length
      );
      return variance < 1.5; // Low variance = stable pattern
    })();

    console.log('WeeklyReport: Final stats (included days)', {
      feedIncludedDays: feedIncludedDays.length,
      sleepIncludedDays: sleepIncludedDays.length,
      incTotalFeeds,
      incTotalVolume,
      incAvgPerFeed,
      incMinVolume,
      incMaxVolume,
      incTotalSleepHours,
      incAvgDailySleep,
      napTransition,
      stableBedtime,
      solidsDominant,
      feedFrequencyStable
    });
    
    return {
      totalFeeds: incTotalFeeds,
      totalVolume: incTotalVolume,
      avgPerFeed: incAvgPerFeed,
      minVolume: Math.round(incMinVolume),
      maxVolume: Math.round(incMaxVolume),
      longestOvernightMinutes,
      longestOvernightDate,
      avgOvernightMinutes,
      avgBedtimeMinutes,
      bedtimeVariance,
      stableBedtime,
      napTransition,
      solidsDominant,
      feedFrequencyStable,
      totalSleepHours: incTotalSleepHours,
      avgDailySleep: incAvgDailySleep,
      totalNaps: incTotalNaps,
      avgNapMinutes, // keep detailed duration-based metric
      napCountMin: incNapCountMin,
      napCountMax: incNapCountMax,
      napCountMedian: incNapCountMedian,
      hasIncompleteSleepData,
      dailyData: dailyDataWithOutliers,
      outlierDays,
      totalDiapers: diapers.length,
      totalNotes: notes.length,
      feedsPerDayAvg,
      feedIncludedDays: feedIncludedDays.length,
      sleepIncludedDays: sleepIncludedDays.length
    };
  }, [activities, weekStart, weekEnd, config?.hideOutliers]);

  useEffect(() => {
    document.title = `${babyName}'s Weekly Summary Report`;
  }, [babyName]);

  const formatHoursMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  return (
    <main className="min-h-screen bg-white text-black print:bg-white print:text-black">
      <div className="max-w-4xl mx-auto px-8 py-12 pb-16 print:p-8 print:pb-32 print:page-break" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Page Header - Repeats on each page */}
        <style>{`
          @media print {
            @page {
              margin: 1in;
              margin-bottom: 1.5in;
            }
            .print\\:page-break {
              page-break-inside: avoid;
            }
            .print-fixed-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
            }
            section {
              padding-bottom: 2rem;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
          }
        `}</style>
        {/* Print-only fixed footer repeated each page */}
        <div className="print-fixed-footer hidden print:block">
          <div className="max-w-4xl mx-auto px-8">
            <div className="flex justify-between items-center border-t border-gray-300 pt-3 text-xs text-gray-600">
              <div>
                <p className="mb-1 font-semibold">Generated by Sprout - Baby Tracker</p>
                <p>For clinical reference only — not a medical record</p>
              </div>
              <p className="text-right">{format(new Date(), 'MMM dd, yyyy \'at\' h:mm a')}</p>
            </div>
          </div>
        </div>
        {/* Header */}
        <header className="mb-8 print:mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Sprout - Baby Tracker</p>
              <h1 className="text-xl font-semibold mb-1">{babyName} • {ageText}</h1>
              {babyBirthday && (
                <p className="text-xs text-gray-500 mb-2">({getBirthContext()})</p>
              )}
              <h2 className="text-2xl font-bold mb-2" style={{ color: '#6B4D77' }}>Summary for Pediatrician</h2>
              <p className="text-sm text-gray-700">{weekCaption}</p>
              <p className="text-sm text-gray-600 mt-2 italic">
                Summary of feeding and sleep patterns logged during the week of {weekCaption.replace('Week of ', '')}.
              </p>
            </div>
          </div>

          {/* Outlier notice */}
          {config?.hideOutliers && weekStats.outlierDays && weekStats.outlierDays.length > 0 && (
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-900">
                <strong>Note:</strong> Some days were excluded from calculations due to incomplete data for specific activity types: {weekStats.outlierDays.join(', ')}
              </p>
            </div>
          )}
        </header>

        <Separator className="my-6 border-gray-300" />

        {/* Feeding Summary */}
        {(config?.includeFeeds ?? true) && (
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide" style={{ color: '#6B4D77' }}>Feeding Summary</h3>
          <div className="space-y-2 text-sm leading-relaxed">
            <p><strong>Total Feeds:</strong> {weekStats.totalFeeds}</p>
            <p><strong>Total Volume:</strong> {weekStats.totalVolume.toFixed(0)} ml ({(weekStats.totalVolume / 29.5735).toFixed(1)} oz)</p>
            <p><strong>Average Per Feed:</strong> {Math.round(weekStats.avgPerFeed)} ml ({(weekStats.avgPerFeed / 29.5735).toFixed(1)} oz)</p>
            <p><strong>Daily Range:</strong> {weekStats.minVolume}–{weekStats.maxVolume} ml</p>
            <p><strong>Feeding Pattern:</strong> {weekStats.feedsPerDayAvg.toFixed(1)} feeds/day average</p>
            {firstSolidDate && (
              <p><strong>Solids Introduced:</strong> {format(firstSolidDate, 'MMMM dd, yyyy')}</p>
            )}
          </div>
          <p className="mt-4 text-sm text-gray-700">
            <strong>Notes:</strong> Daily intake shows stable feeding frequency with {weekStats.maxVolume - weekStats.minVolume > 300 ? 'moderate' : 'mild'} volume variation. No missed feeds or feeding intolerance reported.{firstSolidDate && ' Solid foods have been introduced.'}
          </p>
        </section>
        )}

        {(config?.includeFeeds ?? true) && <Separator className="my-6 border-gray-300" />}

        {/* Sleep Summary */}
        {(config?.includeSleep ?? true) && (
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide" style={{ color: '#6B4D77' }}>Sleep Summary</h3>
          <div className="space-y-2 text-sm leading-relaxed">
            <p><strong>Total Sleep:</strong> {weekStats.totalSleepHours > 0 ? `${weekStats.totalSleepHours.toFixed(1)} h` : '—'} (avg {weekStats.avgDailySleep > 0 ? `${weekStats.avgDailySleep.toFixed(1)} h/day` : '—'}){weekStats.hasIncompleteSleepData && ' (Data incomplete for some days)'}</p>
            <p><strong>Total Naps:</strong> {weekStats.totalNaps}</p>
            <p><strong>Average Nap Length:</strong> {weekStats.avgNapMinutes > 0 ? formatHoursMinutes(weekStats.avgNapMinutes) : '—'}</p>
            <p><strong>Nap Count Range:</strong> {weekStats.napCountMin}–{weekStats.napCountMax} naps/day (median: {weekStats.napCountMedian})</p>
            {weekStats.longestOvernightMinutes > 0 && (
              <p><strong>Longest Overnight Sleep:</strong> {formatHoursMinutes(weekStats.longestOvernightMinutes)} (avg {formatHoursMinutes(weekStats.avgOvernightMinutes)})</p>
            )}
          </div>
          <p className="mt-4 text-sm text-gray-700">
            <strong>Notes:</strong> {weekStats.avgOvernightMinutes >= 600 ? 'Consistent overnight sleep (~10–11h) with' : 'Overnight sleep with'} daytime nap count {weekStats.napCountMax > weekStats.napCountMin + 1 ? 'showing variation' : 'relatively stable'}, likely age-appropriate {weekStats.napCountMedian <= 2 ? 'transition toward 2-nap pattern' : 'sleep development'}.
          </p>
        </section>
        )}

        {(config?.includeSleep ?? true) && <Separator className="my-6 border-gray-300" />}

        {/* Diaper Summary */}
        {config?.includeDiapers && weekStats.totalDiapers > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide" style={{ color: '#6B4D77' }}>Diaper Summary</h3>
          <div className="space-y-2 text-sm leading-relaxed">
            <p><strong>Total Diapers:</strong> {weekStats.totalDiapers}</p>
            <p><strong>Daily Average:</strong> {(weekStats.totalDiapers / 7).toFixed(1)} diapers/day</p>
          </div>
        </section>
        )}

        {config?.includeDiapers && weekStats.totalDiapers > 0 && <Separator className="my-6 border-gray-300" />}

        {/* Daily Log Summary Table */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide" style={{ color: '#6B4D77' }}>Daily Log Summary</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-400" style={{ backgroundColor: '#f5f5f5' }}>
                  <th className="text-left py-2 px-3 font-semibold">Date</th>
                  <th className="text-left py-2 px-3 font-semibold">Total Sleep (h)</th>
                  <th className="text-left py-2 px-3 font-semibold">Naps</th>
                  <th className="text-left py-2 px-3 font-semibold">Feed Volume (ml)</th>
                  <th className="text-left py-2 px-3 font-semibold">Feeds</th>
                </tr>
              </thead>
              <tbody>
                {weekStats.dailyData.map((day, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-2 px-3">{day.date}</td>
                    <td className="py-2 px-3">{day.sleepHours > 0 ? day.sleepHours.toFixed(1) : '—'}</td>
                    <td className="py-2 px-3">{day.naps > 0 ? day.naps : '—'}</td>
                    <td className="py-2 px-3">{day.feedVolume > 0 ? day.feedVolume : '—'}</td>
                    <td className="py-2 px-3">{day.feeds > 0 ? day.feeds : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Separator className="my-6 border-gray-300" />

        {/* Milestones & Key Changes */}
        {(firstSolidDate || weekStats.solidsDominant || weekStats.feedFrequencyStable || 
          weekStats.napTransition || weekStats.stableBedtime !== null || 
          (weekStats.longestOvernightMinutes > 0 && weekStats.longestOvernightDate)) && (
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide" style={{ color: '#6B4D77' }}>Milestones & Key Changes</h3>
          <div className="border-t-2 border-b-2 border-gray-400 py-3">
            <ul className="space-y-1.5 text-sm">
              {/* Feeding Milestones */}
              {firstSolidDate && (
                <li>• First solids introduced on {format(firstSolidDate, 'MMMM dd, yyyy')}</li>
              )}
              {weekStats.solidsDominant && (
                <li>• Transition to solids-dominant diet ({">"}25% of feeds include solids)</li>
              )}
              {weekStats.feedFrequencyStable && weekStats.feedsPerDayAvg > 0 && (
                <li>• Feed frequency stabilized at {weekStats.feedsPerDayAvg.toFixed(1)} feeds/day</li>
              )}
              
              {/* Sleep Milestones */}
              {weekStats.napTransition && (
                <li>• Nap pattern transitioned from {weekStats.napTransition.from} → {weekStats.napTransition.to} naps/day</li>
              )}
              {weekStats.stableBedtime !== null && (
                <li>
                  • Stable bedtime achieved at{' '}
                  {format(new Date(0, 0, 0, Math.floor(weekStats.stableBedtime / 60), weekStats.stableBedtime % 60), 'h:mm a')}{' '}
                  (±15 min)
                </li>
              )}
              {weekStats.longestOvernightMinutes > 0 && weekStats.longestOvernightDate && (
                <li>
                  • Longest overnight sleep {formatHoursMinutes(weekStats.longestOvernightMinutes)} ({format(weekStats.longestOvernightDate, 'MMM dd')})
                </li>
              )}
            </ul>
          </div>
        </section>
        )}

        {(firstSolidDate || weekStats.solidsDominant || weekStats.feedFrequencyStable || 
          weekStats.napTransition || weekStats.stableBedtime !== null || 
          (weekStats.longestOvernightMinutes > 0 && weekStats.longestOvernightDate)) && (
        <Separator className="my-6 border-gray-300" />
        )}

        {/* Observations */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide" style={{ color: '#6B4D77' }}>Observations</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li>Feeding and sleep remain within expected range for age</li>
            {weekStats.napCountMin === 1 && weekStats.napCountMax > 2 && weekStats.sleepIncludedDays >= 5 && (
              <li>One-day drop to single nap observed; monitor persistence</li>
            )}
            <li>No abnormal feeding gaps or nighttime waking reported</li>
          </ul>
        </section>

        <Separator className="my-6 border-gray-300" />

        {/* Footer */}
        <footer className="text-xs text-gray-600 mt-8 mb-8 print:hidden border-t border-gray-300 pt-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="mb-1 font-semibold">Generated by Sprout - Baby Tracker</p>
              <p>For clinical reference only — not a medical record</p>
            </div>
            <p className="text-right">{format(new Date(), 'MMM dd, yyyy \'at\' h:mm a')}</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
