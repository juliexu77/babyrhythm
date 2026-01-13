import { useState, useMemo } from "react";
import { Activity } from "@/types/activity";
import { Button } from "@/components/ui/button";
import { Filter, Plane, Sun, Loader2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SwipeableActivityCard } from "@/components/SwipeableActivityCard";
import { detectMilestones } from "@/utils/milestoneDetection";
import { supabase } from "@/integrations/supabase/client";

const allActivityTypes = ['feed', 'diaper', 'nap', 'note', 'solids', 'photo'];

// Progressive loading constants
const INITIAL_DAYS = 7;
const LOAD_MORE_INCREMENT = 14;

interface HistoryTabProps {
  activities: Activity[];
  babyName?: string;
  travelDayDates: string[];
  onEditActivity: (activity: Activity) => void;
  onDeleteActivity: (activityId: string) => Promise<void>;
  onToggleTravelDay: (dateKey: string) => Promise<boolean | void>;
  isTravelDay: (dateKey: string) => boolean;
  onShowPediatricianReport: () => void;
  onShowCSVExport: () => void;
  trackDelete: (activity: any) => void;
}

export const HistoryTab = ({
  activities,
  babyName,
  travelDayDates,
  onEditActivity,
  onDeleteActivity,
  onToggleTravelDay,
  isTravelDay,
  onShowPediatricianReport,
  onShowCSVExport,
  trackDelete
}: HistoryTabProps) => {
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>(allActivityTypes);
  const [pendingActivityTypes, setPendingActivityTypes] = useState<string[]>(allActivityTypes);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [visibleDaysCount, setVisibleDaysCount] = useState(INITIAL_DAYS);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const hasActiveFilters = selectedActivityTypes.length !== allActivityTypes.length;

  // Filter activities by selected types
  const filteredActivities = useMemo(() => 
    activities.filter(activity => selectedActivityTypes.includes(activity.type)),
    [activities, selectedActivityTypes]
  );

  // Group activities by date
  const activityGroups = useMemo(() => {
    const groups: { [date: string]: Activity[] } = {};
    
    filteredActivities.forEach(activity => {
      const activityDate = new Date(activity.loggedAt!);
      const y = activityDate.getFullYear();
      const m = String(activityDate.getMonth() + 1).padStart(2, '0');
      const d = String(activityDate.getDate()).padStart(2, '0');
      const localDateString = `${y}-${m}-${d}`;
      
      if (!groups[localDateString]) {
        groups[localDateString] = [];
      }
      groups[localDateString].push(activity);
    });

    // Generate date keys for visible days (ensure we have entries for recent dates even if empty)
    const nowDate = new Date();
    for (let i = 0; i < Math.min(visibleDaysCount, 14); i++) {
      const d = new Date(nowDate);
      d.setDate(d.getDate() - i);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      if (!groups[key]) {
        groups[key] = [];
      }
    }

    // Sort activities within each date group
    Object.keys(groups).forEach(dateKey => {
      groups[dateKey].sort((a, b) => {
        const getActivityTime = (activity: any) => {
          try {
            const parseUI12hToMinutes = (timeStr?: string | null): number | null => {
              if (!timeStr) return null;
              const first = timeStr.includes(' - ') ? timeStr.split(' - ')[0] : timeStr;
              const match = first.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
              if (!match) return null;
              let h = parseInt(match[1], 10);
              const mins = parseInt(match[2], 10);
              const period = match[3].toUpperCase();
              if (period === 'PM' && h !== 12) h += 12;
              if (period === 'AM' && h === 12) h = 0;
              return h * 60 + mins;
            };
            
            const base = new Date(activity.loggedAt!);
            let minutes: number | null = null;
            
            if (activity.type === 'nap' && activity.details?.startTime) {
              minutes = parseUI12hToMinutes(activity.details.startTime);
            } else if (activity.details?.displayTime) {
              minutes = parseUI12hToMinutes(activity.details.displayTime);
            }
            
            if (minutes !== null) {
              base.setHours(Math.floor(minutes / 60), minutes % 60, 0, 0);
            }
            return base.getTime();
          } catch (error) {
            return new Date(activity.loggedAt!).getTime();
          }
        };

        return getActivityTime(b) - getActivityTime(a);
      });
    });

    return groups;
  }, [filteredActivities, visibleDaysCount]);

  // Get all sorted dates and limit to visible count
  const { visibleDates, totalDaysWithData, hasMoreDays } = useMemo(() => {
    const allDates = Object.keys(activityGroups).sort((a, b) => b.localeCompare(a));
    
    // Find the oldest date with activities
    const oldestActivityDate = activities.length > 0 
      ? activities.reduce((oldest, activity) => {
          const date = new Date(activity.loggedAt!);
          return date < oldest ? date : oldest;
        }, new Date())
      : new Date();
    
    // Calculate total possible days from today to oldest activity
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - oldestActivityDate.getTime());
    const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    return {
      visibleDates: allDates.slice(0, visibleDaysCount),
      totalDaysWithData: totalDays,
      hasMoreDays: visibleDaysCount < totalDays
    };
  }, [activityGroups, visibleDaysCount, activities]);

  const today = new Date();
  const yesterday = new Date(Date.now() - 86400000);
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const yesterdayKey = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

  const getDisplayDate = (dateKey: string) => {
    if (dateKey === todayKey) return 'Today';
    if (dateKey === yesterdayKey) return 'Yesterday';
    
    const [year, month, day] = dateKey.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString("en-US", { 
      weekday: "long", 
      month: "short", 
      day: "numeric" 
    });
  };

  // Detect night sleep wake-up for a date
  const getWakeUpInfo = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-').map(Number);
    const currentDate = new Date(year, month - 1, day);
    
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateKey = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}-${String(previousDate.getDate()).padStart(2, '0')}`;
    
    const currentDayActivities = activityGroups[dateKey] || [];
    const previousDayActivities = activityGroups[previousDateKey] || [];
    const activitiesToCheck = [...previousDayActivities, ...currentDayActivities];
    
    const nightSleep = activitiesToCheck.find(a => a.type === 'nap' && a.details?.isNightSleep && a.details?.endTime);
    const wakeTime = nightSleep?.details?.endTime || null;
    
    if (!nightSleep || !wakeTime) return null;
    
    const wakeTimeMatch = wakeTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!wakeTimeMatch) return null;
    
    let wakeHour = parseInt(wakeTimeMatch[1], 10);
    const wakePeriod = wakeTimeMatch[3].toUpperCase();
    if (wakePeriod === 'PM' && wakeHour !== 12) wakeHour += 12;
    if (wakePeriod === 'AM' && wakeHour === 12) wakeHour = 0;
    
    const startTime = nightSleep.details?.startTime;
    if (!startTime) return null;
    
    const startMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!startMatch) return null;
    
    let startHour = parseInt(startMatch[1], 10);
    const startPeriod = startMatch[3].toUpperCase();
    if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
    if (startPeriod === 'AM' && startHour === 12) startHour = 0;
    
    const crossedMidnight = startHour >= 18 && wakeHour < 12;
    
    const sleepLoggedDate = new Date(nightSleep.loggedAt!);
    const sleepDateKey = `${sleepLoggedDate.getFullYear()}-${String(sleepLoggedDate.getMonth() + 1).padStart(2, '0')}-${String(sleepLoggedDate.getDate()).padStart(2, '0')}`;
    
    const showWakeUpHere = (crossedMidnight && sleepDateKey === previousDateKey) || 
                          (!crossedMidnight && sleepDateKey === dateKey);
    
    return showWakeUpHere ? { nightSleep, wakeTime } : null;
  };

  const handleLoadMore = () => {
    setIsLoadingMore(true);
    // Simulate a brief delay for smooth UX
    setTimeout(() => {
      setVisibleDaysCount(prev => prev + LOAD_MORE_INCREMENT);
      setIsLoadingMore(false);
    }, 150);
  };

  const handleShowLess = () => {
    setVisibleDaysCount(INITIAL_DAYS);
    // Scroll to top of history
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const remainingDays = totalDaysWithData - visibleDaysCount;

  return (
    <div className="min-h-screen bg-background">
      {/* Action buttons */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center gap-4">
          <button 
            onClick={onShowPediatricianReport}
            className="text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            Report
          </button>
          <button 
            onClick={onShowCSVExport}
            className="text-sm font-semibold text-primary hover:opacity-80 transition-opacity"
          >
            Export
          </button>
        </div>
      </div>
      
      <p className="text-xs text-muted-foreground px-4 pb-3">
        Tap a date to mark as travel day
      </p>
      
      {/* Activities Timeline */}
      <div className="px-4 pb-20">
        <div className="space-y-4">
          {visibleDates.map((dateKey, index) => {
            const wakeInfo = getWakeUpInfo(dateKey);
            const dayActivities = activityGroups[dateKey] || [];

            return (
              <div key={dateKey} className="mb-4">
                <div className="bg-card rounded-strava border border-border overflow-hidden">
                  {/* Date Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <button
                      onClick={() => onToggleTravelDay(dateKey)}
                      className="flex items-center gap-2 group"
                    >
                      <h3 className={`text-xs font-semibold transition-colors ${
                        isTravelDay(dateKey) 
                          ? "text-primary" 
                          : "text-foreground group-hover:text-primary"
                      }`}>
                        {getDisplayDate(dateKey)}
                      </h3>
                      {isTravelDay(dateKey) && (
                        <Plane className="h-3.5 w-3.5 text-primary" />
                      )}
                    </button>
                    
                    {/* Filter Button - on first date only */}
                    {index === 0 && (
                      <DropdownMenu
                        open={showFilterDropdown} 
                        onOpenChange={(open) => {
                          setShowFilterDropdown(open);
                          if (open) setPendingActivityTypes(selectedActivityTypes);
                        }}
                      >
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative">
                            <Filter className="h-4 w-4" />
                            {hasActiveFilters && (
                              <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                          <div className="p-2 space-y-1">
                            {allActivityTypes.map(type => (
                              <DropdownMenuCheckboxItem
                                key={type}
                                checked={pendingActivityTypes.includes(type)}
                                onCheckedChange={(checked) => {
                                  setPendingActivityTypes(prev => 
                                    checked ? [...prev, type] : prev.filter(t => t !== type)
                                  );
                                }}
                              >
                                {type.charAt(0).toUpperCase() + type.slice(1)}
                              </DropdownMenuCheckboxItem>
                            ))}
                          </div>
                          
                          <div className="border-t border-border mt-2 pt-2 px-2 pb-2 space-y-2">
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1"
                                onClick={() => setPendingActivityTypes([])}
                              >
                                Clear
                              </Button>
                              <Button 
                                variant="outline"
                                size="sm" 
                                className="flex-1"
                                onClick={() => setPendingActivityTypes(allActivityTypes)}
                              >
                                All
                              </Button>
                            </div>
                            <Button 
                              size="sm" 
                              className="w-full"
                              onClick={() => {
                                setSelectedActivityTypes(pendingActivityTypes);
                                setShowFilterDropdown(false);
                              }}
                            >
                              Apply
                            </Button>
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                  
                  {/* Activities for this date */}
                  <div className="divide-y divide-border">
                    {dayActivities.length === 0 ? (
                      <div className="px-4 py-6 text-center">
                        <p className="text-sm text-muted-foreground">No activities logged</p>
                      </div>
                    ) : (
                      dayActivities.map((activity) => {
                        const milestones = detectMilestones(activity, activities);
                        return (
                          <SwipeableActivityCard
                            key={activity.id}
                            activity={activity}
                            babyName={babyName}
                            milestones={milestones}
                            onEdit={onEditActivity}
                            onDelete={async (activityId) => {
                              try {
                                const { data: activityToDelete } = await supabase
                                  .from('activities')
                                  .select('*')
                                  .eq('id', activityId)
                                  .single();

                                await onDeleteActivity(activityId);

                                if (activityToDelete) {
                                  trackDelete({
                                    id: activityToDelete.id,
                                    type: activityToDelete.type,
                                    logged_at: activityToDelete.logged_at,
                                    details: activityToDelete.details,
                                    household_id: activityToDelete.household_id,
                                    created_by: activityToDelete.created_by
                                  });
                                }
                              } catch (error) {
                                console.error('Error deleting activity:', error);
                              }
                            }}
                          />
                        );
                      })
                    )}
                    
                    {/* Wake-up indicator */}
                    {wakeInfo && (
                      <button
                        onClick={() => onEditActivity(wakeInfo.nightSleep)}
                        className="relative flex items-center px-4 py-3 group transition-colors w-full text-left hover:bg-muted/50"
                      >
                        <div className="relative z-10 flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-muted text-muted-foreground">
                          <Sun className="h-4 w-4" />
                        </div>
                        
                        <div className="flex-1 flex items-center justify-between min-w-0 gap-3 ml-3">
                          <span className="text-sm font-medium text-foreground">
                            Woke up
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {wakeInfo.wakeTime}
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Load More / Show Less Buttons */}
          <div className="text-center pt-4 space-y-2">
            {hasMoreDays && (
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="text-sm font-semibold text-primary hover:opacity-80 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2 mx-auto"
              >
                {isLoadingMore ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  `Load ${Math.min(remainingDays, LOAD_MORE_INCREMENT)} more days`
                )}
              </button>
            )}
            
            {visibleDaysCount > INITIAL_DAYS && (
              <button
                onClick={handleShowLess}
                className="text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors block mx-auto"
              >
                Show less
              </button>
            )}
            
            {/* Progress indicator */}
            {totalDaysWithData > INITIAL_DAYS && (
              <p className="text-xs text-muted-foreground/60 pt-2">
                Showing {visibleDaysCount} of {totalDaysWithData} days
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
