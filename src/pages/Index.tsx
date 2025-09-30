import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ActivityCard, Activity } from "@/components/ActivityCard";
import { AddActivityModal } from "@/components/AddActivityModal";
import { BottomNavigation } from "@/components/BottomNavigation";
import { InsightsTab } from "@/components/InsightsTab";
import { Settings as SettingsPage } from "@/pages/Settings";
import { Helper } from "@/components/Helper";
import { NightDoulaReview } from "@/components/NightDoulaReview";

import { NextActivityPrediction } from "@/components/NextActivityPrediction";
import { TrendChart } from "@/components/TrendChart";
import { SleepChart } from "@/components/SleepChart";
import { useActivities } from "@/hooks/useActivities";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

const Index = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
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
  const [previousTab, setPreviousTab] = useState("home"); // Track previous tab for settings navigation
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  

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
        let combinedDateTime: Date;
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const period = timeMatch[3].toUpperCase();
          
          // Convert to 24-hour format
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          // Create a local date-time, then store as UTC ISO
          combinedDateTime = new Date(
            activityDate.getFullYear(),
            activityDate.getMonth(),
            activityDate.getDate(),
            hours,
            minutes,
            0,
            0
          );
        } else {
          // Fallback: noon local time on selected date
          combinedDateTime = new Date(
            activityDate.getFullYear(),
            activityDate.getMonth(),
            activityDate.getDate(),
            12,
            0,
            0,
            0
          );
        }
        loggedAt = combinedDateTime.toISOString();
      } else {
        // Default to now (UTC ISO)
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
    case "helper":
      return <Helper activities={activities.map(a => ({
        id: a.id,
        type: a.type,
        logged_at: a.loggedAt,
        details: a.details
      }))} babyBirthDate={babyProfile?.birthday ? new Date(babyProfile.birthday) : undefined} />;
    case "settings":
      return <SettingsPage />;
      default:
        return (
          <>
            
            {/* Activities Timeline */}
            <div className="px-4 py-4">              
              <div className="space-y-4 pb-20">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t('noActivitiesStartAdding')}</p>
                  </div>
                ) : (
                  (() => {
                    // Group activities by date
                    const activityGroups: { [date: string]: typeof activities } = {};
                    
                     activities.forEach(activity => {
                       // Use the logged_at date for grouping activities by day
                       const activityDate = new Date(activity.loggedAt!);
                       // Create date in local timezone to avoid timezone offset issues
                       const localDate = new Date(activityDate.getFullYear(), activityDate.getMonth(), activityDate.getDate());
                       const localDateString = localDate.toISOString().split('T')[0]; // YYYY-MM-DD format
                      
                      if (!activityGroups[localDateString]) {
                        activityGroups[localDateString] = [];
                      }
                      activityGroups[localDateString].push(activity);
                    });

                    // Sort activities within each date group by actual activity time
                    Object.keys(activityGroups).forEach(dateKey => {
                      activityGroups[dateKey].sort((a, b) => {
                        const getActivityTime = (activity: any) => {
                          // For naps, use startTime if available, otherwise logged_at
                          if (activity.type === 'nap' && activity.details?.startTime) {
                            const base = new Date(activity.loggedAt!);
                            const [t, period] = activity.details.startTime.split(' ');
                            const [hStr, mStr] = t.split(':');
                            let h = parseInt(hStr, 10);
                            const m = parseInt(mStr ?? '0', 10);
                            if (period === 'PM' && h !== 12) h += 12;
                            if (period === 'AM' && h === 12) h = 0;
                            base.setHours(h, m, 0, 0);
                            return base.getTime();
                          }
                          return new Date(activity.loggedAt!).getTime();
                        };

                        return getActivityTime(b) - getActivityTime(a);
                      });
                    });

                    const sortedDates = Object.keys(activityGroups).sort((a, b) => 
                      new Date(b).getTime() - new Date(a).getTime()
                    );

                    // Filter dates based on showFullTimeline
                    const today = new Date();
                    const yesterday = new Date(Date.now() - 86400000);
                    const todayKey = today.getFullYear() + '-' + 
                                   String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                                   String(today.getDate()).padStart(2, '0');
                    const yesterdayKey = yesterday.getFullYear() + '-' + 
                                       String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + 
                                       String(yesterday.getDate()).padStart(2, '0');

                    const visibleDates = showFullTimeline 
                      ? sortedDates 
                      : sortedDates.filter(date => date === todayKey || date === yesterdayKey);

                    return (
                      <>
                        {visibleDates.map((dateKey, index) => {
                          const date = new Date(dateKey);
                          
                          let displayDate;
                          if (dateKey === todayKey) {
                            displayDate = t('today');
                          } else if (dateKey === yesterdayKey) {
                            displayDate = t('yesterday');
                          } else {
                            displayDate = date.toLocaleDateString("en-US", { 
                              weekday: "long", 
                              month: "short", 
                              day: "numeric" 
                            });
                          }

                          return (
                            <div key={dateKey}>
                              <div className="space-y-2">
                                {/* Date Header */}
                                <h3 className="text-base font-sans font-medium text-foreground border-b border-border pb-1 mb-2 dark:font-bold">
                                  {displayDate}
                                </h3>
                                
                                {/* Activities for this date */}
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
                              </div>
                              
                              {/* Next Predicted Action - Show after most recent day's activities (today if present, otherwise yesterday) */}
                              {index === 0 && activities.length > 0 && (
                                <div className="mt-4 mb-4">
                                  <NextActivityPrediction activities={activities} />
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Show More/Less Button */}
                        {sortedDates.length > visibleDates.length && (
                          <div className="text-center pt-4">
                            <button
                              onClick={() => setShowFullTimeline(!showFullTimeline)}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-accent"
                            >
                              {showFullTimeline ? t('showLess') : `${t('showMoreDays')} ${sortedDates.length - visibleDates.length} ${t('moreDays')}`}
                            </button>
                          </div>
                        )}
                      </>
                    );
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
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => {
              if (activeTab === "settings") {
                // If we're already in settings, go back to previous tab
                setActiveTab(previousTab);
              } else {
                // Going to settings, save current tab as previous
                setPreviousTab(activeTab);
                setActiveTab("settings");
              }
            }}
            className="p-2"
          >
            <Settings className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {renderTabContent()}


      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={(newTab) => {
          // When changing tabs via bottom nav, save previous tab (unless going to settings)
          if (newTab !== "settings") {
            setPreviousTab(activeTab);
          }
          setActiveTab(newTab);
        }}
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
            
            // Create timestamp the same way as addActivity to ensure consistency
            const combinedDateTime = new Date(
              selectedDate.getFullYear(),
              selectedDate.getMonth(),
              selectedDate.getDate(),
              hour24,
              minutes,
              0,
              0
            );
            const loggedAt = combinedDateTime.toISOString();

            const { error } = await supabase
              .from('activities')
              .update({
                type: updatedActivity.type,
                logged_at: loggedAt,
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
            toast({
              title: "Activity deleted",
              description: "The activity has been removed.",
            });
          } catch (error) {
            console.error('Error deleting activity:', error);
            toast({
              title: "Error deleting activity",
              description: "Please make sure you're signed in and try again.",
              variant: "destructive"
            });
          }
        }}
      />

    </div>
  );
};

export default Index;