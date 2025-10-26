import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ActivityCard, Activity } from "@/components/ActivityCard";
import { AddActivityModal } from "@/components/AddActivityModal";
import { BottomNavigation } from "@/components/BottomNavigation";
import { InsightsTab } from "@/components/InsightsTab";
import { HomeTab } from "@/components/HomeTab";
import { Settings as SettingsPage } from "@/pages/Settings";
import { Helper } from "@/components/Helper";
import { NightDoulaReview } from "@/components/NightDoulaReview";
import { ReportConfigModal, ReportConfig } from "@/components/ReportConfigModal";
import { PediatricianReportModal } from "@/components/PediatricianReportModal";

import { NextActivityPrediction } from "@/components/NextActivityPrediction";
import { TrendChart } from "@/components/TrendChart";
import { SleepChart } from "@/components/SleepChart";
import { WeeklyReflection } from "@/components/WeeklyReflection";

import { useActivities } from "@/hooks/useActivities";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useActivityPercentile } from "@/hooks/useActivityPercentile";
import { useToast } from "@/hooks/use-toast";
import { useActivityUndo } from "@/hooks/useActivityUndo";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { detectNightSleep, getWakeTime } from "@/utils/nightSleepDetection";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Settings, Undo2, Filter, Share, Sprout, X, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useLanguage } from "@/contexts/LanguageContext";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
 
const Index = () => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const { userProfile } = useUserProfile();
  const { nightSleepEndHour } = useNightSleepWindow();
  const {
    household, 
    collaborators,
    loading: householdLoading,
    error: householdError,
    refetch: refetchHousehold
  } = useHousehold();
  const { 
    activities: dbActivities, 
    loading: activitiesLoading, 
    refetch: refetchActivities,
    deleteActivity
  } = useActivities();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { trackCreate, trackUpdate, trackDelete, undo, canUndo, undoCount } = useActivityUndo();
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [babyProfile, setBabyProfile] = useState<{ name: string; birthday?: string } | null>(null);
  const [hasEverBeenCollaborator, setHasEverBeenCollaborator] = useState<boolean | null>(null);

  // Convert database activities to UI activities
  const activities: Activity[] = user && household && dbActivities 
    ? dbActivities.map(dbActivity => {
        // Use displayTime from details if available (for consistent display), 
        // otherwise fall back to converting logged_at
        let displayTime = dbActivity.details.displayTime;
        
        if (!displayTime) {
          displayTime = new Date(dbActivity.logged_at).toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit', 
            hour12: true 
          });
        }

        // For naps, show start-end time range
        if (dbActivity.type === 'nap' && dbActivity.details.startTime && dbActivity.details.endTime) {
          // Ensure endTime is valid (avoid :60)
          const normalizedEnd = dbActivity.details.endTime?.replace(/:(60)\b/, ':55');
          displayTime = `${dbActivity.details.startTime} - ${normalizedEnd}`;
        }

        return {
          id: dbActivity.id,
          type: dbActivity.type as 'feed' | 'diaper' | 'nap' | 'note' | 'measure' | 'photo',
          time: displayTime,
          loggedAt: dbActivity.logged_at, // Preserve the original timestamp
          details: dbActivity.details
        };
      })
    : [];

  // Calculate activity percentile
  const { percentile, showBadge } = useActivityPercentile(household?.id, activities.length);

