import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ActivityCard, Activity } from "@/components/ActivityCard";
import { AddActivityModal } from "@/components/AddActivityModal";
import { BottomNavigation } from "@/components/BottomNavigation";
import { TrendsTab } from "@/components/TrendsTab";
import { HomeTab } from "@/components/HomeTab";
import { Settings as SettingsPage } from "@/pages/Settings";
import { RhythmTab } from "@/components/RhythmTab";
import { PediatricianReportModal } from "@/components/PediatricianReportModal";
import { ExportCSVModal } from "@/components/ExportCSVModal";

import { NextActivityPrediction } from "@/components/NextActivityPrediction";
import { TrendChart } from "@/components/TrendChart";
import { SleepChart } from "@/components/SleepChart";

import { useActivities } from "@/hooks/useActivities";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useActivityPercentile } from "@/hooks/useActivityPercentile";
import { useToast } from "@/hooks/use-toast";
import { useActivityUndo } from "@/hooks/useActivityUndo";
import { useNightSleepWindow } from "@/hooks/useNightSleepWindow";
import { getTodayActivities } from "@/utils/activityDateFilters";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, User, Undo2, Filter, Share, X, Sun, Bell, Settings } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuCheckboxItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
 
const Index = () => {
  const { user, loading } = useAuth();
  
  const { userProfile } = useUserProfile();
  const { nightSleepEndHour, nightSleepStartHour } = useNightSleepWindow();
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
    deleteActivity,
    addActivity: hookAddActivity,
    updateActivity: hookUpdateActivity
  } = useActivities();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { trackCreate, trackUpdate, trackDelete, undo, canUndo, undoCount } = useActivityUndo();
  const [hasProfile, setHasProfile] = useState<boolean>(false);
  const [babyProfile, setBabyProfile] = useState<{ name: string; birthday?: string } | null>(null);
  const [hasEverBeenCollaborator, setHasEverBeenCollaborator] = useState<boolean | null>(null);
  
  // Optimistic updates state
  const [justEndedNapId, setJustEndedNapId] = useState<string | null>(null);
  const [optimisticNapEndTimes, setOptimisticNapEndTimes] = useState<Record<string, string>>({});

  // Convert database activities to UI activities
  const rawActivities: Activity[] = dbActivities 
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
          type: dbActivity.type as 'feed' | 'diaper' | 'nap' | 'note' | 'solids' | 'photo',
          time: displayTime,
          loggedAt: dbActivity.logged_at, // Preserve the original timestamp
          timezone: dbActivity.timezone,   // Preserve the IANA timezone
          createdBy: dbActivity.created_by, // Track who created it
          details: dbActivity.details
        };
      })
    : [];

  // Enrich activities with isNightSleep flag and optimistic end times
  const activities = rawActivities.map(activity => {
    // Apply optimistic end time if pending
    if (activity.type === 'nap' && optimisticNapEndTimes[activity.id]) {
      activity = {
        ...activity,
        details: {
          ...activity.details,
          endTime: optimisticNapEndTimes[activity.id]
        }
      };
    }
    
    if (activity.type === 'nap') {
      // Detect night sleep based on user settings (fallback to 7 PM - 7 AM)
      const nightStart = nightSleepStartHour ?? 19; // Default 7 PM
      const nightEnd = nightSleepEndHour ?? 7; // Default 7 AM
      
      const parseTimeToMinutes = (timeStr: string): number | null => {
        const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return null;
        
        let hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const period = match[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        
        return hours * 60 + minutes;
      };
      
      const isInNightWindow = (timeMinutes: number): boolean => {
        const startMinutes = nightStart * 60;
        const endMinutes = nightEnd * 60;
        
        // Handle overnight window (e.g., 19:00 to 07:00)
        if (startMinutes > endMinutes) {
          return timeMinutes >= startMinutes || timeMinutes <= endMinutes;
        }
        // Handle same-day window
        return timeMinutes >= startMinutes && timeMinutes <= endMinutes;
      };
      
      const startTime = activity.details?.startTime;
      const endTime = activity.details?.endTime;
      
      let isNightSleep = false;
      
      if (startTime) {
        const startMinutes = parseTimeToMinutes(startTime);
        if (startMinutes !== null && isInNightWindow(startMinutes)) {
          isNightSleep = true;
        }
      }
      
      if (!isNightSleep && endTime) {
        const endMinutes = parseTimeToMinutes(endTime);
        if (endMinutes !== null && isInNightWindow(endMinutes)) {
          isNightSleep = true;
        }
      }
      
      return {
        ...activity,
        details: {
          ...activity.details,
          isNightSleep
        }
      };
    }
    
    return activity;
  });

  console.log('🏠 Index.tsx - Activities loaded:', {
    user: !!user,
    household: !!household,
    dbActivitiesCount: dbActivities?.length || 0,
    activitiesCount: activities.length,
    feedCount: activities.filter(a => a.type === 'feed').length,
    napCount: activities.filter(a => a.type === 'nap' && !a.details?.isNightSleep).length,
    sampleActivities: activities.slice(0, 3).map(a => ({ type: a.type, loggedAt: a.loggedAt }))
  });

  // Calculate activity percentile
  const { percentile, showBadge } = useActivityPercentile(household?.id, activities.length);

// Clear optimistic end times when activities update with actual end times from DB
useEffect(() => {
  if (Object.keys(optimisticNapEndTimes).length > 0) {
    const stillNeeded: Record<string, string> = {};
    Object.entries(optimisticNapEndTimes).forEach(([id, endTime]) => {
      // Check RAW activities from DB, not enriched activities (which already have optimistic endTime)
      const rawActivity = rawActivities.find(a => a.id === id);
      // Keep optimistic time if DB activity doesn't have endTime yet
      if (rawActivity && !rawActivity.details?.endTime) {
        stillNeeded[id] = endTime;
      }
    });
    if (Object.keys(stillNeeded).length !== Object.keys(optimisticNapEndTimes).length) {
      setOptimisticNapEndTimes(stillNeeded);
    }
  }
}, [rawActivities, optimisticNapEndTimes]);

// Helper: parse local date (YYYY-MM-DD) and 12h time (e.g., "7:15 PM") into a local Date
const parseLocalDateTime = (dateLocal: string, timeStr: string): Date => {
  const [year, month, day] = dateLocal.split('-').map(Number);
  const [time, periodRaw] = timeStr.split(' ');
  const [hStr, mStr] = time.split(':');
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || '0', 10);
  const period = (periodRaw || '').toUpperCase();
  if (period === 'PM' && h !== 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  const d = new Date();
  d.setFullYear(year, (month - 1), day);
  d.setHours(h, m, 0, 0);
  return d;
};

// Show wake-up only for open naps that started today OR yesterday if they're night sleeps
const todayStart = new Date();
todayStart.setHours(0, 0, 0, 0);
const yesterdayStart = new Date(todayStart);
yesterdayStart.setDate(yesterdayStart.getDate() - 1);
const now = new Date();
 
const ongoingNap = (() => {
  // Helper to check if time is in night window
  const nightStart = nightSleepStartHour ?? 19; // Default 7 PM
  const nightEnd = nightSleepEndHour ?? 7; // Default 7 AM
  
  console.log('🌙 Night sleep window:', { nightStart, nightEnd });
  
  const checkIsNightTime = (timeStr: string): boolean => {
    const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!match) return false;
    
    let hours = parseInt(match[1], 10);
    const period = match[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const startMinutes = nightStart * 60;
    const endMinutes = nightEnd * 60;
    const timeMinutes = hours * 60 + parseInt(match[2], 10);
    
    // Handle overnight window (e.g., 19:00 to 07:00)
    if (startMinutes > endMinutes) {
      const isNight = timeMinutes >= startMinutes || timeMinutes < endMinutes;
      console.log('🌙 Night check (overnight):', { timeStr, hours, timeMinutes, startMinutes, endMinutes, isNight });
      return isNight;
    }
    // Handle same-day window
    const isNight = timeMinutes >= startMinutes && timeMinutes < endMinutes;
    console.log('🌙 Night check (same-day):', { timeStr, hours, timeMinutes, startMinutes, endMinutes, isNight });
    return isNight;
  };
  
  const candidates = activities.filter(a => {
    if (a.type !== 'nap' || !a.details?.startTime || a.details?.endTime || a.id === justEndedNapId) {
      return false;
    }
    // Determine the activity's local date from details if available
    const dateLocal = (a.details as any).date_local as string | undefined;
    const baseLocalDate = dateLocal ? dateLocal : (() => {
      const d = new Date(a.loggedAt!);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    })();
    
    // Only consider naps from today OR yesterday if it's a night sleep
    const baseDateObj = new Date(baseLocalDate + 'T00:00:00');
    const isToday = baseDateObj >= todayStart;
    const isYesterday = baseDateObj >= yesterdayStart && baseDateObj < todayStart;
    
    // If from yesterday, must be a night sleep (start time between 6 PM and 9 AM)
    if (isYesterday) {
      const isNightSleep = a.details?.isNightSleep;
      return isNightSleep;
    }
    
    return isToday;
  }).map(a => {
    // Runtime check: ensure isNightSleep is set if start time is in night window
    const startTime = a.details?.startTime;
    let isNightSleep = a.details?.isNightSleep || false;
    
    console.log('🛌 Checking nap:', { 
      id: a.id, 
      startTime, 
      currentIsNightSleep: isNightSleep 
    });
    
    // If not already marked as night sleep, check the start time
    if (!isNightSleep && startTime) {
      isNightSleep = checkIsNightTime(startTime);
      console.log('🛌 After runtime check:', { startTime, isNightSleep });
    }
    
    return {
      ...a,
      details: {
        ...a.details,
        isNightSleep
      }
    };
  }).map(a => {
    const dateLocal = (a.details as any).date_local as string | undefined;
    const baseLocalDate = dateLocal ? dateLocal : (() => {
      const d = new Date(a.loggedAt!);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    })();
    const napStartTime = parseLocalDateTime(baseLocalDate, a.details!.startTime!);
    return { a, baseLocalDate, napStartTime, inPast: napStartTime <= now };
  });

  try {
    console.groupCollapsed('🛌 ongoingNap detection');
    console.log('nowLocal:', now.toLocaleString());
    candidates.forEach(({ a, baseLocalDate, napStartTime, inPast }) => {
      const loggedDate = new Date(a.loggedAt!);
      console.log({ id: a.id, startTime: a.details?.startTime, date_local: baseLocalDate, loggedAtLocal: loggedDate.toLocaleString(), napStartLocal: napStartTime.toLocaleString(), inPast });
    });
    console.groupEnd();
  } catch {}

  const valid = candidates.filter(c => c.inPast);
  return valid.sort((x, y) => new Date(y.a.loggedAt!).getTime() - new Date(x.a.loggedAt!).getTime())[0]?.a;
})();

  // Get current user's role from collaborators
  const currentUserRole = collaborators.find(c => c.user_id === user?.id)?.role;
  
  const [activeTab, setActiveTab] = useState("home");
  
  // Set default tab based on user role
  useEffect(() => {
    if (currentUserRole === 'caregiver') {
      setActiveTab("history");
    }
  }, [currentUserRole]);
  const [previousTab, setPreviousTab] = useState("home"); // Track previous tab for settings navigation
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [prefillActivity, setPrefillActivity] = useState<Activity | null>(null);
  const [quickAddType, setQuickAddType] = useState<'feed' | 'nap' | 'diaper' | null>(null);
  const [showFullTimeline, setShowFullTimeline] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedActivityTypes, setSelectedActivityTypes] = useState<string[]>(['feed', 'diaper', 'nap', 'note', 'solids', 'photo']);
  const [pendingActivityTypes, setPendingActivityTypes] = useState<string[]>(['feed', 'diaper', 'nap', 'note', 'solids', 'photo']);
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  
  const allActivityTypes = ['feed', 'diaper', 'nap', 'note', 'solids', 'photo'];
  const hasActiveFilters = selectedActivityTypes.length !== allActivityTypes.length;
  const [showPediatricianReport, setShowPediatricianReport] = useState(false);
  const [showCSVExport, setShowCSVExport] = useState(false);
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
                solids: 'fed solids to',
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
    
    if (!user) return; // Auth required

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

  // Auto-log wake up if enabled and it's past wake time
  useEffect(() => {
    const checkAutoLogWake = async () => {
      // Need user profile and activities loaded
      if (!userProfile || !activities.length || !household?.id || !user) return;
      
      const profile = userProfile as any;
      
      // Check if auto-log is enabled
      if (!profile.auto_log_wake_enabled) return;
      
      // Get wake time from profile (default 7:00 AM)
      const wakeHour = profile.night_sleep_end_hour ?? 7;
      const wakeMinute = profile.night_sleep_end_minute ?? 0;
      
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Check if it's past wake time today
      const isPastWakeTime = currentHour > wakeHour || (currentHour === wakeHour && currentMinute >= wakeMinute);
      if (!isPastWakeTime) return;
      
      // Find ongoing night sleep from today or yesterday
      const ongoingNightSleep = activities.find(a => {
        if (a.type !== 'nap' || a.details?.endTime) return false;
        return a.details?.isNightSleep === true;
      });
      
      if (!ongoingNightSleep) return;
      
      // Check if we've already auto-logged today (prevent duplicate auto-logs)
      const autoLogKey = `auto_wake_logged_${household.id}_${now.toDateString()}`;
      if (localStorage.getItem(autoLogKey)) return;
      
      // Format wake time for display
      const wakeTimeFormatted = `${wakeHour > 12 ? wakeHour - 12 : wakeHour || 12}:${wakeMinute.toString().padStart(2, '0')} ${wakeHour >= 12 ? 'PM' : 'AM'}`;
      
      // Update the ongoing nap with end time in details
      try {
        await hookUpdateActivity(ongoingNightSleep.id, {
          details: {
            ...ongoingNightSleep.details,
            endTime: wakeTimeFormatted,
            autoLogged: true
          }
        } as any);
        
        // Mark as auto-logged today
        localStorage.setItem(autoLogKey, 'true');
        
        toast({
          title: "Good morning! ☀️",
          description: `Auto-logged wake up at ${wakeTimeFormatted}`,
        });
        
        console.log('✅ Auto-logged wake up at', wakeTimeFormatted);
      } catch (error) {
        console.error('Failed to auto-log wake:', error);
      }
    };
    
    checkAutoLogWake();
  }, [userProfile, activities, household?.id, user, hookUpdateActivity, toast]);

  const handleProfileComplete = async () => {
    // Not needed anymore - household auto-created on login
    window.location.reload();
  };


  const addActivity = async (type: string, details: any = {}, activityDate?: Date, activityTime?: string) => {
    console.log('🚀 addActivity called with:', { type, activityDate, activityTime, details });
    
    // Use localStorage mode when no user
    if (!user) {
      console.log('💾 Saving to localStorage (no user)');
      
      // Create local activity using hook
      await hookAddActivity({
        type: type as any,
        time: activityTime || new Date().toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit', 
          hour12: true 
        }),
        details
      });
      
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

      // Parse the time to get hour24 and minute
      let hour24: number;
      let minute: number;
      let dateToUse: Date;
      
      console.log('🕐 Parsing time:', { activityDate, activityTime, hasActivityDate: !!activityDate, hasActivityTime: !!activityTime });
      
      if (activityDate && activityTime) {
        // Parse the time string (e.g., "7:00 AM")
        const timeMatch = activityTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        console.log('🔍 Time match result:', { activityTime, timeMatch });
        if (timeMatch) {
          let hours = parseInt(timeMatch[1], 10);
          const minutes = parseInt(timeMatch[2], 10);
          const period = timeMatch[3].toUpperCase();
          
          // Convert to 24-hour format
          if (period === 'PM' && hours !== 12) hours += 12;
          if (period === 'AM' && hours === 12) hours = 0;
          
          hour24 = hours;
          minute = minutes;
          dateToUse = activityDate;
        } else {
          // Fallback: use current local time
          const now = new Date();
          hour24 = now.getHours();
          minute = now.getMinutes();
          dateToUse = activityDate;
        }
      } else {
        // Default to now in local time
        const now = new Date();
        hour24 = now.getHours();
        minute = now.getMinutes();
        dateToUse = now;
      }

      // Format for server
      const dateLocal = `${dateToUse.getFullYear()}-${String(dateToUse.getMonth() + 1).padStart(2, '0')}-${String(dateToUse.getDate()).padStart(2, '0')}`;
      const timeLocal = `${String(hour24).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      const offsetMinutes = new Date().getTimezoneOffset();

      console.log('📤 Index.tsx calling create-activity:', {
        dateLocal,
        timeLocal,
        timezone,
        offsetMinutes,
        type,
        computedFrom: { hour24, minute, dateToUse: dateToUse.toISOString() }
      });

      // Call server function to create activity with proper UTC conversion
      const { data, error } = await supabase.functions.invoke('create-activity', {
        body: {
          household_id: householdId,
          type,
          date_local: dateLocal,
          time_local: timeLocal,
          tz: timezone,
          offset_minutes: offsetMinutes,
          details
        }
      });

      if (error) throw error;
      if (!data?.data) throw new Error('No data returned from server');

      // Track for undo
      trackCreate({
        id: data.data.id,
        type: data.data.type,
        logged_at: data.data.logged_at,
        details: data.data.details,
        household_id: data.data.household_id,
        created_by: data.data.created_by
      });

      // Refetch activities to update the list immediately
      await refetchActivities();
    } catch (error) {
      console.error('Error adding activity:', error);
      toast({
        title: "Error adding activity",
        description: "Please try again",
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
    
    const now = new Date();
    const endStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
    
    // Immediately apply optimistic update to local state
    setOptimisticNapEndTimes(prev => ({ ...prev, [ongoingNap.id]: endStr }));
    setJustEndedNapId(ongoingNap.id);
    
    try {
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
      
      // Refetch activities - optimistic state will be cleared by useEffect when real data arrives
      await refetchActivities();
      setJustEndedNapId(null);
    } catch (e) {
      console.error('Error in markWakeUp:', e);
      // Remove optimistic update on error
      setOptimisticNapEndTimes(prev => {
        const next = { ...prev };
        delete next[ongoingNap.id];
        return next;
      });
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
        return <TrendsTab activities={activities} />;
      case "rhythm":
        return (
          <ErrorBoundary onRetry={() => setActiveTab("home")}>
            <RhythmTab 
              activities={activities.map(a => ({
                id: a.id,
                type: a.type,
                logged_at: a.loggedAt || "",
                details: a.details
              }))} 
              onGoToSettings={() => {
                setPreviousTab(activeTab);
                setActiveTab("settings");
              }}
            />
          </ErrorBoundary>
        );
    case "settings":
      return <SettingsPage />;
    case "history":
        return (
          <div className="min-h-screen relative">
            {/* Soft studio-lighting gradient - whisper of warmth top to bottom */}
            <div className="absolute inset-0 bg-gradient-to-b from-[hsl(28,40%,94%)]/70 via-[hsl(25,35%,92%)]/40 to-transparent dark:from-transparent dark:via-transparent dusk:from-transparent dusk:via-transparent pointer-events-none" />
            
            {/* Action buttons - elegant style */}
            <div className="relative mx-4 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowPediatricianReport(true)}
                  className="text-sm text-[hsl(15,38%,52%)] dark:text-primary dusk:text-primary hover:opacity-80 transition-opacity font-medium"
                >
                  Pediatrician Report
                </button>
                <span className="text-[hsl(20,22%,78%)] dark:text-border dusk:text-border">•</span>
                <button 
                  onClick={() => setShowCSVExport(true)}
                  className="text-sm text-[hsl(15,38%,52%)] dark:text-primary dusk:text-primary hover:opacity-80 transition-opacity font-medium"
                >
                  Export CSV
                </button>
              </div>
            </div>
            
            {/* Activities Timeline - increased spacing */}
            <div className="relative px-4 py-4">
              <div className="space-y-6 pb-20">
                {activities.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>No activities yet. Start adding activities to see your timeline!</p>
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
                            displayDate = 'Today';
                          } else if (dateKey === yesterdayKey) {
                            displayDate = 'Yesterday';
                          } else {
                            displayDate = date.toLocaleDateString("en-US", { 
                              weekday: "long", 
                              month: "short", 
                              day: "numeric" 
                            });
                          }

                          return (
                            <div key={dateKey} className="mb-6">
                              {/* Day section with soft tonal block background - like warm paper */}
                              <div className="bg-[hsl(24,30%,91%)]/45 dark:bg-card/25 dusk:bg-card/40 rounded-xl px-3 py-3 -mx-1">
                                {/* Date Header - softer clay with increased letter spacing */}
                                <div className="flex items-center justify-between pb-2 pt-1">
                                  <h3 className="text-xs font-serif font-medium text-[hsl(20,25%,48%)] dark:text-foreground/80 dusk:text-foreground/80 uppercase tracking-widest">
                                    {displayDate}
                                  </h3>
                                  
                  {/* Filter Button - Show on first date (today) */}
                  {index === 0 && (
                    <DropdownMenu
                      open={showFilterDropdown} 
                      onOpenChange={(open) => {
                        setShowFilterDropdown(open);
                        // Sync pending types with current selection when opening
                        if (open) {
                          setPendingActivityTypes(selectedActivityTypes);
                        }
                      }}
                    >
                      <DropdownMenuTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 p-0 relative"
                        >
                          <Filter className="h-4 w-4" />
                          {hasActiveFilters && (
                            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                          )}
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 bg-background z-50">
                        <div className="p-2 space-y-1">
                          <DropdownMenuCheckboxItem
                            checked={pendingActivityTypes.includes('feed')}
                            onCheckedChange={(checked) => {
                              setPendingActivityTypes(prev => 
                                checked ? [...prev, 'feed'] : prev.filter(t => t !== 'feed')
                              );
                            }}
                          >
                            Feed
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={pendingActivityTypes.includes('diaper')}
                            onCheckedChange={(checked) => {
                              setPendingActivityTypes(prev => 
                                checked ? [...prev, 'diaper'] : prev.filter(t => t !== 'diaper')
                              );
                            }}
                          >
                            Diaper
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={pendingActivityTypes.includes('nap')}
                            onCheckedChange={(checked) => {
                              setPendingActivityTypes(prev => 
                                checked ? [...prev, 'nap'] : prev.filter(t => t !== 'nap')
                              );
                            }}
                          >
                            Nap
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={pendingActivityTypes.includes('note')}
                            onCheckedChange={(checked) => {
                              setPendingActivityTypes(prev => 
                                checked ? [...prev, 'note'] : prev.filter(t => t !== 'note')
                              );
                            }}
                          >
                            Note
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={pendingActivityTypes.includes('solids')}
                            onCheckedChange={(checked) => {
                              setPendingActivityTypes(prev => 
                                checked ? [...prev, 'solids'] : prev.filter(t => t !== 'solids')
                              );
                            }}
                          >
                            Solids
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={pendingActivityTypes.includes('photo')}
                            onCheckedChange={(checked) => {
                              setPendingActivityTypes(prev => 
                                checked ? [...prev, 'photo'] : prev.filter(t => t !== 'photo')
                              );
                            }}
                          >
                            Photo
                          </DropdownMenuCheckboxItem>
                        </div>
                        
                          <div className="border-t border-border mt-2 pt-2 px-2 pb-2 space-y-2">
                          <div className="flex gap-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => {
                                setPendingActivityTypes([]);
                              }}
                            >
                              Clear
                            </Button>
                            <Button 
                              variant="outline"
                              size="sm" 
                              className="flex-1"
                              onClick={() => {
                                setPendingActivityTypes(allActivityTypes);
                              }}
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
                                
                                {/* Activities for this date - more breathing room */}
                                <div className="relative space-y-2.5 pl-1">
                                {/* Continuous timeline line - warmed clay-rose */}
                                  <div className="absolute left-[20px] top-0 bottom-0 w-px bg-[hsl(18,25%,78%)] dark:bg-border/40 dusk:bg-border/40"></div>
                                  {(() => {
                                    // To detect night sleep for this day, we need to check:
                                    // 1. Sleeps that started TODAY and ended TODAY
                                    // 2. Sleeps that started YESTERDAY and ended TODAY
                                    
                                    // Parse current dateKey to get date
                                    const [year, month, day] = dateKey.split('-').map(Number);
                                    const currentDate = new Date(year, month - 1, day);
                                    
                                    // Get previous day's dateKey
                                    const previousDate = new Date(currentDate);
                                    previousDate.setDate(previousDate.getDate() - 1);
                                    const previousDateKey = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}-${String(previousDate.getDate()).padStart(2, '0')}`;
                                    
                                    // Get activities from current day and previous day
                                    const currentDayActivities = activityGroups[dateKey] || [];
                                    const previousDayActivities = activityGroups[previousDateKey] || [];
                                    const activitiesToCheck = [...previousDayActivities, ...currentDayActivities];
                                    
                                    // Detect night sleep from these activities
                                    const nightSleep = activitiesToCheck.find(a => a.type === 'nap' && a.details?.isNightSleep && a.details?.endTime);
                                    const wakeTime = nightSleep?.details?.endTime || null;
                                    
                                    console.log('🌅 Wake detection for', dateKey, {
                                      hasNightSleep: !!nightSleep,
                                      wakeTime,
                                      nightSleepLoggedAt: nightSleep?.loggedAt,
                                      nightSleepStart: nightSleep?.details?.startTime,
                                      currentDayActivities: currentDayActivities.length,
                                      previousDayActivities: previousDayActivities.length
                                    });
                                    
                                    // Check if this night sleep's wake-up belongs to the current date
                                    let showWakeUpHere = false;
                                    if (nightSleep && wakeTime) {
                                      // Parse the wake time hour
                                      const wakeTimeMatch = wakeTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                                      if (wakeTimeMatch) {
                                        let wakeHour = parseInt(wakeTimeMatch[1], 10);
                                        const wakePeriod = wakeTimeMatch[3].toUpperCase();
                                        if (wakePeriod === 'PM' && wakeHour !== 12) wakeHour += 12;
                                        if (wakePeriod === 'AM' && wakeHour === 12) wakeHour = 0;
                                        
                                        // Parse the sleep start time
                                        const startTime = nightSleep.details?.startTime;
                                        if (startTime) {
                                          const startMatch = startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
                                          if (startMatch) {
                                            let startHour = parseInt(startMatch[1], 10);
                                            const startPeriod = startMatch[3].toUpperCase();
                                            if (startPeriod === 'PM' && startHour !== 12) startHour += 12;
                                            if (startPeriod === 'AM' && startHour === 12) startHour = 0;
                                            
                                            // If sleep started in evening (>= 18) and ended in morning (< 12), it crossed midnight
                                            const crossedMidnight = startHour >= 18 && wakeHour < 12;
                                            
                                            // Get the date the sleep was logged
                                            const sleepLoggedDate = new Date(nightSleep.loggedAt!);
                                            const sleepDateKey = `${sleepLoggedDate.getFullYear()}-${String(sleepLoggedDate.getMonth() + 1).padStart(2, '0')}-${String(sleepLoggedDate.getDate()).padStart(2, '0')}`;
                                            
                                            // If it crossed midnight and sleep was logged yesterday, show wake-up today
                                            if (crossedMidnight && sleepDateKey === previousDateKey) {
                                              showWakeUpHere = true;
                                            }
                                            // If it didn't cross midnight and sleep was logged today, show wake-up today
                                            else if (!crossedMidnight && sleepDateKey === dateKey) {
                                              showWakeUpHere = true;
                                            }
                                          }
                                        }
                                      }
                                    }
                                    
                                    const dayActivities = activityGroups[dateKey];
                                    
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
                                          <button
                                            onClick={() => {
                                              console.log('Clicked wake up indicator, opening night sleep:', nightSleep);
                                              setEditingActivity(nightSleep);
                                            }}
                                            className="relative flex items-center py-0.5 group transition-colors w-full text-left"
                                          >
                                            {/* Icon - matches ActivityCard styling */}
                                            <div className="relative z-10 flex-shrink-0 w-6 h-6 flex items-center justify-center text-[hsl(18,28%,52%)] dark:text-foreground/70 dusk:text-foreground/70" style={{ marginLeft: '8px' }}>
                                              <Sun className="h-4 w-4" />
                                            </div>
                                            
                                            {/* Content - matches ActivityCard layout */}
                                            <div className="flex-1 flex items-center justify-between min-w-0 gap-3 pl-4">
                                              <div className="flex items-baseline gap-2 hover:opacity-80 transition-opacity">
                                                <span className="text-sm font-serif font-semibold text-[hsl(18,26%,35%)] dark:text-foreground dusk:text-foreground">
                                                  Woke up
                                                </span>
                                              </div>
                                              <span className="text-xs font-light whitespace-nowrap tabular-nums text-[hsl(20,18%,55%)] dark:text-muted-foreground dusk:text-muted-foreground">
                                                {wakeTime}
                                              </span>
                                            </div>
                                          </button>
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
                                {`Show ${sortedDates.length - visibleDates.length} more days`}
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
                              Show less
                            </button>
                          </div>
                        )}
                      </>
                    );
                  })()
                )}
              </div>
            </div>
          </div>
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
          <h2 className="text-xl font-serif font-semibold">Connection Issue</h2>
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
          <h2 className="text-xl font-serif font-semibold">No Household Found</h2>
          <p className="text-muted-foreground">Let's set up your household</p>
          <Button onClick={() => navigate('/onboarding')}>Go to Onboarding</Button>
        </div>
      </div>
    );
  }
