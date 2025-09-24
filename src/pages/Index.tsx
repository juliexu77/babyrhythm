import { useState } from "react";
import { ActivityCard, Activity } from "@/components/ActivityCard";
import { AddActivityModal } from "@/components/AddActivityModal";
import { ChatPanel } from "@/components/ChatPanel";
import { SummaryCards } from "@/components/SummaryCards";
import { TrendChart } from "@/components/TrendChart";
import { DailySummary } from "@/components/DailySummary";
import { BottomNavigation } from "@/components/BottomNavigation";
import { Calendar, BarChart3, TrendingUp, User } from "lucide-react";

const Index = () => {
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
  const [activeTab, setActiveTab] = useState("today");

  const handleAddActivity = (newActivity: Omit<Activity, "id">) => {
    const activity: Activity = {
      ...newActivity,
      id: Date.now().toString(),
    };
    setActivities(prev => [activity, ...prev]);
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
      case "today":
        return (
          <div className="space-y-6">
            {/* Summary Cards */}
            <SummaryCards activities={activities} />

            {/* Activity Timeline */}
            <div className="space-y-4">
              <h2 className="text-xl font-serif font-medium text-foreground">Activity Timeline</h2>
              {sortedActivities.length === 0 ? (
                <div className="text-center py-16">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
                  <p className="text-muted-foreground font-medium mb-1">No activities yet today</p>
                  <p className="text-sm text-muted-foreground">Tap the + button to add your first activity</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {sortedActivities.map((activity) => (
                    <ActivityCard key={activity.id} activity={activity} />
                  ))}
                </div>
              )}
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
          <div className="text-center py-16">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-60" />
            <p className="text-muted-foreground font-medium mb-1">Profile & Settings</p>
            <p className="text-sm text-muted-foreground">Coming soon</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans pb-20">
      {/* Header */}
      <div className="bg-gradient-primary px-6 py-8 text-white">
        <div className="max-w-md mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="h-6 w-6" />
            <h1 className="text-2xl font-serif font-semibold">
              {activeTab === "today" ? "Today" : 
               activeTab === "trends" ? "Trends" :
               activeTab === "calendar" ? "Calendar" : "Profile"}
            </h1>
          </div>
          {activeTab === "today" && (
            <div className="flex items-center gap-2 text-white/90">
              <Calendar className="h-4 w-4" />
              <p className="text-sm font-medium">{today}</p>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-6 py-8">
        {renderContent()}
      </div>

      {/* Add Activity Button - only show on Today tab */}
      {activeTab === "today" && <AddActivityModal onAddActivity={handleAddActivity} />}

      {/* Chat Panel */}
      <ChatPanel 
        activities={activities}
        isOpen={isChatOpen}
        onToggle={() => setIsChatOpen(!isChatOpen)}
      />

      {/* Bottom Navigation */}
      <BottomNavigation activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;