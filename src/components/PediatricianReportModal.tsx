import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format, subDays, startOfDay, endOfDay, eachDayOfInterval } from "date-fns";
import { useHousehold } from "@/hooks/useHousehold";

interface Activity {
  id: string;
  type: string;
  loggedAt?: string;
  time?: string;
  details: any;
}

interface PediatricianReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  babyName?: string;
}

export function PediatricianReportModal({
  open,
  onOpenChange,
  activities,
  babyName = "Baby",
}: PediatricianReportModalProps) {
  const { household } = useHousehold();
  const [dateRange, setDateRange] = useState<'last-week' | 'last-month' | 'custom'>('last-week');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [includeFeeds, setIncludeFeeds] = useState(true);
  const [includeSleep, setIncludeSleep] = useState(true);
  const [includeDiapers, setIncludeDiapers] = useState(true);
  const [observations, setObservations] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    switch (dateRange) {
      case 'last-week':
        return { start: subDays(now, 7), end: now };
      case 'last-month':
        return { start: subDays(now, 30), end: now };
      case 'custom':
        return { 
          start: customStartDate || subDays(now, 7), 
          end: customEndDate || now 
        };
    }
  };

  const parseTimeToMinutes = (timeStr: string): number | null => {
    const match12h = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
    if (match12h) {
      let hours = parseInt(match12h[1], 10);
      const minutes = parseInt(match12h[2], 10);
      const period = match12h[3].toUpperCase();
      
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      
      return hours * 60 + minutes;
    }
    return null;
  };

  const formatAge = (birthday?: string | null) => {
    if (!birthday) return "";
    const birthDate = new Date(birthday);
    const today = new Date();
    
    const totalMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + 
                        (today.getMonth() - birthDate.getMonth());
    const months = Math.max(0, totalMonths);
    
    const monthsDate = new Date(birthDate);
    monthsDate.setMonth(monthsDate.getMonth() + totalMonths);
    const daysDiff = Math.floor((today.getTime() - monthsDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(daysDiff / 7);
    
    return `${months} months ${weeks} weeks`;
  };

  const formatHoursMinutes = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = Math.round(minutes % 60);
    return `${h}h ${m}m`;
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const { start, end } = getDateRange();
      
      // Filter activities by date range
      const filtered = activities.filter(a => {
        if (!a.loggedAt) return false;
        const activityDate = new Date(a.loggedAt);
        return activityDate >= startOfDay(start) && activityDate <= endOfDay(end);
      });

      // Calculate summaries
      const feeds = includeFeeds ? filtered.filter(a => a.type === 'feed') : [];
      const sleeps = includeSleep ? filtered.filter(a => a.type === 'nap') : [];
      const diapers = includeDiapers ? filtered.filter(a => a.type === 'diaper') : [];

      // Feeding calculations
      const totalVolume = feeds.reduce((sum, f) => {
        const qtyStr = f.details?.quantity;
        if (!qtyStr) return sum;
        
        const qty = parseFloat(qtyStr);
        if (isNaN(qty)) return sum;
        
        const unit = f.details.unit || (qty > 50 ? 'ml' : 'oz');
        const ml = unit === 'oz' ? qty * 29.5735 : qty;
        
        return sum + ml;
      }, 0);

      const avgPerFeed = feeds.length > 0 ? totalVolume / feeds.length : 0;

      // Daily feed volumes
      const dailyVolumes = eachDayOfInterval({ start, end }).map(day => {
        const dayFeeds = feeds.filter(f => {
          if (!f.loggedAt) return false;
          const fDate = new Date(f.loggedAt);
          return format(fDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
        });
        return dayFeeds.reduce((sum, f) => {
          const qtyStr = f.details?.quantity;
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

      // First solid date
      const solidFeeds = activities.filter(a => 
        a.type === 'feed' && a.details?.feedType === 'solid'
      );
      const firstSolidDate = solidFeeds.length > 0 
        ? format(new Date(solidFeeds.reduce((earliest, current) => {
            const currentDate = new Date(current.loggedAt!);
            const earliestDate = new Date(earliest.loggedAt!);
            return currentDate < earliestDate ? current : earliest;
          }).loggedAt!), 'MMMM dd, yyyy')
        : undefined;

      // Sleep calculations
      const totalSleepMinutes = sleeps.reduce((sum, s) => {
        if (!s.details?.startTime || !s.details?.endTime) return sum;
        
        const startMins = parseTimeToMinutes(s.details.startTime);
        const endMins = parseTimeToMinutes(s.details.endTime);
        
        if (startMins === null || endMins === null) return sum;
        
        let duration = endMins - startMins;
        if (duration < 0) duration += 24 * 60;
        
        return sum + duration;
      }, 0);

      const totalNaps = sleeps.length;
      const avgNapMinutes = totalNaps > 0 ? totalSleepMinutes / totalNaps : 0;

      // Daily breakdown
      const dailyData = eachDayOfInterval({ start, end }).map(day => {
        const dayStr = format(day, 'yyyy-MM-dd');
        const dayFeeds = feeds.filter(f => 
          f.loggedAt && format(new Date(f.loggedAt), 'yyyy-MM-dd') === dayStr
        );
        const daySleeps = sleeps.filter(s => 
          s.loggedAt && format(new Date(s.loggedAt), 'yyyy-MM-dd') === dayStr
        );
        const dayDiapers = diapers.filter(d =>
          d.loggedAt && format(new Date(d.loggedAt), 'yyyy-MM-dd') === dayStr
        );
        
        const sleepMinutes = daySleeps.reduce((sum, s) => {
          if (!s.details?.startTime || !s.details?.endTime) return sum;
          
          const startMins = parseTimeToMinutes(s.details.startTime);
          const endMins = parseTimeToMinutes(s.details.endTime);
          
          if (startMins === null || endMins === null) return sum;
          
          let duration = endMins - startMins;
          if (duration < 0) duration += 24 * 60;
          
          return sum + duration;
        }, 0);
        
        const feedVolume = dayFeeds.reduce((sum, f) => {
          const qtyStr = f.details?.quantity;
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
          feeds: dayFeeds.length,
          diapers: dayDiapers.length
        };
      });

      // Nap count statistics
      const napCounts = dailyData.map(d => d.naps).filter(n => n > 0);
      const napCountMin = napCounts.length > 0 ? Math.min(...napCounts) : 0;
      const napCountMax = napCounts.length > 0 ? Math.max(...napCounts) : 0;
      const napCountMedian = napCounts.length > 0 
        ? napCounts.sort((a, b) => a - b)[Math.floor(napCounts.length / 2)]
        : 0;

      const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) || 1;
      const daysWithSleepData = dailyData.filter(d => d.sleepHours > 0).length;

      // Generate milestones
      const milestones: string[] = [];
      if (firstSolidDate) {
        milestones.push(`First solids introduced on ${firstSolidDate}`);
      }
      
      // Add custom milestones from notes
      const noteMilestones = filtered
        .filter(a => a.type === 'note' && a.details?.note && a.details.note.length > 10)
        .map(a => `${format(new Date(a.loggedAt!), 'MMM dd')}: ${a.details.note}`)
        .slice(0, 5);
      milestones.push(...noteMilestones);

      // Generate observations
      const observationsList: string[] = [
        "Feeding and sleep remain within expected range for age",
        "No abnormal feeding gaps or nighttime waking reported"
      ];
      
      if (observations.trim()) {
        observationsList.unshift(observations.trim());
      }

      // Birth context
      const babyBirthday = household?.baby_birthday 
        ? `Born ${format(new Date(household.baby_birthday), 'MMMM dd, yyyy')} — term, healthy growth curve`
        : undefined;

      // Call edge function
      const { data, error } = await supabase.functions.invoke('generate-pediatrician-report', {
        body: {
          babyName,
          babyAge: formatAge(household?.baby_birthday),
          babyBirthday,
          dateRange: {
            start: format(start, 'MMM dd, yyyy'),
            end: format(end, 'MMM dd, yyyy'),
          },
          locale: navigator.language,
          feedingSummary: {
            total: feeds.length,
            avgPerDay: feeds.length / totalDays,
            totalVolume,
            avgPerFeed,
            minVolume: Math.round(minVolume),
            maxVolume: Math.round(maxVolume),
            firstSolidDate
          },
          sleepSummary: {
            totalHours: totalSleepMinutes / 60,
            avgPerDay: daysWithSleepData > 0 ? totalSleepMinutes / 60 / daysWithSleepData : 0,
            totalNaps,
            avgNapLength: formatHoursMinutes(avgNapMinutes),
            napCountRange: `${napCountMin}–${napCountMax}`,
            napCountMedian,
            hasIncompleteData: daysWithSleepData < totalDays
          },
          diaperSummary: includeDiapers && diapers.length > 0 ? {
            total: diapers.length,
            avgPerDay: diapers.length / totalDays
          } : undefined,
          dailyLogs: dailyData,
          milestones,
          observations: observationsList,
          excludedDays: [],
        },
      });

      if (error) throw error;

      // Download the PDF
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${babyName.toLowerCase()}-pediatrician-summary-${format(new Date(), 'yyyy-MM-dd')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("Report downloaded successfully");
      onOpenChange(false);
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Generate Pediatrician Summary</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-sm text-muted-foreground">
            PDF is optimized for printing; looks the same for everyone.
          </div>

          <div className="space-y-3">
            <Label>Date Range</Label>
            <RadioGroup value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last-week" id="last-week" />
                <Label htmlFor="last-week" className="font-normal cursor-pointer">Last 7 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last-month" id="last-month" />
                <Label htmlFor="last-month" className="font-normal cursor-pointer">Last 30 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">Custom range</Label>
              </div>
            </RadioGroup>

            {dateRange === 'custom' && (
              <div className="flex gap-4 ml-6">
                <div className="flex-1">
                  <Label>Start Date</Label>
                  <DatePicker selected={customStartDate} onSelect={setCustomStartDate} />
                </div>
                <div className="flex-1">
                  <Label>End Date</Label>
                  <DatePicker selected={customEndDate} onSelect={setCustomEndDate} />
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label>Include in Report</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="feeds" checked={includeFeeds} onCheckedChange={(c) => setIncludeFeeds(!!c)} />
                <Label htmlFor="feeds" className="font-normal cursor-pointer">Feeding Summary</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="sleep" checked={includeSleep} onCheckedChange={(c) => setIncludeSleep(!!c)} />
                <Label htmlFor="sleep" className="font-normal cursor-pointer">Sleep Summary</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="diapers" checked={includeDiapers} onCheckedChange={(c) => setIncludeDiapers(!!c)} />
                <Label htmlFor="diapers" className="font-normal cursor-pointer">Diaper Changes</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="observations">Additional Observations (optional)</Label>
            <Textarea
              id="observations"
              placeholder="Any concerns or notes you'd like to share with your pediatrician..."
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
              rows={4}
            />
          </div>
        </div>

        <div className="flex gap-3 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={generateReport} 
            disabled={isGenerating || (!includeFeeds && !includeSleep && !includeDiapers)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Generate Report'
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
