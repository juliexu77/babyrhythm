import { useState } from "react";
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
  Moon
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
  const { household, generateInviteLink } = useHousehold();
  const { userProfile, updateUserProfile } = useUserProfile();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [copied, setCopied] = useState(false);
  const [currentInviteLink, setCurrentInviteLink] = useState<string | null>(null);
  const [showCaregiverManagement, setShowCaregiverManagement] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showBabyEdit, setShowBabyEdit] = useState(false);

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
                    value={((userProfile as any)?.night_sleep_start_hour ?? 19).toString()}
                    onValueChange={async (value) => {
                      try {
                        await updateUserProfile({ night_sleep_start_hour: parseInt(value) } as any);
                      } catch (error) {
                        console.error('Error updating night sleep start:', error);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                        </SelectItem>
                      ))}
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
                    value={((userProfile as any)?.night_sleep_end_hour ?? 7).toString()}
                    onValueChange={async (value) => {
                      try {
                        await updateUserProfile({ night_sleep_end_hour: parseInt(value) } as any);
                      } catch (error) {
                        console.error('Error updating night sleep end:', error);
                      }
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 24 }, (_, i) => (
                        <SelectItem key={i} value={i.toString()}>
                          {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                        </SelectItem>
                      ))}
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