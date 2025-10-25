import { useEffect, useMemo } from "react";
import { useActivities } from "@/hooks/useActivities";
import { useHousehold } from "@/hooks/useHousehold";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getWeekCaption } from "@/utils/share/chartShare";
import { startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO, differenceInMinutes } from "date-fns";

function formatAge(birthday?: string | null) {
  if (!birthday) return "";
  const dob = new Date(birthday);
  const now = new Date();
  let months = (now.getFullYear() - dob.getFullYear()) * 12 + (now.getMonth() - dob.getMonth());
  const daysIntoMonth = now.getDate() - dob.getDate();
  if (daysIntoMonth < 0) months -= 1;
  const monthsDate = new Date(dob);
  monthsDate.setMonth(dob.getMonth() + months);
  const diffMs = now.getTime() - monthsDate.getTime();
  const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
  return `${months} months ${weeks} weeks`;
}

export default function WeeklyReport() {
  const { activities, loading } = useActivities();
  const { household } = useHousehold();

  const babyName = household?.baby_name || "Baby";
  const ageText = formatAge(household?.baby_birthday);
  const weekCaption = getWeekCaption(0);

  // Calculate weekly stats
  const weekStats = useMemo(() => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    
    const weekActivities = activities.filter(a => {
      const actDate = new Date(a.logged_at);
      return actDate >= weekStart && actDate <= weekEnd;
    });

    const feeds = weekActivities.filter(a => a.type === 'feed');
    const sleeps = weekActivities.filter(a => a.type === 'nap');
    
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
    
    // Longest stretch between feeds
    let longestStretch = 0;
    const sortedFeeds = [...feeds].sort((a, b) => 
      new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
    );
    for (let i = 1; i < sortedFeeds.length; i++) {
      const diff = differenceInMinutes(
        new Date(sortedFeeds[i].logged_at),
        new Date(sortedFeeds[i-1].logged_at)
      );
      longestStretch = Math.max(longestStretch, diff);
    }
    
    // Sleep stats
    const totalSleepMinutes = sleeps.reduce((sum, s) => {
      if (s.details.startTime && s.details.endTime) {
        // Parse HH:MM format times
        const [startH, startM] = s.details.startTime.split(':').map(Number);
        const [endH, endM] = s.details.endTime.split(':').map(Number);
        let duration = (endH * 60 + endM) - (startH * 60 + startM);
        if (duration < 0) duration += 24 * 60; // Handle overnight
        return sum + duration;
      }
      return sum;
    }, 0);
    const totalNaps = sleeps.length;
    const avgNapMinutes = totalNaps > 0 ? totalSleepMinutes / totalNaps : 0;
    
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
          const [startH, startM] = s.details.startTime.split(':').map(Number);
          const [endH, endM] = s.details.endTime.split(':').map(Number);
          let duration = (endH * 60 + endM) - (startH * 60 + startM);
          if (duration < 0) duration += 24 * 60;
          return sum + duration;
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
    
    return {
      totalFeeds,
      totalVolume,
      avgPerFeed,
      minVolume: Math.round(minVolume),
      maxVolume: Math.round(maxVolume),
      longestStretch,
      totalSleepHours: totalSleepMinutes / 60,
      avgDailySleep: totalSleepMinutes / 60 / 7,
      totalNaps,
      avgNapMinutes,
      dailyData
    };
  }, [activities]);

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
      <div className="max-w-4xl mx-auto px-8 py-8 print:p-8" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {/* Header */}
        <header className="mb-8 print:mb-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Parenting Partner</p>
              <h1 className="text-xl font-semibold mb-1">{babyName} • {ageText}</h1>
              <h2 className="text-2xl font-bold mb-2">Summary for Pediatrician</h2>
              <p className="text-sm text-gray-700">{weekCaption}</p>
            </div>
            <div className="print:hidden">
              <Button variant="outline" onClick={() => window.print()}>Print</Button>
            </div>
          </div>
        </header>

        <Separator className="my-6 border-gray-300" />

        {/* Feeding Summary */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide">Feeding Summary</h3>
          <div className="space-y-2 text-sm leading-relaxed">
            <p><strong>Total Feeds:</strong> {weekStats.totalFeeds}</p>
            <p><strong>Total Volume:</strong> {weekStats.totalVolume} ml ({(weekStats.totalVolume / 29.5735).toFixed(1)} oz)</p>
            <p><strong>Average Per Feed:</strong> {Math.round(weekStats.avgPerFeed)} ml ({(weekStats.avgPerFeed / 29.5735).toFixed(1)} oz)</p>
            <p><strong>Daily Range:</strong> {weekStats.minVolume}–{weekStats.maxVolume} ml</p>
            <p><strong>Longest Stretch Between Feeds:</strong> {formatHoursMinutes(weekStats.longestStretch)}</p>
            <p><strong>Feeding Pattern:</strong> {Math.round(weekStats.totalFeeds / 7)} feeds/day average</p>
          </div>
          <p className="mt-4 text-sm italic text-gray-700">
            Notes: Review daily table below for volume trends.
          </p>
        </section>

        <Separator className="my-6 border-gray-300" />

        {/* Sleep Summary */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide">Sleep Summary</h3>
          <div className="space-y-2 text-sm leading-relaxed">
            <p><strong>Total Sleep:</strong> {weekStats.totalSleepHours.toFixed(1)} h (avg {weekStats.avgDailySleep.toFixed(1)} h/day)</p>
            <p><strong>Total Naps:</strong> {weekStats.totalNaps}</p>
            <p><strong>Average Nap Length:</strong> {formatHoursMinutes(weekStats.avgNapMinutes)}</p>
            <p><strong>Naps Per Day:</strong> {(weekStats.totalNaps / 7).toFixed(1)} average</p>
          </div>
          <p className="mt-4 text-sm italic text-gray-700">
            Notes: See daily breakdown for nap count variations.
          </p>
        </section>

        <Separator className="my-6 border-gray-300" />

        {/* Daily Totals Table */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide">Daily Totals</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b-2 border-gray-400">
                  <th className="text-left py-2 px-3 font-semibold">Date</th>
                  <th className="text-left py-2 px-3 font-semibold">Total Sleep</th>
                  <th className="text-left py-2 px-3 font-semibold">Naps</th>
                  <th className="text-left py-2 px-3 font-semibold">Feed Volume</th>
                  <th className="text-left py-2 px-3 font-semibold">Feeds</th>
                </tr>
              </thead>
              <tbody>
                {weekStats.dailyData.map((day, idx) => (
                  <tr key={idx} className="border-b border-gray-200">
                    <td className="py-2 px-3">{day.date}</td>
                    <td className="py-2 px-3">{day.sleepHours.toFixed(1)}h</td>
                    <td className="py-2 px-3">{day.naps}</td>
                    <td className="py-2 px-3">{day.feedVolume} ml</td>
                    <td className="py-2 px-3">{day.feeds}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Separator className="my-6 border-gray-300" />

        {/* Observations */}
        <section className="mb-8">
          <h3 className="text-lg font-bold mb-4 uppercase tracking-wide">Observations</h3>
          <ul className="list-disc list-inside space-y-2 text-sm text-gray-700">
            <li>Feeding and sleep patterns appear consistent throughout the week</li>
            <li>Review daily table for any significant deviations from baseline</li>
            <li>Tracking continues to support routine care and developmental monitoring</li>
          </ul>
        </section>

        <Separator className="my-6 border-gray-300" />

        {/* Footer */}
        <footer className="text-xs text-gray-600 mt-8 print:mt-6">
          <p className="mb-1">Generated by Parenting Partner</p>
          <p className="mb-1">{format(new Date(), 'MMM dd, yyyy \'at\' h:mm a')}</p>
          <p>For clinical reference only — not a medical record</p>
        </footer>
      </div>
    </main>
  );
}
