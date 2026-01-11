type TimeRange = '1week' | '6weeks' | '3months';

interface TimeRangeSwitcherProps {
  timeRange: TimeRange;
  onTimeRangeChange: (range: TimeRange) => void;
}

export const TimeRangeSwitcher = ({ timeRange, onTimeRangeChange }: TimeRangeSwitcherProps) => {
  const ranges: TimeRange[] = ['1week', '6weeks', '3months'];
  const labels: Record<TimeRange, string> = {
    '1week': '1W',
    '6weeks': '6W',
    '3months': '3M'
  };

  return (
    <div className="bg-card py-4">
      <div className="flex justify-center px-4">
        <div className="inline-flex bg-muted rounded-strava-sm p-0.5">
          {ranges.map((range) => (
            <button
              key={range}
              onClick={() => onTimeRangeChange(range)}
              className={`
                px-4 py-1.5 text-[10px] font-semibold tracking-wide rounded-strava-sm transition-all duration-200
                ${timeRange === range 
                  ? 'bg-background text-foreground shadow-sm' 
                  : 'text-muted-foreground hover:text-foreground'
                }
              `}
            >
              {labels[range]}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
