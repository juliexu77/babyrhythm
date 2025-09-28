import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface SleepChartControlsProps {
  currentWeekOffset: number;
  setCurrentWeekOffset: (offset: number) => void;
  showFullDay: boolean;
  setShowFullDay: (show: boolean) => void;
}

export const SleepChartControls = ({ 
  currentWeekOffset, 
  setCurrentWeekOffset, 
  showFullDay, 
  setShowFullDay 
}: SleepChartControlsProps) => {
  // Get available week options
  const getWeekOptions = () => {
    const options = [];
    for (let i = 0; i < 12; i++) { // Show up to 12 weeks back
      if (i === 0) {
        options.push({ label: "This Week", value: 0 });
      } else if (i === 1) {
        options.push({ label: "Last Week", value: 1 });
      } else {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        const startOfWeek = new Date(date);
        startOfWeek.setDate(date.getDate() - date.getDay());
        options.push({ 
          label: startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
          value: i 
        });
      }
    }
    return options;
  };

  const weekOptions = getWeekOptions();
  const currentWeekLabel = weekOptions.find(option => option.value === currentWeekOffset)?.label || "This Week";

  return (
    <div className="space-y-4">
      {/* Header with Sleep title and toggles */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-serif font-semibold text-foreground">Sleep</h2>
        
        <div className="flex items-center gap-2">
          {/* This Week / Last Week buttons */}
          <div className="flex bg-muted/30 rounded-lg p-1">
            <Button
              variant={currentWeekOffset === 0 ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentWeekOffset(0)}
              className="h-8 px-3 rounded-md"
            >
              This Week
            </Button>
            <Button
              variant={currentWeekOffset === 1 ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentWeekOffset(1)}
              className="h-8 px-3 rounded-md"
            >
              Last Week
            </Button>
          </div>

          {/* Additional weeks dropdown */}
          {currentWeekOffset > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  {currentWeekLabel}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-popover border border-border">
                {weekOptions.slice(2).map((option) => (
                  <DropdownMenuItem 
                    key={option.value}
                    onClick={() => setCurrentWeekOffset(option.value)}
                    className={currentWeekOffset === option.value ? "bg-accent" : ""}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Show full day toggle */}
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowFullDay(!showFullDay)}
          className="text-muted-foreground text-sm hover:text-foreground"
        >
          {showFullDay ? "Show condensed (6am-9pm)" : "Show full day (12am-12am)"}
        </Button>
      </div>
    </div>
  );
};