import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

interface ReportConfigModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (config: ReportConfig) => void;
  babyName?: string;
}

export interface ReportConfig {
  dateRange: 'this-week' | 'last-week' | 'custom';
  customStartDate?: Date;
  customEndDate?: Date;
  includeFeeds: boolean;
  includeSleep: boolean;
  includeDiapers: boolean;
  includeNotes: boolean;
  hideOutliers: boolean;
}

export function ReportConfigModal({ open, onOpenChange, onGenerate, babyName }: ReportConfigModalProps) {
  const [dateRange, setDateRange] = useState<'this-week' | 'last-week' | 'custom'>('this-week');
  const [customStartDate, setCustomStartDate] = useState<Date>();
  const [customEndDate, setCustomEndDate] = useState<Date>();
  const [includeFeeds, setIncludeFeeds] = useState(true);
  const [includeSleep, setIncludeSleep] = useState(true);
  const [includeDiapers, setIncludeDiapers] = useState(false);
  const [includeNotes, setIncludeNotes] = useState(false);
  const [hideOutliers, setHideOutliers] = useState(false);

  const handleGenerate = () => {
    onGenerate({
      dateRange,
      customStartDate,
      customEndDate,
      includeFeeds,
      includeSleep,
      includeDiapers,
      includeNotes,
      hideOutliers
    });
  };

  const canGenerate = 
    (dateRange !== 'custom' || (customStartDate && customEndDate)) &&
    (includeFeeds || includeSleep || includeDiapers || includeNotes);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Generate Report for {babyName || 'Baby'}</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Date Range Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Date Range</Label>
            <RadioGroup value={dateRange} onValueChange={(v: any) => setDateRange(v)}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="this-week" id="this-week" />
                <Label htmlFor="this-week" className="font-normal cursor-pointer">This Week</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="last-week" id="last-week" />
                <Label htmlFor="last-week" className="font-normal cursor-pointer">Last Week</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="custom" id="custom" />
                <Label htmlFor="custom" className="font-normal cursor-pointer">Custom Range</Label>
              </div>
            </RadioGroup>

            {/* Custom Date Range Pickers */}
            {dateRange === 'custom' && (
              <div className="ml-6 space-y-3 pt-2">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Start Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customStartDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, "PPP") : "Pick start date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customStartDate}
                        onSelect={setCustomStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        disabled={(date) => date > new Date()}
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">End Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !customEndDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, "PPP") : "Pick end date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={customEndDate}
                        onSelect={setCustomEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                        disabled={(date) => date > new Date() || (customStartDate && date < customStartDate)}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            )}
          </div>

          {/* Activity Selection */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Include in Report</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="feeds" 
                  checked={includeFeeds} 
                  onCheckedChange={(checked) => setIncludeFeeds(checked as boolean)}
                />
                <Label htmlFor="feeds" className="font-normal cursor-pointer">Feeding Summary</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sleep" 
                  checked={includeSleep} 
                  onCheckedChange={(checked) => setIncludeSleep(checked as boolean)}
                />
                <Label htmlFor="sleep" className="font-normal cursor-pointer">Sleep Summary</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="diapers" 
                  checked={includeDiapers} 
                  onCheckedChange={(checked) => setIncludeDiapers(checked as boolean)}
                />
                <Label htmlFor="diapers" className="font-normal cursor-pointer">Diaper Summary</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="notes" 
                  checked={includeNotes} 
                  onCheckedChange={(checked) => setIncludeNotes(checked as boolean)}
                />
                <Label htmlFor="notes" className="font-normal cursor-pointer">Notes</Label>
              </div>
            </div>
          </div>

          {/* Data Quality Options */}
          <div className="space-y-3">
            <Label className="text-sm font-semibold">Data Quality</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="hide-outliers" 
                  checked={hideOutliers} 
                  onCheckedChange={(checked) => setHideOutliers(checked as boolean)}
                />
                <Label htmlFor="hide-outliers" className="font-normal cursor-pointer">
                  Hide incomplete days
                </Label>
              </div>
              <p className="text-xs text-muted-foreground ml-6">
                Exclude days with significantly less data than average (e.g., days where logging was incomplete)
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Cancel
          </Button>
          <Button onClick={handleGenerate} disabled={!canGenerate} className="flex-1">
            Generate Report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
