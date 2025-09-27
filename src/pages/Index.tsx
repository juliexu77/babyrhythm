import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ActivityCard, Activity } from "@/components/ActivityCard";
import { AddActivityModal } from "@/components/AddActivityModal";
import { ChatPanel } from "@/components/ChatPanel";
import { SummaryCards } from "@/components/SummaryCards";
import { SleepChart } from "@/components/SleepChart";
import { DailySummary } from "@/components/DailySummary";
import { TodaysSummary } from "@/components/TodaysSummary";
import { NextActivityPrediction } from "@/components/NextActivityPrediction";
import { InviteCollaborator } from "@/components/InviteCollaborator";
import { InlineInsights } from "@/components/InlineInsights";
import { InsightsTab } from "@/components/InsightsTab";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { BottomNavigation } from "@/components/BottomNavigation";
import { BabyAge } from "@/components/BabyAge";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/contexts/LanguageContext";
import { Calendar, BarChart3, TrendingUp, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { offlineSync } from "@/utils/offlineSync";
import { BabyProfileSetup } from "@/components/BabyProfileSetup";
import { useBabyProfile } from "@/hooks/useBabyProfile";
import { useActivities } from "@/hooks/useActivities";
import { SubtleOnboarding } from "@/components/SubtleOnboarding";
import { Settings } from "@/pages/Settings";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const { t } = useLanguage();
  const { babyProfile: dbBabyProfile, loading: profileLoading } = useBabyProfile();
  const { activities: dbActivities, loading: activitiesLoading, addActivity, updateActivity, deleteActivity } = useActivities();
  const navigate = useNavigate();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [babyProfile, setBabyProfile] = useState<{ name: string; birthday?: string } | null>(null);
  const [guestActivities, setGuestActivities] = useState<Activity[]>([]);

  // Convert database activities to UI activities, or use guest activities
  const activities: Activity[] = user && dbBabyProfile && dbActivities 
    ? dbActivities.map(dbActivity => ({
        id: dbActivity.id,
        type: dbActivity.type as 'feed' | 'diaper' | 'nap' | 'note',
        time: new Date(dbActivity.logged_at).toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        }),
        details: dbActivity.details
      }))
    : guestActivities;

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Check for baby profile - check completion status first
  useEffect(() => {
    if (!loading && !profileLoading) {
      const profileCompleted = localStorage.getItem('babyProfileCompleted');
      const savedProfile = localStorage.getItem('babyProfile');
      const isCollaborator = localStorage.getItem('isCollaborator');
      
      // If user is a collaborator with access to a DB profile, use that
      if (isCollaborator && dbBabyProfile) {
        setBabyProfile(dbBabyProfile);
        setHasProfile(true);
      }
      // If they have a completed local profile, use that
      else if (profileCompleted && savedProfile) {
        setBabyProfile(JSON.parse(savedProfile));
        setHasProfile(true);
      }
      // If they have a DB profile (they're the owner), use that
      else if (dbBabyProfile) {
        setBabyProfile(dbBabyProfile);
        setHasProfile(true);
      }
      // Otherwise show the setup screen
      else {
        setHasProfile(false);
      }
}
  }, [user, loading, profileLoading, dbBabyProfile]);

  // Clear stale local profile if no user
  useEffect(() => {
    if (!user) {
      localStorage.removeItem('babyProfile');
      localStorage.removeItem('babyProfileCompleted');
      localStorage.removeItem('isCollaborator');
    }
  }, [user]);

  const handleProfileComplete = (profile: { name: string; birthday: string }) => {
    setBabyProfile(profile);
    setHasProfile(true);
  };

  // First-time tooltip: show over + button after short delay - clear for testing
  useEffect(() => {
    // Clear the existing localStorage item to show new onboarding
    localStorage.removeItem('hasSeenAddActivityTooltip');
    
    const seen = localStorage.getItem('hasSeenAddActivityTooltip');
    if (!seen) {
      const t = setTimeout(() => setShowTooltip(true), 900);
      return () => clearTimeout(t);
    }
  }, []);

  // Load guest activities from localStorage
  useEffect(() => {
    if (user && dbBabyProfile) return; // Don't load guest activities if authenticated
    
    const initialActivities = localStorage.getItem('initialActivities');
    if (initialActivities) {
      try {
        const parsed = JSON.parse(initialActivities);
        setGuestActivities(parsed);
      } catch (error) {
        console.error('Error parsing initial activities:', error);
      }
    }
  }, [user, dbBabyProfile]);

  // Migrate guest activities to database when user first logs in
  useEffect(() => {
    if (!user || !dbBabyProfile || dbActivities.length > 0) return;
    
    const initialActivities = localStorage.getItem('initialActivities');
    if (initialActivities) {
      try {
        const parsed = JSON.parse(initialActivities);
        // Migrate each activity to the database
        parsed.forEach(async (activity: Activity) => {
          await addActivity({
            type: activity.type as 'feed' | 'diaper' | 'nap' | 'note',
            time: activity.time,
            details: activity.details
          });
        });
        localStorage.removeItem('initialActivities'); // Remove after migrating
        setGuestActivities([]); // Clear guest activities
      } catch (error) {
        console.error('Error migrating initial activities:', error);
      }
    }
  }, [user, dbBabyProfile, dbActivities, addActivity]);

  if (loading || profileLoading || activitiesLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show baby profile setup if no profile exists and user is not a collaborator
  if (hasProfile === false && !localStorage.getItem('isCollaborator') && !localStorage.getItem('babyProfileSkipped')) {
    return <BabyProfileSetup onComplete={handleProfileComplete} />;
  }

  const handleAddActivity = async (newActivity: Omit<Activity, "id">) => {
    try {
      // If user is authenticated and has a baby profile, save to database
      if (user && dbBabyProfile) {
        await addActivity({
          type: newActivity.type as 'feed' | 'diaper' | 'nap' | 'note',
          time: newActivity.time,
          details: newActivity.details
        });
      } else {
        // For guest users, store locally
        const activity: Activity = {
          ...newActivity,
          id: Date.now().toString(),
        };
        setGuestActivities(prev => [activity, ...prev]);
        
        // Also store in localStorage for persistence
        const updatedActivities = [activity, ...guestActivities];
        localStorage.setItem('initialActivities', JSON.stringify(updatedActivities));
      }
    } catch (error) {
      console.error('Error adding activity:', error);
      // Fallback to guest storage
      const activity: Activity = {
        ...newActivity,
        id: Date.now().toString(),
      };
      setGuestActivities(prev => [activity, ...prev]);
    }
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric", 
    month: "long",
    day: "numeric"
  });

  const getTimeValue = (timeString: string) => {
    const [time, period] = timeString.split(" ");
    const [hours, minutes] = time.split(":");
    let hour24 = parseInt(hours);
    
    if (period === "PM" && hour24 !== 12) {
      hour24 += 12;
    } else if (period === "AM" && hour24 === 12) {
      hour24 = 0;
    }
    
    return hour24 * 60 + parseInt(minutes);
  };

  const sortedActivities = [...activities].sort((a, b) => {
    return getTimeValue(b.time) - getTimeValue(a.time);
  });

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <div className="space-y-4">
            {/* Activity Timeline - Priority above fold */}
            <div className="space-y-2">
              <h2 className="text-lg font-serif font-medium text-foreground">{t('todaysActivities')}</h2>
              {sortedActivities.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                  <p className="text-muted-foreground font-medium mb-1">{t('noActivitiesYet')}</p>
                  <p className="text-sm text-muted-foreground">{t('tapToAddFirst')}</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {sortedActivities.map((activity) => (
                    <ActivityCard 
                      key={activity.id} 
                      activity={activity}
                      babyName={babyProfile?.name || "Baby"}
                      onEdit={(activity) => {
                        setEditingActivity(activity);
                        setIsAddModalOpen(true);
                      }}
                      onDelete={async (activityId) => {
                        try {
                          if (user && dbBabyProfile) {
                            await deleteActivity(activityId);
                          } else {
                            // For guest users, remove from local state and localStorage
                            const updatedActivities = guestActivities.filter(a => a.id !== activityId);
                            setGuestActivities(updatedActivities);
                            localStorage.setItem('initialActivities', JSON.stringify(updatedActivities));
                          }
                        } catch (error) {
                          console.error('Error deleting activity:', error);
                        }
                      }}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Insights and predictions below timeline */}
            <div className="space-y-4 pt-2">
              <InlineInsights activities={activities} />
              <NextActivityPrediction activities={activities} />
            </div>
          </div>
        );
case "insights":
  return <InsightsTab activities={activities} />;
      case "trends":
        return (
          <div className="space-y-6">
            <SleepChart activities={activities} />
          </div>
        );
      case "calendar":
        return (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
              <p className="text-muted-foreground font-medium mb-1">{t('calendar')}</p>
              <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        );
      case "settings":
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans pb-20 overflow-y-auto">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Header */}
      <div className="bg-gradient-primary px-6 py-4 text-white relative">
        <div className="max-w-md mx-auto">
          {activeTab === "home" && (
            <>
              {(user || babyProfile) && <BabyAge />}
              <div className="flex items-center gap-2 text-white/90">
                <Calendar className="h-4 w-4" />
                <p className="text-sm font-medium">{today}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 py-8">
        {renderContent()}
      </div>

      {/* Add Activity Modal - Don't show fixed button since we have bottom nav */}
      <AddActivityModal 
        onAddActivity={handleAddActivity} 
        isOpen={isAddModalOpen} 
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingActivity(null);
        }}
        editingActivity={editingActivity}
        onEditActivity={async (updatedActivity) => {
          try {
            if (user && dbBabyProfile) {
              await updateActivity(updatedActivity.id, {
                type: updatedActivity.type as 'feed' | 'diaper' | 'nap' | 'note',
                logged_at: new Date().toISOString(), // Use current time for simplicity
                details: updatedActivity.details
              });
            } else {
              // For guest users, update local state and localStorage
              const updatedActivities = guestActivities.map(a => 
                a.id === updatedActivity.id ? updatedActivity : a
              );
              setGuestActivities(updatedActivities);
              localStorage.setItem('initialActivities', JSON.stringify(updatedActivities));
            }
            setEditingActivity(null);
            setIsAddModalOpen(false);
          } catch (error) {
            console.error('Error updating activity:', error);
          }
        }}
      />

      {/* Chat Panel - Don't show fixed button since we have bottom nav */}
      <ChatPanel 
        activities={activities}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Subtle onboarding guidance */}
      {showTooltip && addButtonRef.current && (
        <SubtleOnboarding 
          target={addButtonRef.current}
          onDismiss={() => { setShowTooltip(false); localStorage.setItem('hasSeenAddActivityTooltip', 'true'); }}
        />
      )}

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onAddActivity={() => {
          setEditingActivity(null);
          setIsAddModalOpen(true);
        }}
        addButtonRef={addButtonRef}
      />
    </div>
  );
};

export default Index;