const [justEndedNapId, setJustEndedNapId] = useState<string | null>(null);
// Show wake-up for open naps from today or yesterday only (ignore older accidentally open naps)
const yesterdayStart = new Date(); 
yesterdayStart.setDate(yesterdayStart.getDate() - 1);
yesterdayStart.setHours(0, 0, 0, 0);
const ongoingNap = activities
  .filter(a => a.type === 'nap' && a.details?.startTime && !a.details?.endTime && a.id !== justEndedNapId && new Date(a.loggedAt!) >= yesterdayStart)
  .sort((a, b) => new Date(b.loggedAt!).getTime() - new Date(a.loggedAt!).getTime())[0];

  // Get current user's role from collaborators
  const currentUserRole = collaborators.find(c => c.user_id === user?.id)?.role;
  
  const [activeTab, setActiveTab] = useState("home");
  
  // Set default tab based on user role
  useEffect(() => {
    if (currentUserRole === 'caregiver') {
      setActiveTab("insights");
    }
  }, [currentUserRole]);
  const [previousTab, setPreviousTab] = useState("home"); // Track previous tab for settings navigation
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [prefillActivity, setPrefillActivity] = useState<Activity | null>(null);
  const [quickAddType, setQuickAddType] = useState<'feed' | 'nap' | 'diaper' | null>(null);
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>(['feed', 'diaper', 'nap', 'note', 'measure', 'photo']);
  const [showReportConfig, setShowReportConfig] = useState(false);
  const [reportConfig, setReportConfig] = useState<ReportConfig | undefined>();
  const [showReportShare, setShowReportShare] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState(false);
  const [recentCollaboratorActivity, setRecentCollaboratorActivity] = useState<{
    userName: string;
    activityType: string;
    timestamp: Date;
  } | null>(null);
  

  // Handle scroll for header fade effect
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Auto-dismiss collaborator activity notification after 15 seconds
  useEffect(() => {
    if (recentCollaboratorActivity) {
      const timer = setTimeout(() => {
        setRecentCollaboratorActivity(null);
      }, 15000);
      return () => clearTimeout(timer);
    }
  }, [recentCollaboratorActivity]);

  // Listen for realtime activity updates from collaborators
  useEffect(() => {
    if (!household?.id || !user?.id) return;

    const channel = supabase
      .channel('activity-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'activities',
          filter: `household_id=eq.${household.id}`
        },
        async (payload) => {
          const newActivity = payload.new as any;
          
          // Only show notification if activity was created by someone else
          if (newActivity.created_by !== user.id) {
            // Find the collaborator who created this activity
            const creator = collaborators.find(c => c.user_id === newActivity.created_by);
            
            if (creator?.profiles?.full_name) {
              const activityTypeMap: Record<string, string> = {
                feed: 'fed',
                diaper: 'changed',
                nap: 'logged a nap for',
                note: 'added a note about',
                measure: 'measured',
                photo: 'added a photo of'
              };
              
              const actionText = activityTypeMap[newActivity.type] || 'logged an activity for';
              
              setRecentCollaboratorActivity({
                userName: creator.profiles.full_name.split(' ')[0],
                activityType: actionText,
                timestamp: new Date(newActivity.logged_at)
              });

              // Also refetch activities to update the list
              refetchActivities();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [household?.id, user?.id, collaborators, refetchActivities]);

  // Check if user has ever been a collaborator (reliable indicator they're not new)
  useEffect(() => {
    if (!user) {
      setHasEverBeenCollaborator(null);
      return;
    }

    const checkCollaboratorHistory = async () => {
      const { data } = await supabase
        .from('collaborators')
        .select('id')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();
      
      setHasEverBeenCollaborator(!!data);
    };

    checkCollaboratorHistory();
  }, [user]);

  // Check household status and redirect new users to setup
  useEffect(() => {
    if (loading || householdLoading || hasEverBeenCollaborator === null) return;
    if (!user) return;

    if (household) {
      // User has a household - load profile
      setBabyProfile({ 
        name: household.baby_name || '', 
        birthday: household.baby_birthday || undefined 
      });
      setHasProfile(true);
    } else if (!householdError && !hasEverBeenCollaborator) {
      // Truly new user (never been a collaborator) with no household - needs setup
      navigate('/onboarding/baby-setup');
    }
  }, [user, loading, householdLoading, household, householdError, hasEverBeenCollaborator, navigate]);

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

      // Get user's current timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

      // Combine selected date with selected time
      let loggedAt: string;
      let displayTime = activityTime; // Store the original selected time for display
      
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
          
          // Create a local date-time
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
          // Fallback: use current local time (rounded to 5 mins) on selected date
          const now = new Date();
          const rounded = Math.round(now.getMinutes() / 5) * 5;
          const safeMins = Math.min(55, Math.max(0, rounded));
          combinedDateTime = new Date(
            activityDate.getFullYear(),
            activityDate.getMonth(),
            activityDate.getDate(),
            now.getHours(),
            safeMins,
            0,
            0
          );
          // Ensure display time is consistent
          displayTime = combinedDateTime.toLocaleTimeString("en-US", { 
            hour: "numeric", 
            minute: "2-digit", 
            hour12: true 
          });
        }
        
        // Store as local time without 'Z' suffix
        const year = combinedDateTime.getFullYear();
        const month = String(combinedDateTime.getMonth() + 1).padStart(2, '0');
        const day = String(combinedDateTime.getDate()).padStart(2, '0');
        const hour = String(combinedDateTime.getHours()).padStart(2, '0');
        const minute = String(combinedDateTime.getMinutes()).padStart(2, '0');
        loggedAt = `${year}-${month}-${day}T${hour}:${minute}:00`;
      } else {
        // Default to now in local time
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hour = String(now.getHours()).padStart(2, '0');
        const minute = String(now.getMinutes()).padStart(2, '0');
        loggedAt = `${year}-${month}-${day}T${hour}:${minute}:00`;
        
        displayTime = now.toLocaleTimeString("en-US", { 
          hour: "numeric", 
          minute: "2-digit",
          hour12: true 
        });
      }

      // Store the display time in details for consistent display
      const detailsWithTime = {
        ...details,
        displayTime: displayTime
      };

      const { data, error } = await supabase.from('activities').insert({
        household_id: householdId,
        type,
        logged_at: loggedAt,
        timezone,
        details: detailsWithTime,
        created_by: user.id
      }).select().single();

      if (error) throw error;

      // Track for undo
      if (data) {
        trackCreate({
          id: data.id,
          type: data.type,
          logged_at: data.logged_at,
          details: data.details,
          household_id: data.household_id,
          created_by: data.created_by
        });
      }

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

  const markWakeUp = async () => {
    console.log('markWakeUp called, ongoingNap:', ongoingNap);
    if (!ongoingNap) {
      console.log('No ongoing nap found');
      return;
    }
    // Hide the button immediately to avoid lingering UI while we save
    setJustEndedNapId(ongoingNap.id);
    try {
      const now = new Date();
      const rounded = Math.round(now.getMinutes() / 5) * 5;
      const safeMins = Math.min(55, Math.max(0, rounded));
      const endStr = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        now.getHours(),
        safeMins,
        0,
        0
      ).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });

      console.log('Updating nap with endTime:', endStr);
      const { error } = await supabase
        .from('activities')
        .update({ details: { ...ongoingNap.details, endTime: endStr } })
        .eq('id', ongoingNap.id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      console.log('Successfully updated nap');
      toast({ title: "Saved", description: `${babyProfile?.name || 'Baby'} woke up at ${endStr}` });
      refetchActivities();
      // Clear the temporary hide after refresh
      setTimeout(() => setJustEndedNapId(null), 1500);
    } catch (e) {
      console.error('Error in markWakeUp:', e);
      setJustEndedNapId(null);
      toast({ title: "Error", description: "Could not mark wake-up", variant: "destructive" });
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "home":
        return <HomeTab 
          activities={activities} 
          babyName={babyProfile?.name}
          babyBirthday={babyProfile?.birthday}
          userName={userProfile?.full_name?.split(' ')[0]}
          onAddActivity={(type, prefill) => {
            // Quick add with prefill data from last activity
            setQuickAddType(type || null);
            setPrefillActivity(prefill || null);
            setShowAddActivity(true);
          }}
          onEditActivity={(activity) => {
            // Edit existing activity
            setEditingActivity(activity);
          }}
          addActivity={addActivity}
          onEndNap={markWakeUp}
          ongoingNap={ongoingNap}
          userRole={currentUserRole}
          showBadge={showBadge}
          percentile={percentile}
        />;
      case "trends":
        return (
          <div className="px-4 py-6 space-y-6">
            {/* Trends Header */}
            <div className="space-y-1">
              <h2 className="text-[18px] font-semibold text-foreground">
                This week's rhythm at a glance.
              </h2>
            </div>
            <WeeklyReflection activities={activities} />
            <TrendChart activities={activities} />
            <SleepChart activities={activities} />
          </div>
        );
    case "helper":
      return <Helper 
        activities={activities.map(a => ({
          id: a.id,
          type: a.type,
          logged_at: a.loggedAt,
          details: a.details
        }))} 
        babyBirthDate={babyProfile?.birthday ? new Date(babyProfile.birthday) : undefined}
        onGoToSettings={() => {
          setPreviousTab(activeTab);
          setActiveTab("settings");
        }}
      />;
    case "settings":
      return <SettingsPage />;
      case "insights":
        return (
          <>
            {/* Log Header */}
            <div className="px-4 pt-6 pb-4 space-y-3 border-b border-border">
              <div className="flex items-center justify-between">
                <h2 className="text-[18px] font-medium text-foreground">
                  Today · {new Date().toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                </h2>
                
                {/* Filter and Export Buttons */}
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48 bg-background">
                      <div className="p-2 space-y-1">
                        <DropdownMenuCheckboxItem
                          checked={selectedActivityTypes.includes('feed')}
                          onCheckedChange={(checked) => {
                            setSelectedActivityTypes(prev => 
                              checked ? [...prev, 'feed'] : prev.filter(t => t !== 'feed')
                            );
                          }}
                        >
                          Feed
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={selectedActivityTypes.includes('diaper')}
                          onCheckedChange={(checked) => {
                            setSelectedActivityTypes(prev => 
                              checked ? [...prev, 'diaper'] : prev.filter(t => t !== 'diaper')
                            );
                          }}
                        >
                          Diaper
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={selectedActivityTypes.includes('nap')}
                          onCheckedChange={(checked) => {
                            setSelectedActivityTypes(prev => 
                              checked ? [...prev, 'nap'] : prev.filter(t => t !== 'nap')
                            );
                          }}
                        >
                          Nap
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={selectedActivityTypes.includes('note')}
                          onCheckedChange={(checked) => {
                            setSelectedActivityTypes(prev => 
                              checked ? [...prev, 'note'] : prev.filter(t => t !== 'note')
                            );
                          }}
                        >
                          Note
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={selectedActivityTypes.includes('measure')}
                          onCheckedChange={(checked) => {
                            setSelectedActivityTypes(prev => 
                              checked ? [...prev, 'measure'] : prev.filter(t => t !== 'measure')
                            );
                          }}
                        >
                          Measure
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuCheckboxItem
                          checked={selectedActivityTypes.includes('photo')}
                          onCheckedChange={(checked) => {
                            setSelectedActivityTypes(prev => 
                              checked ? [...prev, 'photo'] : prev.filter(t => t !== 'photo')
                            );
                          }}
                        >
                          Photo
                        </DropdownMenuCheckboxItem>
                      </div>
                      
                      <div className="border-t border-border mt-2 pt-2 px-2 pb-2 flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setSelectedActivityTypes([])}
                        >
                          Clear
                        </Button>
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => setSelectedActivityTypes(['feed', 'diaper', 'nap', 'note', 'measure', 'photo'])}
                        >
                          All
                        </Button>
                      </div>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 w-8 p-0"
                    onClick={() => setShowReportConfig(true)}
                  >
                    <Share className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              
              {/* Quick Summary Line with Time-based Emoji */}
              <p className="text-[13px] text-muted-foreground flex items-center gap-2">
                <span className="text-base">
                  {(() => {
                    const hour = new Date().getHours();
                    if (hour >= 5 && hour < 12) return "🌤";
                    if (hour >= 12 && hour < 18) return "🌇";
                    return "🌙";
                  })()}
                </span>
                {(() => {
                  const today = new Date();
                  const todayKey = today.getFullYear() + '-' + 
                                 String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                                 String(today.getDate()).padStart(2, '0');
                  
                  const todayActivities = activities.filter(a => {
                    if (!a.loggedAt) return false;
                    const activityDate = new Date(a.loggedAt);
                    const y = activityDate.getFullYear();
                    const m = String(activityDate.getMonth() + 1).padStart(2, '0');
                    const d = String(activityDate.getDate()).padStart(2, '0');
                    return `${y}-${m}-${d}` === todayKey;
                  });
                  
                  const naps = todayActivities.filter(a => a.type === 'nap' && a.details.endTime).length;
                  const feeds = todayActivities.filter(a => a.type === 'feed').length;
                  const diapers = todayActivities.filter(a => a.type === 'diaper').length;
                  
                  return (
                    <>
                      <span className="animate-in fade-in duration-300">{naps} naps</span>
                      <span>·</span>
                      <span className="animate-in fade-in duration-300 delay-75">{feeds} feeds</span>
                      <span>·</span>
                      <span className="animate-in fade-in duration-300 delay-150">{diapers} diapers</span>
                    </>
                  );
                })()}
              </p>
            </div>
            
            {/* Activities Timeline */}
            <div className="px-4 py-4">              
              <div className="space-y-4 pb-20">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>{t('noActivitiesStartAdding')}</p>
                  </div>
                ) : (
                  (() => {
                    // Filter activities by selected types
                    const filteredActivities = activities.filter(activity => 
                      selectedActivityTypes.includes(activity.type)
                    );
                    
                    // Show message if filter results in no activities
                    if (filteredActivities.length === 0) {
                      return (
                        <div className="text-center py-8 text-muted-foreground">
                          <p>No activities match the selected filters.</p>
                        </div>
                      );
                    }
                    
                    // Group activities by date
                    const activityGroups: { [date: string]: typeof filteredActivities } = {};
                    
                     filteredActivities.forEach(activity => {
                       // Use the logged_at date for grouping activities by day
                       const activityDate = new Date(activity.loggedAt!);
                        // Build a YYYY-MM-DD key in local time (avoid UTC shifting)
                        const y = activityDate.getFullYear();
                        const m = String(activityDate.getMonth() + 1).padStart(2, '0');
                        const d = String(activityDate.getDate()).padStart(2, '0');
                        const localDateString = `${y}-${m}-${d}`;
                      
                      if (!activityGroups[localDateString]) {
                        activityGroups[localDateString] = [];
                      }
                      activityGroups[localDateString].push(activity);
                    });

                    // Sort activities within each date group by actual activity time (descending - newest first)
                    Object.keys(activityGroups).forEach(dateKey => {
                      activityGroups[dateKey].sort((a, b) => {
                        const getActivityTime = (activity: any) => {
                          try {
                            // Parse UI time strings (handles "7:05 AM" or "7:05 AM - 8:15 AM")
                            const parseUI12hToMinutes = (timeStr?: string | null): number | null => {
                              if (!timeStr) return null;
                              const first = timeStr.includes(' - ') ? timeStr.split(' - ')[0] : timeStr;
                              const m = first.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                              if (!m) return null;
                              let h = parseInt(m[1], 10);
                              const mins = parseInt(m[2], 10);
                              const period = m[3].toUpperCase();
                              if (period === 'PM' && h !== 12) h += 12;
                              if (period === 'AM' && h === 12) h = 0;
                              return h * 60 + mins;
                            };
                            
                            const base = new Date(activity.loggedAt!);
                            let minutes: number | null = null;
                            
                            // Priority: startTime (naps) > displayTime > fallback to logged_at
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
                            console.error('Error parsing activity time:', error, activity);
                            return new Date(activity.loggedAt!).getTime();
                          }
                        };

                        return getActivityTime(b) - getActivityTime(a); // Reverse chronological (newest first)
                      });
                    });

                    const sortedDates = Object.keys(activityGroups).sort((a, b) => b.localeCompare(a));

                    // Filter dates based on showFullTimeline
                    const today = new Date();
                    const yesterday = new Date(Date.now() - 86400000);
                    const todayKey = today.getFullYear() + '-' + 
                                   String(today.getMonth() + 1).padStart(2, '0') + '-' + 
                                   String(today.getDate()).padStart(2, '0');
                    const yesterdayKey = yesterday.getFullYear() + '-' + 
                                       String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + 
                                       String(yesterday.getDate()).padStart(2, '0');

                    const visibleDates = showFullTimeline ? sortedDates : sortedDates.slice(0, 2);

                    return (
                      <>
                        {visibleDates.map((dateKey, index) => {
                          // Parse dateKey (YYYY-MM-DD) as local date, not UTC
                          const [year, month, day] = dateKey.split('-').map(Number);
                          const date = new Date(year, month - 1, day);
                          
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
                                  {(() => {
                                    // Detect night sleep across ALL activities (to find overnight sleep)
                                    const allActivities = filteredActivities;
                                    const nightSleep = detectNightSleep(allActivities, nightSleepEndHour);
                                    const wakeTime = nightSleep ? getWakeTime(nightSleep) : null;
                                    
                                    // Determine which date section should show the wake-up indicator
                                    let wakeUpDateKey: string | null = null;
                                    if (nightSleep && wakeTime) {
                                      const sleepDate = new Date(nightSleep.loggedAt!);
                                      const sleepStartTime = nightSleep.details?.startTime;
                                      
                                      // Parse times to check if it crossed midnight
                                      const parseTime = (timeStr: string): number => {
                                        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                                        if (!match) return 0;
                                        let h = parseInt(match[1], 10);
                                        const period = match[3].toUpperCase();
                                        if (period === 'PM' && h !== 12) h += 12;
                                        if (period === 'AM' && h === 12) h = 0;
                                        return h;
                                      };
                                      
                                      const endHour = parseTime(wakeTime);
                                      const startHour = sleepStartTime ? parseTime(sleepStartTime) : null;
                                      
                                      // Determine if sleep crossed midnight:
                                      // - If start is evening (>= 18) and end is morning (< 12), it crossed midnight
                                      // - OR if end hour is less than start hour, it crossed midnight
                                      let crossedMidnight = false;
                                      if (startHour !== null) {
                                        crossedMidnight = (startHour >= 18 && endHour < 12) || (endHour < startHour);
                                      }
                                      
                                      const wakeUpDate = crossedMidnight 
                                        ? new Date(sleepDate.getTime() + 24 * 60 * 60 * 1000) // Next day
                                        : sleepDate;
                                      
                                      wakeUpDateKey = `${wakeUpDate.getFullYear()}-${String(wakeUpDate.getMonth() + 1).padStart(2, '0')}-${String(wakeUpDate.getDate()).padStart(2, '0')}`;
                                      
                                      console.log('Wake-up detection:', {
                                        sleepDate: sleepDate.toLocaleDateString(),
                                        startHour,
                                        endHour,
                                        crossedMidnight,
                                        wakeUpDateKey,
                                        currentDateKey: dateKey
                                      });
                                    }
                                    
                                    const dayActivities = activityGroups[dateKey];
                                    const showWakeUpHere = wakeUpDateKey === dateKey;
                                    
                                    return (
                                      <>
                                        {dayActivities.map((activity) => (
                                          <ActivityCard
                                            key={activity.id}
                                            activity={activity}
                                            babyName={babyProfile?.name}
                                            onEdit={(clickedActivity) => {
                                              console.log('Clicked activity:', clickedActivity);
                                              setEditingActivity(clickedActivity);
                                            }}
                                            onDelete={async (activityId) => {
                                              try {
                                                // Get activity data before deleting for undo tracking
                                                const { data: activityToDelete } = await supabase
                                                  .from('activities')
                                                  .select('*')
                                                  .eq('id', activityId)
                                                  .single();

                                                await deleteActivity(activityId);

                                                // Track for undo
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
                                        ))}
                                        
                                        {/* Wake-up indicator - show in the date section where the wake-up happened */}
                                        {showWakeUpHere && nightSleep && wakeTime && (
                                          <div className="flex items-center gap-2 py-2 pl-4 ml-4 border-l-2 border-amber-500/30">
                                            <Sun className="h-4 w-4 text-amber-500 flex-shrink-0" />
                                            <span className="text-sm text-muted-foreground italic">
                                              {babyProfile?.name?.split(' ')[0] || 'Baby'} woke up at {wakeTime}
                                            </span>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              
                            </div>
                          );
                        })}

                        {/* Show More/Less Button with gradient overlay */}
                        {sortedDates.length > visibleDates.length && !showFullTimeline && (
                          <div className="relative pt-8">
                            {/* Gradient overlay */}
                            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-background/0 to-background pointer-events-none" />
                            <div className="text-center relative">
                              <button
                                onClick={() => setShowFullTimeline(!showFullTimeline)}
                                className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-accent"
                              >
                                {`${t('showMoreDays')} ${sortedDates.length - visibleDates.length} ${t('moreDays')}`}
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Show less button when expanded */}
                        {showFullTimeline && sortedDates.length > 2 && (
                          <div className="text-center pt-4">
                            <button
                              onClick={() => setShowFullTimeline(false)}
                              className="text-sm text-muted-foreground hover:text-foreground transition-colors px-4 py-2 rounded-md hover:bg-accent"
                            >
                              {t('showLess')}
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

  if (loading || householdLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <LoadingSpinner size="lg" className="mx-auto" />
          <p className="text-foreground/90 font-medium">
            {householdLoading ? 'Loading your household…' : 'Loading…'}
          </p>
        </div>
      </div>
    );
  }

  // Show error state with retry option
  if (user && !household && !householdLoading && householdError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-semibold">Connection Issue</h2>
          <p className="text-muted-foreground">{householdError}</p>
          <Button
            onClick={() => {
              try { localStorage.removeItem('active_household_id'); } catch {}
              refetchHousehold();
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  // If authenticated but no household exists (not an error, just no data)
  if (user && !household && !householdLoading && !householdError) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center space-y-4">
          <h2 className="text-xl font-semibold">{t('noHouseholdFound')}</h2>
          <p className="text-muted-foreground">{t('letsSetupHousehold')}</p>
          <Button onClick={() => navigate('/onboarding')}>{t('goToOnboarding')}</Button>
        </div>
      </div>
    );
  }
return (
    <ErrorBoundary onRetry={() => { refetchHousehold(); refetchActivities(); }}>
      <div className="min-h-screen bg-background pb-16 overflow-x-hidden w-full">
        <div className={`sticky top-0 z-30 bg-background border-b border-[#E5E7EB] dark:border-[#1F2937] h-16 flex items-center scroll-fade ${isScrolled ? 'scrolled' : ''}`}>
          <div className="flex items-center justify-between w-full px-4">
            <div className="flex items-center gap-3">
              {babyProfile?.name && (
                <>
                  <span className="text-muted-foreground">·</span>
                  <p className="text-sm font-medium text-[#374151] dark:text-[#9BA3AA]">
                    {babyProfile.name} · {babyProfile.birthday ? (() => {
                      const birthDate = new Date(babyProfile.birthday);
                      const today = new Date();
                      const ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
                      
                      // Calculate weeks from the last full month boundary
                      const lastMonthDate = new Date(birthDate);
                      lastMonthDate.setMonth(birthDate.getMonth() + ageInMonths);
                      const daysSinceLastMonth = Math.floor((today.getTime() - lastMonthDate.getTime()) / (1000 * 60 * 60 * 24));
                      const weeks = Math.floor(daysSinceLastMonth / 7);
                      
                      return ageInMonths === 0 ? `${weeks} ${weeks === 1 ? 'week' : 'weeks'}` : `${ageInMonths} ${ageInMonths === 1 ? 'month' : 'months'}${weeks > 0 ? ` ${weeks}w` : ''}`;
                    })() : 'age unknown'}
                  </p>
                </>
              )}
            </div>
              <div className="flex items-center gap-2">
              {canUndo && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={async () => {
                    const success = await undo();
                    if (success) {
                      toast({
                        title: "Undone",
                        description: `${undoCount - 1} action${undoCount - 1 !== 1 ? 's' : ''} remaining`,
                      });
                      refetchActivities();
                    } else {
                      toast({
                        title: "Error",
                        description: "Could not undo action",
                        variant: "destructive"
                      });
                    }
                  }}
                  className="p-2"
                >
                  <Undo2 className="h-5 w-5" />
                </Button>
              )}
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
        </div>

        {showReportShare && (
          <div className="sticky top-16 z-20 bg-primary/10 text-foreground border-b border-border px-4 py-2 text-sm text-center">
            Generating report…
          </div>
        )}

        {activeTab === 'home' && recentCollaboratorActivity && (
          <div className="sticky top-16 z-20 bg-accent/80 text-foreground border-b border-border px-4 py-2 text-sm text-center animate-in slide-in-from-top">
            <span className="font-medium">{recentCollaboratorActivity.userName}</span> just {recentCollaboratorActivity.activityType} {babyProfile?.name || 'baby'}
            <button
              onClick={() => setRecentCollaboratorActivity(null)}
              className="ml-2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3 w-3 inline" />
            </button>
          </div>
        )}

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
          onAddActivity={() => setShowVoiceRecorder(true)}
        />

        {/* Add Activity Modal */}
        <AddActivityModal
          isOpen={showAddActivity || !!editingActivity}
          onClose={() => {
            setShowAddActivity(false);
            setEditingActivity(null);
            setPrefillActivity(null);
            setQuickAddType(null);
          }}
          editingActivity={editingActivity}
          quickAddType={quickAddType}
          prefillActivity={prefillActivity}
          householdId={household?.id}
          activities={activities}
          onAddActivity={async (activity, activityDate, activityTime) => {
            await addActivity(activity.type, activity.details, activityDate, activityTime);
            setShowAddActivity(false);
            setPrefillActivity(null);
            setQuickAddType(null);
          }}
          onEditActivity={async (updatedActivity, selectedDate, activityTime) => {
            try {
              // Get current state for undo tracking
              const { data: currentActivity } = await supabase
                .from('activities')
                .select('*')
                .eq('id', updatedActivity.id)
                .single();

              if (!currentActivity) {
                throw new Error('Activity not found');
              }

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
              
              // Get user's current timezone
              const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
              
              // Store as local time without 'Z' suffix (same as addActivity)
              const year = combinedDateTime.getFullYear();
              const month = String(combinedDateTime.getMonth() + 1).padStart(2, '0');
              const day = String(combinedDateTime.getDate()).padStart(2, '0');
              const hour = String(combinedDateTime.getHours()).padStart(2, '0');
              const minute = String(combinedDateTime.getMinutes()).padStart(2, '0');
              const loggedAt = `${year}-${month}-${day}T${hour}:${minute}:00`;

              // Preserve household_id and created_by from original activity
              const { error } = await supabase
                .from('activities')
                .update({
                  type: updatedActivity.type,
                  logged_at: loggedAt,
                  timezone,
                  details: {
                    ...updatedActivity.details,
                    displayTime: activityTime // Store display time for consistent display
                  },
                  household_id: currentActivity.household_id,
                  created_by: currentActivity.created_by
                })
                .eq('id', updatedActivity.id)
                .eq('household_id', currentActivity.household_id); // Additional safety check
              
              if (error) {
                console.error('Update error:', error);
                throw error;
              }

              // Track for undo
              if (currentActivity) {
                trackUpdate(
                  {
                    id: updatedActivity.id,
                    type: updatedActivity.type,
                    logged_at: loggedAt,
                    details: updatedActivity.details,
                    household_id: currentActivity.household_id,
                    created_by: currentActivity.created_by
                  },
                  {
                    id: currentActivity.id,
                    type: currentActivity.type,
                    logged_at: currentActivity.logged_at,
                    details: currentActivity.details,
                    household_id: currentActivity.household_id,
                    created_by: currentActivity.created_by
                  }
                );
              }

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
              // Get activity data before deleting for undo tracking
              const { data: activityToDelete } = await supabase
                .from('activities')
                .select('*')
                .eq('id', activityId)
                .single();

              await deleteActivity(activityId);

              // Track for undo
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

        <ReportConfigModal
          open={showReportConfig}
          onOpenChange={setShowReportConfig}
          babyName={babyProfile?.name}
          onGenerate={(config) => {
            setReportConfig(config);
            setShowReportConfig(false);
            setShowReportShare(true);
          }}
        />

        <PediatricianReportModal
          open={showReportShare}
          onOpenChange={(open) => {
            setShowReportShare(open);
            if (!open) setReportConfig(undefined);
          }}
          activities={activities}
          babyName={babyProfile?.name}
        />

        {/* Voice Recorder Modal */}
        <Dialog open={showVoiceRecorder} onOpenChange={(open) => {
          setShowVoiceRecorder(open);
          // Stop any ongoing recording when dialog closes
          if (!open) {
            const voiceRecorder = document.querySelector('[data-voice-recorder]');
            if (voiceRecorder) {
              // Trigger cleanup by forcing unmount
              setTimeout(() => {
                setShowVoiceRecorder(false);
              }, 100);
            }
          }
        }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Voice Log Activity</DialogTitle>
            </DialogHeader>
            <div className="py-8">
              <VoiceRecorder
                autoStart={true}
                 onActivityParsed={async (parsedActivities) => {
                  console.log('Activities to log:', parsedActivities);
                  setShowVoiceRecorder(false);
                  
                  // Process each activity
                  for (const parsedActivity of parsedActivities) {
                    console.log('Processing activity:', parsedActivity);
                    
                    // Parse time components from the local time string
                    // Format is like "2025-10-26T07:00:00" (no Z suffix)
                    const timeMatch = parsedActivity.time.match(/(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/);
                    let activityTime: string;
                    let activityDate: Date;
                    
                    if (timeMatch) {
                      const [_, year, month, day, hour24, minute] = timeMatch;
                      const hours = parseInt(hour24);
                      const mins = parseInt(minute);
                      
                      // Convert to 12-hour format for display
                      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
                      const period = hours >= 12 ? 'PM' : 'AM';
                      activityTime = `${hour12}:${minute} ${period}`;
                      
                      // Create date object in local timezone
                      activityDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), hours, mins, 0);
                    } else {
                      // Fallback to current time if parsing fails
                      const now = new Date();
                      activityDate = now;
                      activityTime = now.toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                        hour12: true
                      });
                    }
                    
                    // Handle "wake" type - end ongoing sleep
                    if (parsedActivity.type === 'wake') {
                      const ongoingSleep = activities.find(a => 
                        a.type === 'nap' && !a.details?.endTime
                      );
                      
                      if (ongoingSleep) {
                        try {
                          const { error } = await supabase
                            .from('activities')
                            .update({ details: { ...ongoingSleep.details, endTime: activityTime } })
                            .eq('id', ongoingSleep.id);

                          if (error) throw error;

                          toast({
                            title: 'Sleep Ended',
                            description: `${babyProfile?.name || 'Baby'} woke up at ${activityTime}`,
                          });
                          refetchActivities();
                        } catch (error) {
                          console.error('Error ending sleep:', error);
                          toast({
                            title: 'Error',
                            description: 'Could not end sleep',
                            variant: 'destructive',
                          });
                        }
                      } else {
                        toast({
                          title: 'No Ongoing Sleep',
                          description: 'Could not find an ongoing sleep to end.',
                          variant: 'destructive',
                        });
                      }
                    } else {
                      // For nap activities, ensure details.startTime is set
                      const processedDetails = { ...parsedActivity.details };
                      if (parsedActivity.type === 'nap') {
                        processedDetails.startTime = activityTime;
                      }
                      
                      // Add the activity normally with timezone from parsed data
                      await addActivity(
                        parsedActivity.type,
                        processedDetails,
                        activityDate,
                        activityTime
                      );
                    }
                  }
                  
                  // Show success toast
                  toast({
                    title: 'Activities Logged',
                    description: `Successfully logged ${parsedActivities.length} ${parsedActivities.length === 1 ? 'activity' : 'activities'}`,
                  });
                }}
              />
            </div>
            <div className="text-center text-sm text-muted-foreground space-y-1">
              <p className="text-xs">Recording will start automatically. Say something like:</p>
              <p className="text-xs font-medium">&ldquo;Fed 120ml bottle&rdquo; • &ldquo;Dirty diaper&rdquo; • &ldquo;Woke up at 7am&rdquo;</p>
            </div>
          </DialogContent>
        </Dialog>

      </div>
    </ErrorBoundary>
  );
};

export default Index;