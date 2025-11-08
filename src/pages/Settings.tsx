import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { shareInviteLink } from "@/utils/nativeShare";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  LogOut, 
  Key,
  Share,
  Users,
  Baby,
  Globe,
  Calendar,
  Moon,
  Bell
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CaregiverManagement } from "@/components/CaregiverManagement";
import { EmailInvite } from "@/components/EmailInvite";
import { ProfileEditModal } from "@/components/settings/ProfileEditModal";
import { BabyEditModal } from "@/components/settings/BabyEditModal";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";

export const Settings = () => {
  const { user, signOut } = useAuth();
  const { household, generateInviteLink, switchHousehold, getUserHouseholds } = useHousehold();
  const { userProfile, updateUserProfile } = useUserProfile();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [copied, setCopied] = useState(false);
  const [currentInviteLink, setCurrentInviteLink] = useState<string | null>(null);
  const [showCaregiverManagement, setShowCaregiverManagement] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showBabyEdit, setShowBabyEdit] = useState(false);
  const [userHouseholds, setUserHouseholds] = useState<any[]>([]);
  const [remindersEnabled, setRemindersEnabled] = useState(() => {
    const stored = localStorage.getItem('smartRemindersEnabled');
    return stored !== null ? stored === 'true' : true; // Default enabled
  });

  useEffect(() => {
    if (user) {
      getUserHouseholds().then(setUserHouseholds);
    }
  }, [user, household]);

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
      
      toast({
        title: t('passwordChangeEmailSent'),
        description: t('checkEmailForInstructions')
      });
    } catch (error) {
      console.error('Error sending password change email:', error);
      toast({
        title: t('errorSendingEmail'),
        description: t('failedToSendEmail'),
        variant: "destructive"
      });
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
        
        if (shared) {
          toast({
            title: t('inviteShared'),
            description: t('shareDialogOpened'),
          });
        } else {
          // Fallback to clipboard copy
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          
          toast({
            title: t('inviteLinkCopied'),
            description: t('shareWithPartner'),
          });
        }
      }
    } catch (err) {
      toast({
        title: t('failedToCreateInvite'),
        description: t('pleaseRetryInvite'),
        variant: "destructive",
      });
    }
  };

  const getUserDisplayName = () => {
    const name = userProfile?.full_name || user?.user_metadata?.full_name;
    return name || user?.email?.split('@')[0] || "User";
  };

  const getBabyDisplayName = () => {
    return household?.baby_name || t('enterBabyName');
  };

  const getBabyAge = () => {
    if (!household?.baby_birthday) return "";
    
    const birthDate = new Date(household.baby_birthday);
    const today = new Date();
    const diffTime = today.getTime() - birthDate.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) {
      return `${diffDays} ${t('daysOld')}`;
    } else if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `${months} ${months === 1 ? t('monthOld') : t('monthsOld')}`;
    } else {
      const years = Math.floor(diffDays / 365);
      return `${years} ${years === 1 ? t('yearOld') : t('yearsOld')}`;
    }
  };

  const handleReminderToggle = () => {
    const newValue = !remindersEnabled;
    setRemindersEnabled(newValue);
    localStorage.setItem('smartRemindersEnabled', String(newValue));
    
    toast({
      title: newValue ? "Smart reminders enabled" : "Smart reminders disabled",
      description: newValue 
        ? "You'll receive notifications before naps, feeds, and bedtime"
        : "You won't receive schedule notifications",
    });
  };

  if (showCaregiverManagement) {
    return <CaregiverManagement onClose={() => setShowCaregiverManagement(false)} />;
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <div className="max-w-md mx-auto px-4 py-8 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-h2 text-foreground">
              {t('profileSettings')}
            </h1>
            <ThemeToggle showText={false} />
          </div>

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
                title={t('signIn')}
                subtitle={t('signInToSave')}
                onClick={() => navigate("/auth")}
              />
            </SettingsSection>
          )}

          {/* Baby Details Section */}
          <SettingsSection title={t('babyDetails')}>
            <SettingsRow
              icon={<Baby className="w-5 h-5" />}
              title={getBabyDisplayName()}
              subtitle={getBabyAge()}
              onClick={() => setShowBabyEdit(true)}
            />
            {user && userHouseholds.length > 1 && (
              <SettingsRow
                icon={<Users className="w-5 h-5" />}
                title="Switch Household"
                subtitle={`${userHouseholds.length} households available`}
                showChevron={false}
              >
                <Select
                  value={household?.id}
                  onValueChange={async (value) => {
                    try {
                      await switchHousehold(value);
                      toast({
                        title: "Household switched",
                        description: "You're now viewing a different household",
                      });
                    } catch (error) {
                      toast({
                        title: "Error switching household",
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {userHouseholds.map((h) => (
                      <SelectItem key={h.id} value={h.id}>
                        {h.baby_name || h.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </SettingsRow>
            )}
          </SettingsSection>

          {/* Caregivers Section */}
          {user && (
            <SettingsSection title={t('caregivers')}>
              <SettingsRow
                icon={<Share className="w-5 h-5" />}
                title={t('shareInviteLink')}
                subtitle={t('shareTrackingWith')}
                onClick={handleInviteClick}
              />
              <SettingsRow
                icon={<Users className="w-5 h-5" />}
                title={t('manageCaregivers')}
                onClick={() => setShowCaregiverManagement(true)}
              />
            </SettingsSection>
          )}

          {/* App Preferences Section */}
          <SettingsSection title={t('appPreferences')}>
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
            <SettingsRow
              icon={<Globe className="w-5 h-5" />}
              title={t('language')}
              showChevron={false}
            >
              <LanguageToggle />
            </SettingsRow>
            {user && (
              <>
                <SettingsRow
                  icon={<Moon className="w-5 h-5" />}
                  title="Night Sleep Start"
                  subtitle="When overnight sleep typically begins"
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
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Evening hours: 6 PM to 11:45 PM in 15-min increments */}
                      {Array.from({ length: 24 }, (_, i) => {
                        const totalMinutes = (18 * 60) + (i * 15); // Start at 6 PM (18:00)
                        const hour = Math.floor(totalMinutes / 60);
                        const minute = totalMinutes % 60;
                        if (hour >= 24) return null; // Stop at 11:45 PM
                        
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
                  title="Night Sleep End"
                  subtitle="When overnight sleep typically ends"
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
                    <SelectTrigger className="w-[120px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {/* Morning hours: 5 AM to 10 AM in 15-min increments */}
                      {Array.from({ length: 21 }, (_, i) => {
                        const totalMinutes = (5 * 60) + (i * 15); // Start at 5 AM
                        const hour = Math.floor(totalMinutes / 60);
                        const minute = totalMinutes % 60;
                        if (hour > 10) return null; // Stop at 10 AM
                        
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
              </>
            )}
          </SettingsSection>


          {/* Account Section */}
          {user && (
            <SettingsSection title={t('account')}>
              <SettingsRow
                icon={<Key className="w-5 h-5" />}
                title={t('changePassword')}
                onClick={handleChangePassword}
              />
              <SettingsRow
                icon={<LogOut className="w-5 h-5" />}
                title={t('signOut')}
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