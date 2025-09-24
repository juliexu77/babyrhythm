import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ActivityCard, Activity } from "@/components/ActivityCard";
import { AddActivityModal } from "@/components/AddActivityModal";
import { ChatPanel } from "@/components/ChatPanel";
import { SummaryCards } from "@/components/SummaryCards";
import { TrendChart } from "@/components/TrendChart";
import { DailySummary } from "@/components/DailySummary";
import { YesterdaysSummary } from "@/components/YesterdaysSummary";
import { NextActivityPrediction } from "@/components/NextActivityPrediction";
import { InviteCollaborator } from "@/components/InviteCollaborator";
import { InlineInsights } from "@/components/InlineInsights";
import { PatternInsights } from "@/components/PatternInsights";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { BottomNavigation } from "@/components/BottomNavigation";
import { BabyAge } from "@/components/BabyAge";
import { useAuth } from "@/hooks/useAuth";
import { Calendar, BarChart3, TrendingUp, User, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { offlineSync } from "@/utils/offlineSync";

const Index = () => {
  const { user, loading, signOut } = useAuth();
  const navigate = useNavigate();
  const [hasProfile, setHasProfile] = useState<boolean | null>(null);
  const [activities, setActivities] = useState<Activity[]>([
    {
      id: "1",
      type: "feed",
      time: "8:30 AM",
      details: { quantity: "4" }
    },
    {
      id: "2", 
      type: "diaper",
      time: "9:15 AM",
      details: { diaperType: "pee" }
    },
    {
      id: "3",
      type: "nap", 
      time: "10:00 AM",
      details: { startTime: "10:00 AM", endTime: "11:30 AM" }
    },
    {
      id: "4",
      type: "feed",
      time: "12:30 PM",
      details: { quantity: "3.5" }
    },
    {
      id: "5",
      type: "diaper",
      time: "1:45 PM", 
      details: { diaperType: "both" }
    }
  ]);

  const [isChatOpen, setIsChatOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // No more onboarding - just set profile as complete
  useEffect(() => {
    if (!loading) {
      setHasProfile(true);
    }
  }, [user, loading]);

  // Load initial activities from localStorage if available
  useEffect(() => {
    const initialActivities = localStorage.getItem('initialActivities');
    if (initialActivities) {
      try {
        const parsed = JSON.parse(initialActivities);
        setActivities(parsed);
        localStorage.removeItem('initialActivities'); // Remove after loading
      } catch (error) {
        console.error('Error parsing initial activities:', error);
      }
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  const handleAddActivity = (newActivity: Omit<Activity, "id">) => {
    const activity: Activity = {
      ...newActivity,
      id: Date.now().toString(),
    };
    setActivities(prev => [activity, ...prev]);
    
    // Store offline and attempt sync
    offlineSync.storeOfflineActivity(newActivity);
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
          <div className="space-y-6">
            <YesterdaysSummary activities={activities} />
          </div>
        );
      case "timeline":
        return (
          <div className="space-y-4">
            {/* Activity Timeline - Priority above fold */}
            <div className="space-y-2">
              <h2 className="text-lg font-serif font-medium text-foreground">Today's Activities</h2>
              {sortedActivities.length === 0 ? (
                <div className="text-center py-12">
                  <BarChart3 className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-60" />
                  <p className="text-muted-foreground font-medium mb-1">No activities yet today</p>
                  <p className="text-sm text-muted-foreground">Tap the + button to add your first activity</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {sortedActivities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
            </div>

            {/* Insights and predictions below timeline */}
            <div className="space-y-4 pt-2">
              <InlineInsights activities={activities} />
              <NextActivityPrediction activities={activities} />
              <PatternInsights activities={activities} />
              <SummaryCards activities={activities} />
            </div>
          </div>
        );
      case "trends":
        return (
          <div className="space-y-6">
            <TrendChart activities={activities} />
            <DailySummary activities={activities} date={today} />
          </div>
        );
      case "calendar":
        return (
          <div className="text-center py-16">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
            <p className="text-muted-foreground font-medium mb-1">Calendar View</p>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        );
      case "profile":
        return (
          <div className="space-y-6">
            <div className="text-center py-8">
              <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
              <p className="text-muted-foreground font-medium mb-4">Profile & Settings</p>
              <div className="max-w-sm mx-auto mb-6">
                {user ? (
                  <>
                    <div className="p-4 bg-card rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Signed in as:</p>
                      <p className="font-medium text-foreground">{user.email}</p>
                    </div>
                    <Button
                      onClick={signOut}
                      variant="outline"
                      className="w-full mt-4"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="p-4 bg-card rounded-lg">
                      <p className="text-sm text-muted-foreground mb-2">Using as:</p>
                      <p className="font-medium text-foreground">Guest User</p>
                      <p className="text-xs text-muted-foreground mt-1">Sign in to save your data across devices</p>
                    </div>
                    <Button
                      onClick={() => navigate("/auth")}
                      className="w-full mt-4"
                    >
                      <User className="w-4 h-4 mr-2" />
                      Sign In
                    </Button>
                  </>
                )}
              </div>
            </div>
            <InviteCollaborator />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans pb-20">
      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* Header */}
      <div className="bg-gradient-primary px-6 py-4 text-white">
        <div className="max-w-md mx-auto">
          {activeTab === "home" && (
            <>
              {user && <BabyAge />}
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

      {/* Add Activity Modal */}
      <AddActivityModal 
        onAddActivity={handleAddActivity} 
        isOpen={isAddModalOpen} 
        onClose={() => setIsAddModalOpen(false)} 
      />

      {/* Chat Panel */}
      <ChatPanel 
        activities={activities}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        onAddActivity={() => setIsAddModalOpen(true)}
      />
    </div>
  );
};

export default Index;