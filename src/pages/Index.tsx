import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ActivityCard, Activity } from "@/components/ActivityCard";
import { AddActivityModal } from "@/components/AddActivityModal";
import { BottomNavigation } from "@/components/BottomNavigation";
import { InsightsTab } from "@/components/InsightsTab";
import { Settings } from "@/pages/Settings";

import { NextActivityPrediction } from "@/components/NextActivityPrediction";
import { TrendChart } from "@/components/TrendChart";
import { SleepChart } from "@/components/SleepChart";
import { useActivities } from "@/hooks/useActivities";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, ChevronDown, ChevronUp } from "lucide-react";

const Index = () => {
  const { user, loading } = useAuth();
  const { 
    household, 
    loading: householdLoading
  } = useHousehold();
  const { 
    activities: dbActivities, 
    loading: activitiesLoading, 
    refetch: refetchActivities 
  } = useActivities();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [babyProfile, setBabyProfile] = useState<{ name: string; birthday?: string } | null>(null);

  // Convert database activities to UI activities
  const activities: Activity[] = user && household && dbActivities 
    ? dbActivities.map(dbActivity => {
        let displayTime = new Date(dbActivity.logged_at).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        });

        // For naps, show start-end time range
        if (dbActivity.type === 'nap' && dbActivity.details.startTime && dbActivity.details.endTime) {
          displayTime = `${dbActivity.details.startTime} - ${dbActivity.details.endTime}`;
        }

        return {
          id: dbActivity.id,
          type: dbActivity.type as 'feed' | 'diaper' | 'nap' | 'note',
          time: displayTime,
          loggedAt: dbActivity.logged_at, // Preserve the original timestamp
          details: dbActivity.details
        };
      })
    : [];

  const [activeTab, setActiveTab] = useState("home");
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  

  // Check user authentication and household status
  useEffect(() => {
    if (loading || householdLoading) return;

    if (user) {
      // For authenticated users, always use database as source of truth
      if (household) {
        setBabyProfile({ name: household.baby_name || '', birthday: household.baby_birthday || undefined });
        setHasProfile(true);
        // Clear any stale localStorage data
        localStorage.removeItem('babyProfile');
        localStorage.removeItem('babyProfileCompleted');
      } else {
        // No household exists, show setup
        setHasProfile(false);
      }
    } else {
      // Redirect unauthenticated users to auth
      navigate('/auth');
      return;
    }
  }, [user, loading, householdLoading, household, navigate]);

  // Clear stale local profile if no user
  useEffect(() => {
    if (!user) {
      localStorage.removeItem('babyProfile');
      localStorage.removeItem('babyProfileCompleted');
      localStorage.removeItem('isCollaborator');
    }
  }, [user]);

  const handleProfileComplete = async () => {
    // Not needed anymore - household auto-created on login
    window.location.reload();
  };


  const addActivity = async (type: string, details: any = {}, activityDate?: Date, activityTime?: string) => {
    if (!user) {
      console.error('User not available');
      return;
    }

    try {
      let householdId = household?.id;
      
      // Household should always exist now (created on login)
      if (!householdId) {
        throw new Error('No household found - please refresh the page');
      }

      // Combine selected date with selected time
      let loggedAt: string;
      if (activityDate && activityTime) {
        // Parse the time string (e.g., "7:00 AM")
        const timeMatch = activityTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (timeMatch) {
          let hours = parseInt(timeMatch[1]);
          const minutes = parseInt(timeMatch[2]);
          const period = timeMatch[3].toUpperCase();
          
          // Convert to 24-hour format
          if (period === 'PM' && hours !== 12) {
            hours += 12;
          } else if (period === 'AM' && hours === 12) {
            hours = 0;
          }
          
          // Create a new date with the selected date and time in LOCAL timezone
          const combinedDateTime = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate(), hours, minutes, 0, 0);
          // Store as local time to avoid timezone shift issues
          const year = combinedDateTime.getFullYear();
          const month = String(combinedDateTime.getMonth() + 1).padStart(2, '0');
          const day = String(combinedDateTime.getDate()).padStart(2, '0');
          const hour = String(combinedDateTime.getHours()).padStart(2, '0');
          const minute = String(combinedDateTime.getMinutes()).padStart(2, '0');
          loggedAt = `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
        } else {
          // Store as local time to avoid timezone shift issues
          const year = activityDate.getFullYear();
          const month = String(activityDate.getMonth() + 1).padStart(2, '0');
          const day = String(activityDate.getDate()).padStart(2, '0');
          loggedAt = `${year}-${month}-${day}T12:00:00.000Z`;
        }
      } else {
        loggedAt = new Date().toISOString();
      }

      const { error } = await supabase.from('activities').insert({
        household_id: householdId,
        type,
        logged_at: loggedAt,
        details,
        created_by: user.id
      });

      if (error) throw error;

      // Refetch activities to update the list
      refetchActivities();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: "Error adding activity",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "insights":
        return <InsightsTab activities={activities} />;
      case "trends":
        return (
          <div className="px-4 py-6 space-y-6">
            <TrendChart activities={activities} />
            <SleepChart activities={activities} />
          </div>
        );
      case "settings":
        return <Settings />;
      default:
        return (
          <>
            {/* Activities Timeline */}
            <div className="px-4 py-4">              
              <div className="space-y-4 pb-20">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No activities yet. Start by adding your first activity!</p>
                  </div>
                ) : (
                  (() => {
                    // Group activities by date
                    const activityGroups: { [date: string]: typeof activities } = {};
                    
                    activities.forEach(activity => {
                      // Use the logged_at date for grouping activities by day
                      const activityDate = new Date(activity.loggedAt!);
                      // Get the date string in local timezone to avoid timezone issues
                      const dateKey = activityDate.getFullYear() + '-' + 
                                     String(activityDate.getMonth() + 1).padStart(2, '0') + '-' + 
                                     String(activityDate.getDate()).padStart(2, '0');
                      
                      if (!activityGroups[dateKey]) {
                        activityGroups[dateKey] = [];
                      }
                      activityGroups[dateKey].push(activity);
                    });

                    // Sort activities within each date group by actual activity time
                    Object.keys(activityGroups).forEach(dateKey => {
                      activityGroups[dateKey].sort((a, b) => {
                        const getActivityTime = (activity: any) => {
                          // For naps, use startTime if available, otherwise logged_at
                          if (activity.type === 'nap' && activity.details?.startTime) {
                            const activityDate = new Date(activity.loggedAt!).toDateString();
                            return new Date(`${activityDate} ${activity.details.startTime}`).getTime();
                          }
                          return new Date(activity.loggedAt!).getTime();
                        };

                        return getActivityTime(b) - getActivityTime(a);
                      });
                    });

                    const sortedDates = Object.keys(activityGroups).sort((a, b) => 
                      new Date(b).getTime() - new Date(a).getTime()
                    );

                    return sortedDates.map((dateKey, index) => {
                      const date = new Date(dateKey);
                      const today = new Date();
                      const yesterday = new Date(Date.now() - 86400000);
                      
                      const todayKey = today.getFullYear() + '-' + 
                                     String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                                     String(today.getDate()).padStart(2, '0');
                      const yesterdayKey = yesterday.getFullYear() + '-' + 
                                         String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + 
                                         String(yesterday.getDate()).padStart(2, '0');
                      
                      let displayDate;
                      if (dateKey === todayKey) {
                        displayDate = "Today";
                      } else if (dateKey === yesterdayKey) {
                        displayDate = "Yesterday";
                      } else {
                        displayDate = date.toLocaleDateString("en-US", { 
                          weekday: "long", 
                          month: "short", 
                          day: "numeric" 
                        });
                      }

                      // Auto-collapse days before yesterday
                      const shouldAutoCollapse = dateKey !== todayKey && dateKey !== yesterdayKey;
                      const isCollapsed = shouldAutoCollapse && !collapsedDays.has(dateKey);
                      
                      const toggleCollapse = () => {
                        setCollapsedDays(prev => {
                          const newSet = new Set(prev);
                          if (newSet.has(dateKey)) {
                            newSet.delete(dateKey);
                          } else {
                            newSet.add(dateKey);
                          }
                          return newSet;
                        });
                      };

                      return (
                        <div key={dateKey}>
                          <div className="space-y-2">
                            {/* Date Header */}
                            <div className="flex items-center justify-between">
                              <h3 className="text-base font-sans font-medium text-foreground border-b border-border pb-1 mb-2 dark:font-bold flex-1">
                                {displayDate}
                              </h3>
                              {shouldAutoCollapse && (
                                <button
                                  onClick={toggleCollapse}
                                  className="p-1 hover:bg-accent rounded-md transition-colors ml-2"
                                  aria-label={isCollapsed ? "Expand" : "Collapse"}
                                >
                                  {isCollapsed ? (
                                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                  ) : (
                                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                  )}
                                </button>
                              )}
                            </div>
                            
                            {/* Activities for this date - only show if not collapsed */}
                            {!isCollapsed && (
                              <div className="space-y-1">
                                {activityGroups[dateKey].map((activity) => (
                                  <ActivityCard
                                    key={activity.id}
                                    activity={activity}
                                    babyName={babyProfile?.name}
                                    onEdit={(activity) => setEditingActivity(activity)}
                                    onDelete={async (activityId) => {
                                      try {
                                        const { error } = await supabase
                                          .from('activities')
                                          .delete()
                                          .eq('id', activityId);
                                        
                                        if (error) throw error;
                                        refetchActivities();
                                      } catch (error) {
                                        console.error('Error deleting activity:', error);
                                        toast({
                                          title: "Error deleting activity",
                                          description: "Please try again.",
                                          variant: "destructive"
                                        });
                                      }
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                          
                          {/* Next Predicted Action - Show after Today's activities */}
                          {dateKey === todayKey && activities.length > 0 && (
                            <div className="mt-4 mb-4">
                              <NextActivityPrediction activities={activities} />
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()
                )}
              </div>
            </div>
          </>
        );
    }
  };

  if (loading || householdLoading || hasProfile === null) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold">
            {babyProfile?.name ? `${babyProfile.name}'s Day` : "Baby Tracker"}
          </h1>
        </div>
      </div>

      {renderTabContent()}


      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onAddActivity={() => setShowAddActivity(true)}
      />

      {/* Add Activity Modal */}
      <AddActivityModal
        isOpen={showAddActivity || !!editingActivity}
        onClose={() => {
          setShowAddActivity(false);
          setEditingActivity(null);
        }}
        editingActivity={editingActivity}
        onAddActivity={(activity, activityDate, activityTime) => {
          addActivity(activity.type, activity.details, activityDate, activityTime);
          setShowAddActivity(false);
        }}
        onEditActivity={async (updatedActivity, selectedDate, activityTime) => {
          try {
            // Convert time string to timestamp for database update
            const [time, period] = activityTime.split(' ');
            const [hours, minutes] = time.split(':').map(Number);
            
            let hour24 = hours;
            if (period === 'PM' && hours !== 12) hour24 += 12;
            if (period === 'AM' && hours === 12) hour24 = 0;
            
            // Use the selected date from the modal, not the original date
            const loggedAt = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), hour24, minutes, 0, 0);
            loggedAt.setHours(hour24, minutes, 0, 0);

            const { error } = await supabase
              .from('activities')
              .update({
                type: updatedActivity.type,
                logged_at: loggedAt.toISOString(),
                details: updatedActivity.details
              })
              .eq('id', updatedActivity.id);
            
            if (error) throw error;
            refetchActivities();
            setEditingActivity(null);
          } catch (error) {
            console.error('Error updating activity:', error);
            toast({
              title: "Error updating activity",
              description: "Please try again.",
              variant: "destructive"
            });
          }
        }}
        onDeleteActivity={async (activityId) => {
          try {
            const { error } = await supabase
              .from('activities')
              .delete()
              .eq('id', activityId);
            
            if (error) throw error;
            refetchActivities();
            setEditingActivity(null);
          } catch (error) {
            console.error('Error deleting activity:', error);
          }
        }}
      />

    </div>
  );
};

export default Index;