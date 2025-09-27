import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ActivityCard, Activity } from "@/components/ActivityCard";
import { ActivityDetailModal } from "@/components/ActivityDetailModal";
import { AddActivityModal } from "@/components/AddActivityModal";
import { BottomNavigation } from "@/components/BottomNavigation";
import { TodaysSummary } from "@/components/TodaysSummary";
import { YesterdaysSummary } from "@/components/YesterdaysSummary";
import { InsightsTab } from "@/components/InsightsTab";
import { Settings } from "@/pages/Settings";
import { ChatPanel } from "@/components/ChatPanel";
import { FirstTimeTooltip } from "@/components/FirstTimeTooltip";
import { NextActivityPrediction } from "@/components/NextActivityPrediction";
import { DailySummary } from "@/components/DailySummary";
import { PatternInsights } from "@/components/PatternInsights";
import { useActivities } from "@/hooks/useActivities";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, MessageCircle, Home, TrendingUp, User, Baby } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    : [];

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [selectedActivity, setSelectedActivity] = useState<Activity | null>(null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

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

  const handleProfileComplete = async (profile: { name: string; birthday?: string }) => {
    // This should not be used anymore - redirect to proper baby setup
    navigate('/baby-setup');
  };

  // First-time tooltip: show over + button after short delay
  useEffect(() => {
    if (hasProfile && activities.length === 0) {
      const timer = setTimeout(() => {
        const hasSeenTooltip = localStorage.getItem('hasSeenAddActivityTooltip');
        if (!hasSeenTooltip) {
          setShowTooltip(true);
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [hasProfile, activities.length]);

  const addActivity = async (type: string, details: any = {}) => {
    if (!user || !household) {
      console.error('User or household not available');
      return;
    }

    try {
      const { error } = await supabase.from('activities').insert({
        household_id: household.id,
        type,
        logged_at: new Date().toISOString(),
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
      case "settings":
        return <Settings />;
      default:
        return (
          <>
            <div className="px-4 py-2 space-y-4">
              <TodaysSummary activities={activities} />
              <YesterdaysSummary activities={activities} />
              <NextActivityPrediction activities={activities} />
              <DailySummary activities={activities} date={new Date().toISOString().split('T')[0]} />
              <PatternInsights activities={activities} />
            </div>

            <div className="px-4 space-y-3 pb-20">
              {activities.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No activities yet. Start by adding your first activity!</p>
                </div>
              ) : (
                activities.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    onEdit={(activity) => setSelectedActivity(activity)}
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
                ))
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

  if (!hasProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-6 max-w-md">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold text-foreground">Welcome!</h1>
            <p className="text-muted-foreground">
              Let's set up your baby's profile to get started with tracking.
            </p>
          </div>
          <Button 
            onClick={() => navigate('/app?tab=settings')}
            size="lg"
            className="w-full"
          >
            <Baby className="w-4 h-4 mr-2" />
            Set up baby profile
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-semibold">
            {babyProfile?.name}'s Day
          </h1>
          <button
            onClick={() => setIsChatOpen(true)}
            className="p-2 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <MessageCircle className="h-5 w-5" />
          </button>
        </div>
      </div>

      {renderTabContent()}

      {/* Floating Add Button */}
      <div className="fixed bottom-20 right-4 z-20">
        <div className="relative">
          <button
            onClick={() => setShowAddActivity(true)}
            className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all duration-200 flex items-center justify-center hover:scale-110"
          >
            <Plus className="h-6 w-6" />
          </button>
          <FirstTimeTooltip 
            target={null}
            onDismiss={() => {
              setShowTooltip(false);
              localStorage.setItem('hasSeenAddActivityTooltip', 'true');
            }}
          />
        </div>
      </div>

      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onAddActivity={() => setShowAddActivity(true)}
      />

      {/* Chat Panel */}
      <ChatPanel
        activities={activities}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Add Activity Modal */}
      {showAddActivity && (
        <AddActivityModal
          onAddActivity={(activity) => {
            addActivity(activity.type, activity.details);
            setShowAddActivity(false);
          }}
        />
      )}

      {/* Activity Detail Modal */}
      {selectedActivity && (
        <ActivityDetailModal
          activity={selectedActivity}
          isOpen={!!selectedActivity}
          onClose={() => setSelectedActivity(null)}
        />
      )}
    </div>
  );
};

export default Index;