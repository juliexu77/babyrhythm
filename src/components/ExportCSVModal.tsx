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

interface ExportCSVModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activities: Activity[];
  babyName?: string;
}

export const ExportCSVModal = ({ open, onOpenChange, activities, babyName }: ExportCSVModalProps) => {
  const { toast } = useToast();
  const [range, setRange] = useState<"this-week" | "last-7-days" | "custom">("this-week");
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [selectedTypes, setSelectedTypes] = useState<string[]>(['feed', 'nap', 'diaper', 'note', 'solids']);
  const [isGenerating, setIsGenerating] = useState(false);

  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    let endDate: Date = now;

    switch (range) {
      case "this-week":
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
      if (!selectedTypes.includes(activity.type)) return false;
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

  const generateCSV = () => {
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

      if (filteredActivities.length === 0) {
        toast({
          title: "No Data",
          description: "No activities found for the selected date range and types.",
          variant: "destructive"
        });
        setIsGenerating(false);
        return;
      }

      // Sort activities by date
      const sortedActivities = [...filteredActivities].sort((a, b) => {
        return new Date(a.loggedAt!).getTime() - new Date(b.loggedAt!).getTime();
      });

      // CSV Headers
      const headers = [
        'Date',
        'Time',
        'Activity Type',
        'Details',
        'Duration',
        'Volume/Quantity',
        'Unit',
        'Notes'
      ];

      // Generate CSV rows
      const rows = sortedActivities.map(activity => {
        const date = format(new Date(activity.loggedAt!), 'yyyy-MM-dd');
        const time = activity.details?.displayTime || activity.time;
        const type = activity.type.charAt(0).toUpperCase() + activity.type.slice(1);
        
        let details = '';
        let duration = '';
        let volume = '';
        let unit = '';
        let notes = '';

        switch (activity.type) {
          case 'feed':
            volume = activity.details?.quantity || '';
            unit = activity.details?.unit || '';
            details = activity.details?.feedType || '';
            notes = activity.details?.note || '';
            break;
          case 'nap':
            if (activity.details?.startTime && activity.details?.endTime) {
              const startMins = parseTimeToMinutes(activity.details.startTime);
              const endMins = parseTimeToMinutes(activity.details.endTime);
              let durationMins = endMins - startMins;
              if (durationMins < 0) durationMins += 24 * 60;
              const hours = Math.floor(durationMins / 60);
              const mins = durationMins % 60;
              duration = `${hours}h ${mins}m`;
              details = `${activity.details.startTime} - ${activity.details.endTime}`;
            }
            notes = activity.details?.note || '';
            break;
          case 'diaper':
            const diaperType = activity.details?.diaperType;
            if (diaperType === 'both') {
              details = 'Poopy, Wet';
            } else if (diaperType === 'poopy') {
              details = 'Poopy';
            } else if (diaperType === 'wet') {
              details = 'Wet';
            }
            notes = activity.details?.note || '';
            break;
          case 'note':
            notes = activity.details?.note || '';
            break;
          case 'solids':
            details = activity.details?.solidDescription || '';
            notes = activity.details?.note || '';
            break;
        }

        // Escape CSV values (handle commas and quotes)
        const escapeCSV = (val: string) => {
          if (val.includes(',') || val.includes('"') || val.includes('\n')) {
            return `"${val.replace(/"/g, '""')}"`;
          }
          return val;
        };

        return [
          date,
          time,
          type,
          escapeCSV(details),
          duration,
          volume,
          unit,
          escapeCSV(notes)
        ].join(',');
      });

      // Combine headers and rows
      const csvContent = [headers.join(','), ...rows].join('\n');

      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      const fileName = `${babyName || 'baby'}-activities-${format(startDate, 'yyyy-MM-dd')}-to-${format(endDate, 'yyyy-MM-dd')}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', fileName);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "CSV Downloaded",
        description: `Successfully exported ${sortedActivities.length} activities.`,
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Error generating CSV:', error);
      toast({
        title: "Export Failed",
        description: "There was an error generating the CSV file.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleActivityType = (type: string) => {
    setSelectedTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            Export to CSV
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Date Range Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Date Range</Label>
            <RadioGroup value={range} onValueChange={(value: any) => setRange(value)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="this-week" id="csv-this-week" />
                <Label htmlFor="csv-this-week" className="font-normal cursor-pointer">This week</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last-7-days" id="csv-last-7-days" />
                <Label htmlFor="csv-last-7-days" className="font-normal cursor-pointer">Last 7 days</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="csv-custom" />
                <Label htmlFor="csv-custom" className="font-normal cursor-pointer">Custom range</Label>
              </div>
            </RadioGroup>

            {range === "custom" && (
              <div className="flex gap-2 pl-6">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "MMM dd") : "Start"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "flex-1 justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "MMM dd") : "End"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Activity Type Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Include Activities</Label>
            <div className="space-y-2">
              {[
                { id: 'feed', label: 'Feeds' },
                { id: 'nap', label: 'Naps' },
                { id: 'diaper', label: 'Diapers' },
                { id: 'note', label: 'Notes' },
                { id: 'solids', label: 'Solids' }
              ].map(type => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`csv-${type.id}`}
                    checked={selectedTypes.includes(type.id)}
                    onCheckedChange={() => toggleActivityType(type.id)}
                  />
                  <Label htmlFor={`csv-${type.id}`} className="font-normal cursor-pointer">
                    {type.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <Button
            onClick={generateCSV}
            disabled={isGenerating || selectedTypes.length === 0}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Generating...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download CSV
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};