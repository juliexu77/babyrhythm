import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { useUserProfile } from "@/hooks/useUserProfile";

import { 
  User, 
  LogOut, 
  Key,
  Share,
  Users,
  Bell,
  Baby,
  Moon,
  Sunrise,
  Sun,
  Sunset
} from "lucide-react";
import { useTheme } from "next-themes";
import { Switch } from "@/components/ui/switch";
import { CaregiverManagement } from "@/components/CaregiverManagement";
import { EmailInvite } from "@/components/EmailInvite";
import { ProfileEditModal } from "@/components/settings/ProfileEditModal";
import { BabyEditModal } from "@/components/settings/BabyEditModal";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { shareInviteLink } from "@/utils/nativeShare";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ThemeSettingsRow = () => {
  const { theme, setTheme } = useTheme();
  
  const handleThemeChange = () => {
    localStorage.setItem('theme-manual-override', Date.now().toString());
    setTheme(theme === 'light' ? 'dusk' : 'light');
  };

  return (
    <SettingsRow
      icon={theme === 'dusk' ? <Sunset className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      title="Theme"
      subtitle={theme === 'dusk' ? 'Dusk mode' : 'Light mode'}
      showChevron={false}
    >
      <Switch
        checked={theme === 'dusk'}
        onCheckedChange={handleThemeChange}
      />
    </SettingsRow>
  );
};

export const Settings = () => {
  const { user, signOut } = useAuth();
  const { household, generateInviteLink } = useHousehold();
  const { userProfile, updateUserProfile } = useUserProfile();
  
  const navigate = useNavigate();
  
  const [copied, setCopied] = useState(false);
  const [currentInviteLink, setCurrentInviteLink] = useState<string | null>(null);
  const [showCaregiverManagement, setShowCaregiverManagement] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showBabyEdit, setShowBabyEdit] = useState(false);
  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    const stored = localStorage.getItem('smartRemindersEnabled');
    return stored !== null ? stored === 'true' : true;
  });

  // Sync reminder state with localStorage changes
  useEffect(() => {
    const handleStorageChange = () => {
      const stored = localStorage.getItem('smartRemindersEnabled');
      if (stored !== null) {
        setRemindersEnabled(stored === 'true');
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleChangePassword = async () => {
    if (!user?.email) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Error sending password change email:', error);
    }
  };

  const handleInviteClick = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    try {
      const inviteData = await generateInviteLink();
      if (inviteData?.link) {
        setCurrentInviteLink(inviteData.link);
        const shared = await shareInviteLink(inviteData.link, household?.baby_name);
        
        if (!shared) {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }
      }
    } catch (err) {
      console.error('Failed to create invite:', err);
    }
  };

  const getUserDisplayName = () => {
    const email = user?.email;
    return email?.split('@')[0] || "User";
  };

  const handleReminderToggle = () => {
    const newValue = !remindersEnabled;
    setRemindersEnabled(newValue);
    localStorage.setItem('smartRemindersEnabled', String(newValue));
  };

  if (showCaregiverManagement) {
    return <CaregiverManagement onClose={() => setShowCaregiverManagement(false)} />;
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 py-6 space-y-4">
          {/* Profile Header */}
          {user && (
            <div 
              className="flex items-center gap-4 py-4 cursor-pointer active:opacity-70 transition-opacity"
              onClick={() => setShowProfileEdit(true)}
            >
              <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                {(userProfile as any)?.photo_url ? (
                  <img 
                    src={(userProfile as any).photo_url} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User className="w-8 h-8 text-muted-foreground" />
                )}
              </div>
              <div className="flex-1">
                <div className="text-lg font-semibold text-foreground">
                  {(userProfile as any)?.full_name || getUserDisplayName()}
                </div>
                <div className="text-sm text-muted-foreground">
                  {user.email}
                </div>
              </div>
            </div>
          )}

          {/* Baby Profile Section */}
          {user && household && (
            <SettingsSection title="Baby Profile">
              <SettingsRow
                icon={<Baby className="w-5 h-5" />}
                title={household.baby_name || "Baby's Name"}
                subtitle={household.baby_birthday ? `Birthday: ${new Date(household.baby_birthday).toLocaleDateString()}` : "Set birthday"}
                onClick={() => setShowBabyEdit(true)}
              />
            </SettingsSection>
          )}

          {/* Sleep Schedule Section */}
          {user && (
            <SettingsSection title="Sleep Schedule">
              <SettingsRow
                icon={<Moon className="w-5 h-5" />}
                title="Night starts"
                subtitle="When sleep begins"
                showChevron={false}
              >
                <Select
                  value={`${(userProfile as any)?.night_sleep_start_hour ?? 19}:${(userProfile as any)?.night_sleep_start_minute ?? 0}`}
                  onValueChange={async (value) => {
                    try {
                      const [hour, minute] = value.split(':').map(Number);
                      await updateUserProfile({ 
                        night_sleep_start_hour: hour,
                        night_sleep_start_minute: minute 
                      } as any);
                    } catch (error) {
                      console.error('Error updating night sleep start:', error);
                    }
                  }}
                >
                  <SelectTrigger className="w-[110px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => {
                      const totalMinutes = (18 * 60) + (i * 15);
                      const hour = Math.floor(totalMinutes / 60);
                      const minute = totalMinutes % 60;
                      if (hour >= 24) return null;
                      
                      const displayHour = hour > 12 ? hour - 12 : hour;
                      const minuteStr = minute.toString().padStart(2, '0');
                      const label = `${displayHour}:${minuteStr} PM`;
                      
                      return (
                        <SelectItem key={`${hour}:${minute}`} value={`${hour}:${minute}`}>
                          {label}
                        </SelectItem>
                      );
                    }).filter(Boolean)}
                  </SelectContent>
                </Select>
              </SettingsRow>
              <SettingsRow
                icon={<Moon className="w-5 h-5" />}
                title="Night ends"
                subtitle="When sleep ends"
                showChevron={false}
              >
                <Select
                  value={`${(userProfile as any)?.night_sleep_end_hour ?? 7}:${(userProfile as any)?.night_sleep_end_minute ?? 0}`}
                  onValueChange={async (value) => {
                    try {
                      const [hour, minute] = value.split(':').map(Number);
                      await updateUserProfile({ 
                        night_sleep_end_hour: hour,
                        night_sleep_end_minute: minute 
                      } as any);
                    } catch (error) {
                      console.error('Error updating night sleep end:', error);
                    }
                  }}
                >
                  <SelectTrigger className="w-[110px] h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 21 }, (_, i) => {
                      const totalMinutes = (5 * 60) + (i * 15);
                      const hour = Math.floor(totalMinutes / 60);
                      const minute = totalMinutes % 60;
                      if (hour > 10) return null;
                      
                      const minuteStr = minute.toString().padStart(2, '0');
                      const label = `${hour}:${minuteStr} AM`;
                      
                      return (
                        <SelectItem key={`${hour}:${minute}`} value={`${hour}:${minute}`}>
                          {label}
                        </SelectItem>
                      );
                    }).filter(Boolean)}
                  </SelectContent>
                </Select>
              </SettingsRow>
              <SettingsRow
                icon={<Sunrise className="w-5 h-5" />}
                title="Auto-log wake up"
                subtitle="Automatically log morning wake at your set time if forgotten"
                showChevron={false}
              >
                <Switch
                  checked={(userProfile as any)?.auto_log_wake_enabled ?? false}
                  onCheckedChange={async (checked) => {
                    try {
                      await updateUserProfile({ auto_log_wake_enabled: checked } as any);
                    } catch (error) {
                      console.error('Error updating auto-log wake:', error);
                    }
                  }}
                />
              </SettingsRow>
            </SettingsSection>
          )}

          {/* User Profile Section */}
          {user ? (
            <SettingsSection>
              <SettingsRow
                icon={<User className="w-5 h-5" />}
                title={getUserDisplayName()}
                subtitle={user.email}
                onClick={() => setShowProfileEdit(true)}
              />
            </SettingsSection>
          ) : (
            <SettingsSection>
              <SettingsRow
                icon={<User className="w-5 h-5" />}
                title="Sign In"
                subtitle="Sign in to save your data"
                onClick={() => navigate("/auth")}
              />
            </SettingsSection>
          )}

          {/* Caregivers Section */}
          {user && (
            <SettingsSection title="Caregivers">
              <SettingsRow
                icon={<Share className="w-5 h-5" />}
                title="Share Invite Link"
                subtitle="Share tracking with caregivers"
                onClick={handleInviteClick}
              />
              <SettingsRow
                icon={<Users className="w-5 h-5" />}
                title="Manage Caregivers"
                onClick={() => setShowCaregiverManagement(true)}
              />
            </SettingsSection>
          )}

          <SettingsSection title="App Preferences">
            <ThemeSettingsRow />
            <SettingsRow
              icon={<Bell className="w-5 h-5" />}
              title="Smart Reminders"
              subtitle="Get notified before naps, feeds, and bedtime"
              showChevron={false}
            >
              <Switch
                checked={remindersEnabled}
                onCheckedChange={handleReminderToggle}
              />
            </SettingsRow>
          </SettingsSection>

          {/* Account Section */}
          {user && (
            <SettingsSection title="Account">
              <SettingsRow
                icon={<Key className="w-5 h-5" />}
                title="Change Password"
                onClick={handleChangePassword}
              />
              <SettingsRow
                icon={<LogOut className="w-5 h-5" />}
                title="Sign Out"
                onClick={signOut}
              />
            </SettingsSection>
          )}

          {/* Invite Link Actions */}
          {user && currentInviteLink && (
            <div className="mt-4">
              <EmailInvite 
                inviteLink={currentInviteLink}
                babyName={household?.baby_name}
              />
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <ProfileEditModal 
        open={showProfileEdit} 
        onOpenChange={setShowProfileEdit} 
      />
      <BabyEditModal 
        open={showBabyEdit} 
        onOpenChange={setShowBabyEdit} 
      />
    </>
  );
};

export default Settings;