return (
    <ErrorBoundary onRetry={() => { refetchHousehold(); refetchActivities(); }}>
      <div className="min-h-screen pb-16 overflow-x-hidden w-full bg-background">
        <div className={`sticky top-0 z-30 bg-background/60 backdrop-blur-sm border-b border-border/20 pt-12 pb-3 flex items-center scroll-fade ${isScrolled ? 'scrolled' : ''}`}>
          <div className="flex items-center justify-between w-full px-4">
            {/* Left side - Empty */}
            <div className="flex items-center gap-2 w-20">
            </div>
            
            {/* Center - Tab name */}
            <div className="flex-1 flex justify-center">
              <h1 className="text-base font-serif font-bold text-foreground">
                {activeTab === 'home' && 'Home'}
                {activeTab === 'rhythm' && 'Rhythm'}
                {activeTab === 'trends' && 'Trends'}
                {activeTab === 'history' && 'History'}
                {activeTab === 'settings' && 'Settings'}
              </h1>
            </div>
            
            {/* Right side - Settings gear */}
            <div className="flex items-center gap-2 w-20 justify-end">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => {
                  if (activeTab === "settings") {
                    setActiveTab(previousTab);
                  } else {
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
          onAddActivity={() => setShowAddActivity(true)}
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

              // Parse the activity time (consistent with addActivity)
              const [time, period] = activityTime.split(' ');
              const [hours, minutes] = time.split(':').map(Number);
              
              let hour24 = hours;
              if (period === 'PM' && hours !== 12) hour24 += 12;
              if (period === 'AM' && hours === 12) hour24 = 0;
              
              // Get timezone info (consistent with addActivity)
              const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
              const offsetMinutes = new Date(
                selectedDate.getFullYear(),
                selectedDate.getMonth(),
                selectedDate.getDate(),
                hour24,
                minutes
              ).getTimezoneOffset();
              
              // Format date_local and time_local (consistent with addActivity)
              const year = selectedDate.getFullYear();
              const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
              const day = String(selectedDate.getDate()).padStart(2, '0');
              const dateLocal = `${year}-${month}-${day}`;
              const timeLocal = `${String(hour24).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
              
              // Compute UTC timestamp (same logic as create-activity edge function)
              const localAsUTC = Date.UTC(year, selectedDate.getMonth(), selectedDate.getDate(), hour24, minutes, 0, 0);
              const timestampUTC = new Date(localAsUTC + (offsetMinutes * 60 * 1000)).toISOString();

              console.log('🔄 onEditActivity consistency check:', {
                activityTime,
                hour24,
                minutes,
                dateLocal,
                timeLocal,
                offsetMinutes,
                timestampUTC
              });

              // Update with consistent fields (matching addActivity/create-activity)
              const { error } = await supabase
                .from('activities')
                .update({
                  type: updatedActivity.type,
                  logged_at: timestampUTC,
                  timezone,
                  details: {
                    ...updatedActivity.details,
                    date_local: dateLocal,
                    time_local: timeLocal,
                    offset_minutes: offsetMinutes
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
                    logged_at: timestampUTC,
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

        <ExportCSVModal
          open={showCSVExport}
          onOpenChange={setShowCSVExport}
          activities={activities}
          babyName={babyProfile?.name}
        />

        <PediatricianReportModal
          open={showPediatricianReport}
          onOpenChange={setShowPediatricianReport}
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