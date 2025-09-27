import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWithStatus } from "@/components/ui/input-with-status";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { shareInviteLink, canShare } from "@/utils/nativeShare";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  LogOut, 
  Key,
  UserPlus,
  Share,
  Users,
  Trash2,
  Baby
} from "lucide-react";
import { PhotoUpload } from "@/components/PhotoUpload";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DatePicker } from "@/components/ui/date-picker";
import { UserRoleSelectorWithStatus } from "@/components/ui/user-role-selector-with-status";
import { CaregiverManagement } from "@/components/CaregiverManagement";
import { EmailInvite } from "@/components/EmailInvite";
import { format } from "date-fns";

export const Settings = () => {
  const { user, signOut } = useAuth();
  const { household, collaborators, removeCollaborator, updateHousehold, generateInviteLink, createHousehold } = useHousehold();
  const { userProfile, updateUserProfile } = useUserProfile();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [babyName, setBabyName] = useState(household?.baby_name || "");
  const [babyBirthday, setBabyBirthday] = useState(household?.baby_birthday || "");
  const [userRole, setUserRole] = useState<"owner" | "partner" | "caregiver" | "grandparent">("owner");
  const [currentInviteLink, setCurrentInviteLink] = useState<string | null>(null);
  const [showCaregiverManagement, setShowCaregiverManagement] = useState(false);
  
  // Save status states
  const [fullNameSaveStatus, setFullNameSaveStatus] = useState<"unsaved" | "saving" | "saved" | "error">("unsaved");
  const [babyNameSaveStatus, setBabyNameSaveStatus] = useState<"unsaved" | "saving" | "saved" | "error">("unsaved");
  const [babyBirthdaySaveStatus, setBabyBirthdaySaveStatus] = useState<"unsaved" | "saving" | "saved" | "error">("unsaved");
  const [userRoleSaveStatus, setUserRoleSaveStatus] = useState<"unsaved" | "saving" | "saved" | "error">("unsaved");

  // Auto-save user profile changes
  useEffect(() => {
    if (!user || !fullName || fullName === user?.user_metadata?.full_name) return;
    
    const timeoutId = setTimeout(async () => {
      setIsUpdatingProfile(true);
      try {
        const { error } = await supabase.auth.updateUser({
          data: { full_name: fullName }
        });
        
        if (error) throw error;
        
        toast({
          title: t('profileUpdated'),
          description: t('nameHasBeenSaved'),
        });
      } catch (error) {
        console.error('Error updating profile:', error);
        toast({
          title: t('errorUpdatingProfile'),
          description: t('failedToUpdateProfile'),
          variant: "destructive"
        });
      } finally {
        setIsUpdatingProfile(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [fullName, user, toast]);

  // Auto-save user role changes
  useEffect(() => {
    if (!userProfile || userRole === userProfile.role) return;
    
    setUserRoleSaveStatus("saving");
    const timeoutId = setTimeout(async () => {
      try {
        console.log('Updating user role to:', userRole);
        await updateUserProfile({ role: userRole });
        setUserRoleSaveStatus("saved");
        
        // Clear saved status after 3 seconds
        setTimeout(() => setUserRoleSaveStatus("unsaved"), 3000);
        
        toast({
          title: t('roleUpdated'),
          description: `${t('roleChangedTo')} ${userRole}`,
        });
      } catch (error) {
        setUserRoleSaveStatus("error");
        console.error('Error updating user role:', error);
        // Revert the role change if it failed
        setUserRole(userProfile.role);
        toast({
          title: t('errorUpdatingRole'),
          description: t('failedToUpdateRole'),
          variant: "destructive"
        });
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [userRole, userProfile, updateUserProfile, toast]);

  // Auto-save baby profile changes
  useEffect(() => {
    if (!user || !babyName) return;
    
    // Skip if baby name hasn't changed from existing household
    if (household && babyName === household.baby_name) return;
    
    setBabyNameSaveStatus("saving");
    const timeoutId = setTimeout(async () => {
      try {
        if (household) {
          // Update existing household
          await updateHousehold({ baby_name: babyName });
        } else {
          // Create new household with baby name
          await createHousehold(babyName);
        }
        setBabyNameSaveStatus("saved");
        
        // Clear saved status after 3 seconds
        setTimeout(() => setBabyNameSaveStatus("unsaved"), 3000);
      } catch (error) {
        setBabyNameSaveStatus("error");
        console.error('Error saving baby name:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [babyName, household, updateHousehold, createHousehold, user]);

  useEffect(() => {
    if (!user || !household || babyBirthday === household.baby_birthday) return;
    
    setBabyBirthdaySaveStatus("saving");
    const timeoutId = setTimeout(async () => {
      try {
        await updateHousehold({ baby_birthday: babyBirthday });
        setBabyBirthdaySaveStatus("saved");
        
        // Clear saved status after 3 seconds
        setTimeout(() => setBabyBirthdaySaveStatus("unsaved"), 3000);
      } catch (error) {
        setBabyBirthdaySaveStatus("error");
        console.error('Error updating baby birthday:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [babyBirthday, household, updateHousehold, user]);

  // Update local state when household changes
  useEffect(() => {
    if (household) {
      setBabyName(household.baby_name || "");
      setBabyBirthday(household.baby_birthday || "");
    }
  }, [household]);

  // Update local state when userProfile changes
  useEffect(() => {
    if (userProfile) {
      setUserRole(userProfile.role || 'owner');
      setFullName(userProfile.full_name || "");
    }
  }, [userProfile]);

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

  const handleUserPhotoUpdate = async (photoUrl: string | null) => {
    try {
      await updateUserProfile({ photo_url: photoUrl });
    } catch (error) {
      console.error('Error updating user photo:', error);
    }
  };

  const handleBabyPhotoUpdate = async (photoUrl: string | null) => {
    // Baby photos are not supported in household model yet
    console.log('Baby photo update not implemented in household model');
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getUserDisplayName = () => {
    return fullName || user.email?.split('@')[0] || "Unknown User";
    return fullName || user.email?.split('@')[0] || "User";
  };

  if (showCaregiverManagement) {
    return <CaregiverManagement onClose={() => setShowCaregiverManagement(false)} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-6 py-8 space-y-8 relative">
        {/* Theme Toggle - Top Right */}
        <div className="absolute top-8 right-6">
          <ThemeToggle showText={false} />
        </div>
        
        {/* Header with User Icon and Title */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <PhotoUpload
              currentPhotoUrl={userProfile?.photo_url}
              bucketName="baby-photos"
              folder={user?.id || "unknown"}
              fallbackIcon={<User className="w-10 h-10 text-muted-foreground" />}
              onPhotoUpdate={handleUserPhotoUpdate}
              size="lg"
            />
          </div>
          <h1 className="text-xl font-serif font-medium text-foreground">
            {t('profileSettings')}
          </h1>
        </div>

        {/* User Status Section - No card */}
        <div className="text-center space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{t('usingAs')}</p>
            <h2 className="text-xl font-medium text-foreground mb-2">
              {getUserDisplayName()}
            </h2>
            {!user && (
              <p className="text-sm text-muted-foreground mb-4">
                {t('signInToSave')}
              </p>
            )}
          </div>

          {!user ? (
            <Button 
              onClick={() => navigate("/auth")}
              size="lg"
              className="w-full h-12 bg-primary/80 hover:bg-primary text-primary-foreground rounded-2xl"
            >
              <User className="w-4 h-4 mr-2" />
              {t('signIn')}
            </Button>
          ) : (
            <div className="space-y-4 p-4 bg-muted/30 rounded-2xl">
              <div>
                <Label htmlFor="fullName" className="text-sm text-muted-foreground">
                  {t('fullName')}
                </Label>
                <InputWithStatus
                  id="fullName"
                  value={fullName}
                  onValueChange={setFullName}
                  placeholder="Enter your full name"
                  className="mt-2 border-none bg-background"
                  saveStatus={fullNameSaveStatus}
                  errorMessage={t('failedToSaveName')}
                />
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">{t('email')}</Label>
                <Input
                  value={user.email || ""}
                  disabled
                  className="mt-2 border-none bg-muted"
                />
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">{t('youAre')}</Label>
                <div className="mt-2">
                  <UserRoleSelectorWithStatus
                    value={userRole} 
                    onChange={setUserRole}
                    saveStatus={userRoleSaveStatus}
                    errorMessage={t('failedToUpdateRole')}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Language Section - Minimal card */}
        <div className="p-6 bg-muted/30 rounded-2xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground text-lg">{t('language')}</p>
              <p className="text-sm text-muted-foreground">{t('switchAppLanguage')}</p>
            </div>
            <LanguageToggle />
          </div>
        </div>

        {/* Baby Profile Section - Always visible */}
        <div className="p-6 bg-muted/30 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Baby className="w-5 h-5" />
            <h3 className="text-lg font-medium text-foreground">{t('babyDetails')}</h3>
          </div>
          
          {!user && (
            <p className="text-sm text-muted-foreground">
              {t('babyInfoSavedLocally')}
            </p>
          )}
          
          <div className="space-y-4">
            {/* Baby Photo - Centered */}
            <div className="flex justify-center">
              <PhotoUpload
                currentPhotoUrl={undefined}
                bucketName="baby-photos"
                folder={household?.id || "baby"}
                fallbackIcon={<Baby className="w-6 h-6 text-muted-foreground" />}
                onPhotoUpdate={handleBabyPhotoUpdate}
                size="md"
              />
            </div>

            {/* Baby Name */}
            <div>
              <Label htmlFor="babyName" className="text-sm text-muted-foreground">
                {t('babyName')}
              </Label>
              <InputWithStatus
                id="babyName"
                value={babyName}
                onValueChange={setBabyName}
                placeholder={t('enterBabyName')}
                className="mt-2 border-none bg-background"
                saveStatus={babyNameSaveStatus}
                errorMessage={t('failedToSaveBabyName')}
              />
            </div>

            {/* Baby Birthday */}
            <div>
              <Label htmlFor="babyBirthday" className="text-sm text-muted-foreground">
                {t('birthday')}
              </Label>
              <div className="mt-2">
                <DatePicker
                  selected={babyBirthday ? (() => { const [y,m,d] = babyBirthday.split('-').map(Number); return new Date(y, m-1, d); })() : undefined}
                  onSelect={(date) => {
                    if (date) {
                      // Convert to local date string to avoid timezone issues
                      const year = date.getFullYear();
                      const month = String(date.getMonth() + 1).padStart(2, '0');
                      const day = String(date.getDate()).padStart(2, '0');
                      setBabyBirthday(`${year}-${month}-${day}`);
                    } else {
                      setBabyBirthday("");
                    }
                  }}
                  placeholder={t('selectBirthday')}
                  className="border-none bg-background"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Share Tracking Section - Minimal card */}
        <div className="p-6 bg-muted/30 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            <h3 className="text-lg font-medium text-foreground">{t('inviteCaretakers')}</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            {t('shareTrackingWith')}
          </p>

          <div className="space-y-3">
            <Button 
              onClick={handleInviteClick}
              className="w-full h-12 rounded-2xl"
              variant="outline"
            >
              <Share className="w-4 h-4 mr-2" />
              {user ? (copied ? t('linkCopied') : t('shareInviteLink')) : t('signInToShare')}
            </Button>

            {user && currentInviteLink && (
              <EmailInvite 
                inviteLink={currentInviteLink}
                babyName={household?.baby_name}
              />
            )}

            {user && (
              <Button 
                onClick={() => setShowCaregiverManagement(true)}
                className="w-full h-12 rounded-2xl"
                variant="outline"
              >
                <Users className="w-4 h-4 mr-2" />
                {t('manageCaregivers')}
              </Button>
            )}
          </div>

          {/* List of Caregivers */}
          {collaborators && collaborators.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">{t('caregivers')}</span>
              </div>
              <div className="space-y-2">
                {collaborators.map((collaborator) => (
                  <div 
                    key={collaborator.id}
                    className="flex items-center justify-between p-3 bg-background rounded-xl"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {getInitials(collaborator.user_id)}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {collaborator.user_id}
                        </p>
                        <p className="text-xs text-muted-foreground capitalize">
                          {collaborator.role}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCollaborator(collaborator.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Actions - No cards, clean buttons */}
        {user && (
          <div className="space-y-3 pt-4">
            <Button
              onClick={handleChangePassword}
              variant="outline"
              className="w-full h-12 rounded-2xl"
            >
              <Key className="w-4 h-4 mr-2" />
              Change Password
            </Button>

            <Button
              onClick={signOut}
              variant="outline"
              className="w-full h-12 rounded-2xl text-destructive hover:text-destructive border-destructive/20 hover:border-destructive/40"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('signOut')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;