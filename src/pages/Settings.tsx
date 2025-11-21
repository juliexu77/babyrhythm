import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  LogOut, 
  Key,
  Share,
  Users,
  Bell
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { CaregiverManagement } from "@/components/CaregiverManagement";
import { EmailInvite } from "@/components/EmailInvite";
import { ProfileEditModal } from "@/components/settings/ProfileEditModal";
import { SettingsRow } from "@/components/settings/SettingsRow";
import { SettingsSection } from "@/components/settings/SettingsSection";
import { shareInviteLink } from "@/utils/nativeShare";

export const Settings = () => {
  const { user, signOut } = useAuth();
  const { household, generateInviteLink } = useHousehold();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [copied, setCopied] = useState(false);
  const [currentInviteLink, setCurrentInviteLink] = useState<string | null>(null);
  const [showCaregiverManagement, setShowCaregiverManagement] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
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
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for instructions"
      });
    } catch (error) {
      console.error('Error sending password change email:', error);
      toast({
        title: "Error sending email",
        description: "Failed to send password reset email",
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
            title: "Invite shared",
            description: "Share dialog opened",
          });
        } else {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
          
          toast({
            title: "Invite link copied",
            description: "Share with your partner",
          });
        }
      }
    } catch (err) {
      toast({
        title: "Failed to create invite",
        description: "Please try again",
        variant: "destructive",
      });
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
        <div className="max-w-md mx-auto px-4 py-8 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-h2 text-foreground">Settings</h1>
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

          {/* App Preferences Section */}
          <SettingsSection title="App Preferences">
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
    </>
  );
};

export default Settings;
