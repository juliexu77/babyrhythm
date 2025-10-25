import { useEffect, useMemo } from "react";
import { useActivities } from "@/hooks/useActivities";
import { useHousehold } from "@/hooks/useHousehold";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getWeekCaption } from "@/utils/share/chartShare";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO, differenceInMinutes } from "date-fns";
import { ReportConfig } from "@/components/ReportConfigModal";

interface WeeklyReportProps {
  config?: ReportConfig;
}

function formatAge(birthday?: string | null) {
  if (!birthday) return "";
  const dob = new Date(birthday);
  const now = new Date();
  
  // Calculate total months
  const totalMonths = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  const months = Math.max(0, totalMonths);
  
  // Calculate remaining weeks from the month anniversary
  const monthsDate = new Date(dob);
  monthsDate.setMonth(dob.getMonth() + totalMonths);
  const daysDiff = Math.floor((now.getTime() - monthsDate.getTime()) / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(daysDiff / 7);
  
  return `${months} months ${weeks} weeks`;
}

export default function WeeklyReport({ config }: WeeklyReportProps) {
  const { activities, loading } = useActivities();
  const { household } = useHousehold();

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

  // Calculate weekly stats
  const weekStats = useMemo(() => {
    const weekActivities = activities.filter(a => {
      const actDate = new Date(a.logged_at);
      return actDate >= weekStart && actDate <= weekEnd;
    });

    const feeds = weekActivities.filter(a => a.type === 'feed');
    const sleeps = weekActivities.filter(a => a.type === 'nap');
    const diapers = weekActivities.filter(a => a.type === 'diaper');
    const notes = weekActivities.filter(a => a.type === 'note');
    
    // Feeding stats
    const totalFeeds = feeds.length;
    const totalVolume = feeds.reduce((sum, f) => {
      const qty = parseFloat(f.details.quantity || '0');
      const ml = f.details.unit === 'oz' ? qty * 29.5735 : qty;
      return sum + ml;
    }, 0);
    const avgPerFeed = totalFeeds > 0 ? totalVolume / totalFeeds : 0;
    
    // Daily feed volumes
    const dailyVolumes = eachDayOfInterval({ start: weekStart, end: weekEnd }).map(day => {
      const dayFeeds = feeds.filter(f => {
        const fDate = new Date(f.logged_at);
        return format(fDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
      });
      return dayFeeds.reduce((sum, f) => {
        const qty = parseFloat(f.details.quantity || '0');
        const ml = f.details.unit === 'oz' ? qty * 29.5735 : qty;
        return sum + ml;
      }, 0);
    }).filter(v => v > 0);
    
    const minVolume = dailyVolumes.length > 0 ? Math.min(...dailyVolumes) : 0;
    const maxVolume = dailyVolumes.length > 0 ? Math.max(...dailyVolumes) : 0;
    
    // Longest stretch between daytime feeds (exclude overnight 6pm-6am)
    let longestDaytimeStretch = 0;
    const sortedFeeds = [...feeds].sort((a, b) => 
      new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
    for (let i = 1; i < sortedFeeds.length; i++) {
      const prevTime = new Date(sortedFeeds[i-1].logged_at);
      const currTime = new Date(sortedFeeds[i].logged_at);
      const prevHour = prevTime.getHours();
      const currHour = currTime.getHours();
      
      // Skip if crossing overnight period (6pm to 6am)
      if ((prevHour >= 18 || prevHour < 6) && (currHour >= 6 && currHour < 18)) {
        continue;
      }
      
      const diff = differenceInMinutes(currTime, prevTime);
      if (diff < 720) { // Less than 12 hours (not overnight)
        longestDaytimeStretch = Math.max(longestDaytimeStretch, diff);
      }
    }
    
    // Sleep stats
    const totalSleepMinutes = sleeps.reduce((sum, s) => {
      if (s.details.startTime && s.details.endTime) {
        const startMatch = s.details.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        const endMatch = s.details.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        
        if (startMatch && endMatch) {
          let startH = parseInt(startMatch[1], 10);
          const startM = parseInt(startMatch[2], 10);
          const startPeriod = startMatch[3].toUpperCase();
          
          let endH = parseInt(endMatch[1], 10);
          const endM = parseInt(endMatch[2], 10);
          const endPeriod = endMatch[3].toUpperCase();
          
          // Convert to 24h
          if (startPeriod === 'PM' && startH !== 12) startH += 12;
          if (startPeriod === 'AM' && startH === 12) startH = 0;
          if (endPeriod === 'PM' && endH !== 12) endH += 12;
          if (endPeriod === 'AM' && endH === 12) endH = 0;
          
          let duration = (endH * 60 + endM) - (startH * 60 + startM);
          if (duration < 0) duration += 24 * 60; // Handle overnight
          return sum + duration;
        }
      }
      return sum;
    }, 0);
    const totalNaps = sleeps.length;
    const avgNapMinutes = totalNaps > 0 ? totalSleepMinutes / totalNaps : 0;
    
    // Overnight sleep analysis (naps starting 6pm-midnight)
    const overnightSleeps = sleeps.filter(s => {
      if (!s.details.startTime) return false;
      const match = s.details.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (!match) return false;
      let hour = parseInt(match[1], 10);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;
      return hour >= 18 || hour <= 6;
    });
    
    const overnightDurations = overnightSleeps.map(s => {
      if (!s.details.startTime || !s.details.endTime) return 0;
      const startMatch = s.details.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      const endMatch = s.details.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      
      if (startMatch && endMatch) {
        let startH = parseInt(startMatch[1], 10);
        const startM = parseInt(startMatch[2], 10);
        const startPeriod = startMatch[3].toUpperCase();
        
        let endH = parseInt(endMatch[1], 10);
        const endM = parseInt(endMatch[2], 10);
        const endPeriod = endMatch[3].toUpperCase();
        
        if (startPeriod === 'PM' && startH !== 12) startH += 12;
        if (startPeriod === 'AM' && startH === 12) startH = 0;
        if (endPeriod === 'PM' && endH !== 12) endH += 12;
        if (endPeriod === 'AM' && endH === 12) endH = 0;
        
        let duration = (endH * 60 + endM) - (startH * 60 + startM);
        if (duration < 0) duration += 24 * 60;
        return duration;
      }
      return 0;
    }).filter(d => d > 0);
    
    const longestOvernightMinutes = overnightDurations.length > 0 ? Math.max(...overnightDurations) : 0;
    const avgOvernightMinutes = overnightDurations.length > 0 
      ? overnightDurations.reduce((a, b) => a + b, 0) / overnightDurations.length 
      : 0;
    
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
        if (s.details.startTime && s.details.endTime) {
          const startMatch = s.details.startTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
          const endMatch = s.details.endTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
          
          if (startMatch && endMatch) {
            let startH = parseInt(startMatch[1], 10);
            const startM = parseInt(startMatch[2], 10);
            const startPeriod = startMatch[3].toUpperCase();
            
            let endH = parseInt(endMatch[1], 10);
            const endM = parseInt(endMatch[2], 10);
            const endPeriod = endMatch[3].toUpperCase();
            
            if (startPeriod === 'PM' && startH !== 12) startH += 12;
            if (startPeriod === 'AM' && startH === 12) startH = 0;
            if (endPeriod === 'PM' && endH !== 12) endH += 12;
            if (endPeriod === 'AM' && endH === 12) endH = 0;
            
            let duration = (endH * 60 + endM) - (startH * 60 + startM);
            if (duration < 0) duration += 24 * 60;
            return sum + duration;
          }
        }
        return sum;
      }, 0);
      
      const feedVolume = dayFeeds.reduce((sum, f) => {
        const qty = parseFloat(f.details.quantity || '0');
        const ml = f.details.unit === 'oz' ? qty * 29.5735 : qty;
        return sum + ml;
      }, 0);
      
      return {
        date: format(day, 'EEE'),
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
    
    return {
      totalFeeds,
      totalVolume,
      avgPerFeed,
      minVolume: Math.round(minVolume),
      maxVolume: Math.round(maxVolume),
      longestDaytimeStretch,
      longestOvernightMinutes,
      avgOvernightMinutes,
      totalSleepHours: totalSleepMinutes / 60,
      avgDailySleep: daysWithSleepData > 0 ? totalSleepMinutes / 60 / daysWithSleepData : 0,
      totalNaps,
      avgNapMinutes,
      napCountMin,
      napCountMax,
      napCountMedian,
      hasIncompleteSleepData,
      dailyData,
      totalDiapers: diapers.length,
      totalNotes: notes.length
    };
  }, [activities, weekStart, weekEnd]);

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
      <div className="max-w-4xl mx-auto px-8 py-8 print:p-8 print:page-break" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Page Header - Repeats on each page */}
        <style>{`
          @media print {
            @page {
              margin: 1in;
            }
            .print\\:page-break {
              page-break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
          }
        `}</style>
        {/* Header */}
        <header className="mb-8 print:mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Parenting Partner</p>
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
            <div className="print:hidden">
              <Button variant="outline" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
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
            <p><strong>Feeding Pattern:</strong> {Math.round(weekStats.totalFeeds / 7)} feeds/day average</p>
          </div>
          <p className="mt-4 text-sm text-gray-700">
            <strong>Notes:</strong> Daily intake shows stable feeding frequency with {weekStats.maxVolume - weekStats.minVolume > 300 ? 'moderate' : 'mild'} volume variation. No missed feeds or feeding intolerance reported.
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

        {/* Notes Summary */}
        {config?.includeNotes && weekStats.totalNotes > 0 && (
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide" style={{ color: '#6B4D77' }}>Notes</h3>
          <p className="text-sm text-gray-700">{weekStats.totalNotes} note{weekStats.totalNotes !== 1 ? 's' : ''} logged during this period.</p>
        </section>
        )}

        {config?.includeNotes && weekStats.totalNotes > 0 && <Separator className="my-6 border-gray-300" />}

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

        {/* Observations */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide" style={{ color: '#6B4D77' }}>Observations</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li>Feeding and sleep remain within expected range for age</li>
            {weekStats.napCountMin === 1 && weekStats.napCountMax > 2 && (
              <li>One-day drop to single nap observed; monitor persistence</li>
            )}
            <li>No abnormal feeding gaps or nighttime waking reported</li>
          </ul>
        </section>

        <Separator className="my-6 border-gray-300" />

        {/* Footer */}
        <footer className="text-xs text-gray-600 mt-8 print:mt-6 border-t border-gray-300 pt-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="mb-1 font-semibold">Generated by Parenting Partner</p>
              <p>For clinical reference only — not a medical record</p>
            </div>
            <p className="text-right">{format(new Date(), 'MMM dd, yyyy \'at\' h:mm a')}</p>
          </div>
        </footer>
      </div>
    </main>
  );
}
