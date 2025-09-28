import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

interface SleepChartControlsProps {
  showFullDay: boolean;
  onToggleFullDay: (show: boolean) => void;
  currentWeekOffset: number;
  onWeekChange: (offset: number) => void;
}

export const SleepChartControls = ({ 
  showFullDay, 
  onToggleFullDay, 
  currentWeekOffset, 
  onWeekChange 
}: SleepChartControlsProps) => {
  const getWeekLabel = (offset: number) => {
    if (offset === 0) return "This Week";
    if (offset === 1) return "Last Week";
    return `${offset} weeks ago`;
  };

  return (
    <div className="flex justify-between items-center mb-4">
      <div className="flex gap-2">
        <Button
          variant={showFullDay ? "default" : "outline"}
          size="sm"
          onClick={() => onToggleFullDay(!showFullDay)}
          className="text-xs"
        >
          {showFullDay ? "24 Hour" : "Daytime"}
        </Button>
      </div>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="text-xs">
            {getWeekLabel(currentWeekOffset)}
            <ChevronDown className="h-3 w-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {[0, 1, 2, 3, 4].map((offset) => (
            <DropdownMenuItem
              key={offset}
              onClick={() => onWeekChange(offset)}
              className={currentWeekOffset === offset ? "bg-accent" : ""}
            >
              {getWeekLabel(offset)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};