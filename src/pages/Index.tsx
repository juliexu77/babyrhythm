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
import { Calendar } from "lucide-react";

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
          loggedAt = combinedDateTime.toISOString();
        } else {
          loggedAt = activityDate.toISOString();
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
            {/* Activities Timeline Header */}
            <div className="bg-primary text-primary-foreground py-4 px-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span className="font-medium">Recent Activities</span>
              </div>
            </div>

            {/* Activities Timeline */}
            <div className="px-4 py-6">
              <div className="space-y-6 pb-20">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No activities yet. Start by adding your first activity!</p>
                  </div>
                ) : (
                  (() => {
                    // Group activities by date
                    const activityGroups: { [date: string]: typeof activities } = {};
                    
                    activities.forEach(activity => {
                      const activityDate = new Date(activity.loggedAt!).toDateString();
                      if (!activityGroups[activityDate]) {
                        activityGroups[activityDate] = [];
                      }
                      activityGroups[activityDate].push(activity);
                    });

                    const sortedDates = Object.keys(activityGroups).sort((a, b) => 
                      new Date(b).getTime() - new Date(a).getTime()
                    );

                    return sortedDates.map(dateString => {
                      const date = new Date(dateString);
                      const today = new Date().toDateString();
                      const yesterday = new Date(Date.now() - 86400000).toDateString();
                      
                      let displayDate;
                      if (dateString === today) {
                        displayDate = "Today";
                      } else if (dateString === yesterday) {
                        displayDate = "Yesterday";
                      } else {
                        displayDate = date.toLocaleDateString("en-US", { 
                          weekday: "long", 
                          month: "short", 
                          day: "numeric" 
                        });
                      }

                      return (
                        <div key={dateString} className="space-y-3">
                          {/* Date Header */}
                          <h3 className="text-lg font-serif font-medium text-foreground border-b border-border pb-2">
                            {displayDate}
                          </h3>
                          
                          {/* Activities for this date */}
                          <div className="space-y-2">
                            {activityGroups[dateString].map((activity) => (
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
                                  }
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      );
                    });
                  })()
                )}
              </div>

              {/* Simple Summary Info */}
              {activities.length > 0 && (
                <div className="mt-6 space-y-4">
                  <NextActivityPrediction activities={activities} />
                </div>
              )}
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
        onEditActivity={async (updatedActivity) => {
          try {
            const { error } = await supabase
              .from('activities')
              .update({
                type: updatedActivity.type,
                details: updatedActivity.details,
                updated_at: new Date().toISOString()
              })
              .eq('id', updatedActivity.id);
            
            if (error) throw error;
            refetchActivities();
            setEditingActivity(null);
          } catch (error) {
            console.error('Error updating activity:', error);
          }
        }}
      />

    </div>
  );
};

export default Index;