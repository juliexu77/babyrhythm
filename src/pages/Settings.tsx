import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { useBabyProfile } from "@/hooks/useBabyProfile";
import { useLanguage } from "@/contexts/LanguageContext";
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
import { UserRoleSelector } from "@/components/UserRoleSelector";
import { CaregiverManagement } from "@/components/CaregiverManagement";
import { format } from "date-fns";

export const Settings = () => {
  const { user, signOut } = useAuth();
  const { babyProfile, collaborators, removeCollaborator, updateBabyProfile, generateInviteLink } = useBabyProfile();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [copied, setCopied] = useState(false);
  const [babyName, setBabyName] = useState(babyProfile?.name || "");
  const [babyBirthday, setBabyBirthday] = useState(babyProfile?.birthday || "");
  const [userPhotoUrl, setUserPhotoUrl] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"parent" | "nanny">("parent");
  const [showCaregiverManagement, setShowCaregiverManagement] = useState(false);

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
          title: "Profile updated",
          description: "Your name has been saved.",
        });
      } catch (error) {
        console.error('Error updating profile:', error);
        toast({
          title: "Error updating profile",
          description: "Failed to update profile. Please try again.",
          variant: "destructive"
        });
      } finally {
        setIsUpdatingProfile(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [fullName, user, toast]);

  // Auto-save baby profile changes
  useEffect(() => {
    if (!babyProfile || !babyName || babyName === babyProfile.name) return;
    
    const timeoutId = setTimeout(async () => {
      try {
        await updateBabyProfile({ name: babyName });
      } catch (error) {
        console.error('Error updating baby name:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [babyName, babyProfile, updateBabyProfile]);

  useEffect(() => {
    if (!babyProfile || babyBirthday === babyProfile.birthday) return;
    
    const timeoutId = setTimeout(async () => {
      try {
        await updateBabyProfile({ birthday: babyBirthday });
      } catch (error) {
        console.error('Error updating baby birthday:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [babyBirthday, babyProfile, updateBabyProfile]);

  // Update local state when babyProfile changes
  useEffect(() => {
    if (babyProfile) {
      setBabyName(babyProfile.name);
      setBabyBirthday(babyProfile.birthday || "");
    }
  }, [babyProfile]);

  const handleChangePassword = async () => {
    if (!user?.email) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      
      toast({
        title: "Password change email sent",
        description: "Check your email for password change instructions."
      });
    } catch (error) {
      console.error('Error sending password change email:', error);
      toast({
        title: "Error sending email",
        description: "Failed to send password change email. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleInviteClick = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    if (!babyProfile) {
      toast({
        title: "Create a baby profile first",
        description: "Add your baby's details in Settings before inviting.",
        variant: "destructive",
      });
      return;
    }

    try {
      const inviteData = await generateInviteLink();
      if (inviteData?.link) {
        await navigator.clipboard.writeText(inviteData.link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        
        toast({
          title: "Invite link copied!",
          description: "Share this link with your partner or caregiver.",
        });
      }
    } catch (err) {
      toast({
        title: "Failed to create invite",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleUserPhotoUpdate = async (photoUrl: string | null) => {
    setUserPhotoUrl(photoUrl);
    // You can also save to user profile if needed
  };

  const handleBabyPhotoUpdate = async (photoUrl: string | null) => {
    if (babyProfile) {
      await updateBabyProfile({ photo_url: photoUrl });
    }
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
    if (!user) return "Guest User";
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
              currentPhotoUrl={userPhotoUrl}
              bucketName="baby-photos"
              folder={user?.id || "guest"}
              fallbackIcon={<User className="w-10 h-10 text-muted-foreground" />}
              onPhotoUpdate={handleUserPhotoUpdate}
              size="lg"
            />
          </div>
          <h1 className="text-xl font-serif font-medium text-foreground">
            Profile & Settings
          </h1>
        </div>

        {/* User Status Section - No card */}
        <div className="text-center space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Using as:</p>
            <h2 className="text-xl font-medium text-foreground mb-2">
              {getUserDisplayName()}
            </h2>
            {!user && (
              <p className="text-sm text-muted-foreground mb-4">
                Sign in to save your data across devices
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
              Sign In
            </Button>
          ) : (
            <div className="space-y-4 p-4 bg-muted/30 rounded-2xl">
              <div>
                <Label htmlFor="fullName" className="text-sm text-muted-foreground">
                  Full Name
                </Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-2 border-none bg-background"
                />
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <Input
                  value={user.email || ""}
                  disabled
                  className="mt-2 border-none bg-muted"
                />
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">You are</Label>
                <div className="mt-2">
                  <UserRoleSelector 
                    value={userRole} 
                    onChange={setUserRole}
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
              <p className="font-medium text-foreground text-lg">Language</p>
              <p className="text-sm text-muted-foreground">Switch app language</p>
            </div>
            <LanguageToggle />
          </div>
        </div>

        {/* Baby Profile Section - Always visible */}
        <div className="p-6 bg-muted/30 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <Baby className="w-5 h-5" />
            <h3 className="text-lg font-medium text-foreground">Baby Details</h3>
          </div>
          
          {!user && (
            <p className="text-sm text-muted-foreground">
              Baby information is saved locally. Sign in to sync across devices.
            </p>
          )}
          
          <div className="space-y-4">
            {/* Baby Photo - Centered */}
            <div className="flex justify-center">
              <PhotoUpload
                currentPhotoUrl={babyProfile?.photo_url}
                bucketName="baby-photos"
                folder={babyProfile?.id || "baby"}
                fallbackIcon={<Baby className="w-6 h-6 text-muted-foreground" />}
                onPhotoUpdate={handleBabyPhotoUpdate}
                size="md"
              />
            </div>

            {/* Baby Name */}
            <div>
              <Label htmlFor="babyName" className="text-sm text-muted-foreground">
                Baby's Name
              </Label>
              <Input
                id="babyName"
                value={babyName}
                onChange={(e) => setBabyName(e.target.value)}
                placeholder="Enter baby's name"
                className="mt-2 border-none bg-background"
              />
            </div>

            {/* Baby Birthday */}
            <div>
              <Label htmlFor="babyBirthday" className="text-sm text-muted-foreground">
                Birthday
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
                  placeholder="Select birthday"
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
            <h3 className="text-lg font-medium text-foreground">Invite Caretakers</h3>
          </div>
          
          <p className="text-sm text-muted-foreground">
            Share tracking with someone so they can view and add activities too.
          </p>

          <div className="space-y-3">
            <Button 
              onClick={handleInviteClick}
              className="w-full h-12 rounded-2xl"
              variant="outline"
            >
              <Share className="w-4 h-4 mr-2" />
              {user ? (copied ? "Link Copied!" : "Copy Invite Link") : "Sign In to Share"}
            </Button>

            {user && (
              <Button 
                onClick={() => setShowCaregiverManagement(true)}
                className="w-full h-12 rounded-2xl"
                variant="outline"
              >
                <Users className="w-4 h-4 mr-2" />
                Manage Caregivers
              </Button>
            )}
          </div>

          {/* List of Caregivers */}
          {collaborators && collaborators.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-border/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm font-medium text-foreground">Caregivers</span>
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