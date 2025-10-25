import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Activity } from "@/components/ActivityCard";
import { useToast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

interface ExportReportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  babyName?: string;
}

export const ExportReportModal = ({ open, onOpenChange, activities, babyName }: ExportReportModalProps) => {
  const { toast } = useToast();
  const [range, setRange] = useState<"this-week" | "last-7-days" | "custom">("this-week");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [includeFeedTotals, setIncludeFeedTotals] = useState(true);
  const [includeSleepTotals, setIncludeSleepTotals] = useState(true);
  const [includeNapsSummary, setIncludeNapsSummary] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (range) {
      case "this-week":
        // Start of current week (Sunday)
        startDate = new Date(now);
        startDate.setDate(now.getDate() - now.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case "last-7-days":
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        break;
      case "custom":
        if (!customStartDate || !customEndDate) return null;
        startDate = customStartDate;
        endDate = customEndDate;
        break;
      default:
        return null;
    }

    return { startDate, endDate };
  };

  const filterActivitiesByDate = () => {
    const dateRange = getDateRange();
    if (!dateRange) return [];

    const { startDate, endDate } = dateRange;
    return activities.filter(activity => {
      const activityDate = new Date(activity.loggedAt!);
      return activityDate >= startDate && activityDate <= endDate;
    });
  };

  const parseTimeToMinutes = (timeStr: string) => {
    const [time, period] = timeStr.split(' ');
    const [hStr, mStr] = time.split(':');
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr || '0', 10);
    if (period === 'PM' && h !== 12) h += 12;
    if (period === 'AM' && h === 12) h = 0;
    return h * 60 + m;
  };

  const generateReport = async () => {
    const dateRange = getDateRange();
    if (!dateRange) {
      toast({
        title: "Invalid Date Range",
        description: "Please select a valid date range.",
        variant: "destructive"
      });
      return;
    }

    if (range === "custom" && (!customStartDate || !customEndDate)) {
      toast({
        title: "Missing Dates",
        description: "Please select both start and end dates for custom range.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);

    try {
      const filteredActivities = filterActivitiesByDate();
      const { startDate, endDate } = dateRange;

      // Initialize PDF
      const pdf = new jsPDF();
      const pageWidth = pdf.internal.pageSize.getWidth();
      let yPosition = 20;

      // Header with branding
      pdf.setFontSize(24);
      pdf.setTextColor(99, 102, 241); // Primary color
      pdf.text("Baby Activity Report", pageWidth / 2, yPosition, { align: "center" });
      yPosition += 10;

      pdf.setFontSize(12);
      pdf.setTextColor(100, 116, 139);
      pdf.text(
        `${format(startDate, "MMM dd, yyyy")} - ${format(endDate, "MMM dd, yyyy")}`,
        pageWidth / 2,
        yPosition,
        { align: "center" }
      );
      yPosition += 15;

      if (babyName) {
        pdf.setFontSize(14);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`For: ${babyName}`, 20, yPosition);
        yPosition += 15;
      }

      // Summary Section
      pdf.setFontSize(16);
      pdf.setTextColor(15, 23, 42);
      pdf.text("Summary", 20, yPosition);
      yPosition += 10;

      // Feed Totals
      if (includeFeedTotals) {
        const feeds = filteredActivities.filter(a => a.type === 'feed');
        const totalFeeds = feeds.length;
        const totalOz = feeds.reduce((sum, feed) => {
          const qty = parseFloat(feed.details?.quantity || '0');
          const unit = feed.details?.unit || 'ml';
          return sum + (unit === 'oz' ? qty : qty / 29.5735); // Convert ml to oz
        }, 0);

        pdf.setFontSize(12);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`Feed Totals:`, 25, yPosition);
        yPosition += 7;
        pdf.setFontSize(10);
        pdf.setTextColor(71, 85, 105);
        pdf.text(`• Total feeds: ${totalFeeds}`, 30, yPosition);
        yPosition += 6;
        pdf.text(`• Total volume: ${totalOz.toFixed(1)} oz`, 30, yPosition);
        yPosition += 6;
        pdf.text(`• Average per feed: ${totalFeeds > 0 ? (totalOz / totalFeeds).toFixed(1) : 0} oz`, 30, yPosition);
        yPosition += 10;
      }

      // Sleep Totals
      if (includeSleepTotals) {
        const naps = filteredActivities.filter(a => a.type === 'nap' && a.details?.endTime);
        const totalNaps = naps.length;
        const totalSleepMinutes = naps.reduce((sum, nap) => {
          const startMinutes = parseTimeToMinutes(nap.details.startTime || nap.time);
          const endMinutes = parseTimeToMinutes(nap.details.endTime!);
          const duration = endMinutes >= startMinutes
            ? endMinutes - startMinutes
            : (24 * 60) - startMinutes + endMinutes;
          return sum + duration;
        }, 0);
        const avgSleepMinutes = totalNaps > 0 ? totalSleepMinutes / totalNaps : 0;

        pdf.setFontSize(12);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`Sleep Totals:`, 25, yPosition);
        yPosition += 7;
        pdf.setFontSize(10);
        pdf.setTextColor(71, 85, 105);
        pdf.text(`• Total naps: ${totalNaps}`, 30, yPosition);
        yPosition += 6;
        pdf.text(`• Total sleep: ${Math.floor(totalSleepMinutes / 60)}h ${totalSleepMinutes % 60}m`, 30, yPosition);
        yPosition += 6;
        pdf.text(`• Average nap: ${Math.floor(avgSleepMinutes / 60)}h ${Math.round(avgSleepMinutes % 60)}m`, 30, yPosition);
        yPosition += 10;
      }

      // Naps Summary
      if (includeNapsSummary && yPosition < 250) {
        const naps = filteredActivities.filter(a => a.type === 'nap' && a.details?.endTime);
        if (naps.length > 0) {
          pdf.setFontSize(12);
          pdf.setTextColor(15, 23, 42);
          pdf.text(`Nap Pattern:`, 25, yPosition);
          yPosition += 7;
          pdf.setFontSize(10);
          pdf.setTextColor(71, 85, 105);

          // Find longest nap
          let longestNap = 0;
          naps.forEach(nap => {
            const startMinutes = parseTimeToMinutes(nap.details.startTime || nap.time);
            const endMinutes = parseTimeToMinutes(nap.details.endTime!);
            const duration = endMinutes >= startMinutes
              ? endMinutes - startMinutes
              : (24 * 60) - startMinutes + endMinutes;
            if (duration > longestNap) longestNap = duration;
          });

          pdf.text(`• Longest nap: ${Math.floor(longestNap / 60)}h ${longestNap % 60}m`, 30, yPosition);
          yPosition += 6;

          // Nap consistency insight
          const napDurations = naps.map(nap => {
            const startMinutes = parseTimeToMinutes(nap.details.startTime || nap.time);
            const endMinutes = parseTimeToMinutes(nap.details.endTime!);
            return endMinutes >= startMinutes
              ? endMinutes - startMinutes
              : (24 * 60) - startMinutes + endMinutes;
          });
          const avgDuration = napDurations.reduce((a, b) => a + b, 0) / napDurations.length;
          const variance = napDurations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / napDurations.length;
          const consistency = variance < 900 ? "Consistent" : variance < 2500 ? "Moderate variation" : "Varied";

          pdf.text(`• Pattern: ${consistency}`, 30, yPosition);
          yPosition += 10;
        }
      }

      // Notes
      if (includeNotes && yPosition < 240) {
        const notes = filteredActivities.filter(a => a.type === 'note' && a.details?.note);
        if (notes.length > 0) {
          pdf.setFontSize(12);
          pdf.setTextColor(15, 23, 42);
          pdf.text(`Notes (${notes.length}):`, 25, yPosition);
          yPosition += 7;
          pdf.setFontSize(9);
          pdf.setTextColor(71, 85, 105);

          notes.slice(0, 5).forEach(note => {
            if (yPosition > 270) return; // Avoid overflow
            const noteText = `• ${note.time}: ${note.details.note}`;
            const lines = pdf.splitTextToSize(noteText, pageWidth - 40);
            lines.slice(0, 2).forEach((line: string) => {
              pdf.text(line, 30, yPosition);
              yPosition += 5;
            });
            yPosition += 2;
          });

          if (notes.length > 5) {
            pdf.text(`...and ${notes.length - 5} more notes`, 30, yPosition);
            yPosition += 8;
          }
        }
      }

      // Insights Section
      if (yPosition < 220) {
        yPosition += 5;
        pdf.setFontSize(16);
        pdf.setTextColor(15, 23, 42);
        pdf.text("What Changed", 20, yPosition);
        yPosition += 8;
        pdf.setFontSize(10);
        pdf.setTextColor(71, 85, 105);

        const feeds = filteredActivities.filter(a => a.type === 'feed').length;
        const naps = filteredActivities.filter(a => a.type === 'nap' && a.details?.endTime).length;

        // Simple pattern analysis
        const insight = feeds > naps * 2
          ? "Feed-focused period with active eating patterns"
          : naps > feeds
            ? "Rest-heavy period with consolidated sleep"
            : "Balanced rhythm between feeding and rest";

        const wrappedInsight = pdf.splitTextToSize(insight, pageWidth - 40);
        wrappedInsight.forEach((line: string) => {
          if (yPosition < 280) {
            pdf.text(line, 25, yPosition);
            yPosition += 6;
          }
        });

        yPosition += 5;
        pdf.text("Next Steps:", 25, yPosition);
        yPosition += 6;
        pdf.text("• Continue tracking patterns to identify trends", 30, yPosition);
        yPosition += 5;
        pdf.text("• Watch for changes in sleep duration or feeding frequency", 30, yPosition);
      }

      // Footer
      pdf.setFontSize(8);
      pdf.setTextColor(148, 163, 184);
      pdf.text(
        `Generated on ${format(new Date(), "MMM dd, yyyy 'at' h:mm a")}`,
        pageWidth / 2,
        285,
        { align: "center" }
      );

      // Generate PDF and share
      const fileName = `${babyName || 'baby'}-report-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.pdf`;
      
      try {
        if (Capacitor.isNativePlatform()) {
          // Convert PDF to blob and share using Capacitor
          const pdfBlob = pdf.output('blob');
          const reader = new FileReader();
          reader.onloadend = async () => {
            const base64data = reader.result as string;
            await Share.share({
              title: `${babyName || 'Baby'} Activity Report`,
              text: `Activity report for ${format(startDate, 'MMM dd')} - ${format(endDate, 'MMM dd')}`,
              url: base64data,
              dialogTitle: 'Share Report'
            });
          };
          reader.readAsDataURL(pdfBlob);
        } else {
          // Fallback to download for web
          pdf.save(fileName);
        }

        toast({
          title: "Report Generated",
          description: Capacitor.isNativePlatform() ? "Share dialog opened" : "Your activity report has been downloaded.",
        });
      } catch (shareError) {
        console.error("Error sharing:", shareError);
        // Fallback to download if share fails
        pdf.save(fileName);
        toast({
          title: "Report Downloaded",
          description: "Your activity report has been downloaded.",
        });
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the report. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Activity Report</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Range Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Range</Label>
            <RadioGroup value={range} onValueChange={(value: any) => setRange(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="this-week" id="this-week" />
                <Label htmlFor="this-week" className="font-normal cursor-pointer">
                  This Week
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last-7-days" id="last-7-days" />
                <Label htmlFor="last-7-days" className="font-normal cursor-pointer">
                  Last 7 Days
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">
                  Custom Range
                </Label>
              </div>
            </RadioGroup>

            {range === "custom" && (
              <div className="flex gap-2 mt-3">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !customStartDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "PPP") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("justify-start text-left font-normal", !customEndDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "PPP") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} initialFocus className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Include Options */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Include</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox id="feed-totals" checked={includeFeedTotals} onCheckedChange={(checked) => setIncludeFeedTotals(!!checked)} />
                <Label htmlFor="feed-totals" className="font-normal cursor-pointer">
                  Feed totals
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="sleep-totals" checked={includeSleepTotals} onCheckedChange={(checked) => setIncludeSleepTotals(!!checked)} />
                <Label htmlFor="sleep-totals" className="font-normal cursor-pointer">
                  Sleep totals
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="naps-summary" checked={includeNapsSummary} onCheckedChange={(checked) => setIncludeNapsSummary(!!checked)} />
                <Label htmlFor="naps-summary" className="font-normal cursor-pointer">
                  Naps summary
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox id="notes" checked={includeNotes} onCheckedChange={(checked) => setIncludeNotes(!!checked)} />
                <Label htmlFor="notes" className="font-normal cursor-pointer">
                  Notes (if any)
                </Label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={generateReport} disabled={isGenerating} className="gap-2">
            <Download className="h-4 w-4" />
            {isGenerating ? "Generating..." : "Create Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
