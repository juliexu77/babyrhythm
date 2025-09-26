import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { InviteCollaborator } from "@/components/InviteCollaborator";
import { useAuth } from "@/hooks/useAuth";
import { useBabyProfile } from "@/hooks/useBabyProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { 
  Settings as SettingsIcon, 
  User, 
  Baby, 
  LogOut, 
  Mail, 
  Camera, 
  Save,
  Key,
  Calendar,
  Edit3
} from "lucide-react";

interface SettingsProps {
  onClose?: () => void;
}

export const Settings = ({ onClose }: SettingsProps) => {
  const { user, signOut } = useAuth();
  const { babyProfile, updateBabyProfile, createBabyProfile } = useBabyProfile();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();

  // User profile state
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Baby profile state  
  const [babyName, setBabyName] = useState(() => {
    if (babyProfile?.name) return babyProfile.name;
    const localProfile = localStorage.getItem('babyProfile');
    if (localProfile) {
      try {
        return JSON.parse(localProfile).name || "Baby";
      } catch {
        return "Baby";
      }
    }
    return "Baby";
  });
  
  const [babyBirthday, setBabyBirthday] = useState(() => {
    if (babyProfile?.birthday) return babyProfile.birthday;
    const localProfile = localStorage.getItem('babyProfile');
    if (localProfile) {
      try {
        return JSON.parse(localProfile).birthday || "";
      } catch {
        return "";
      }
    }
    return "";
  });
  
  const [isUpdatingBaby, setIsUpdatingBaby] = useState(false);
  const [showBabyEdit, setShowBabyEdit] = useState(false);

  const handleUpdateUserProfile = async () => {
    if (!user) return;
    
    setIsUpdatingProfile(true);
    try {
      // Update user metadata
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });
      
      if (error) throw error;
      
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully."
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
  };

  const handleUpdateBabyProfile = async () => {
    if (!babyName.trim()) {
      toast({
        title: "Baby name required",
        description: "Please enter a name for your baby.",
        variant: "destructive"
      });
      return;
    }

    setIsUpdatingBaby(true);
    try {
      const profileData = {
        name: babyName.trim(),
        birthday: babyBirthday || undefined
      };

      if (babyProfile && user) {
        // Update existing profile in database
        await updateBabyProfile(profileData);
      } else if (user) {
        // Create new profile in database
        await createBabyProfile(profileData.name, profileData.birthday);
      } else {
        // Update localStorage for guest users
        localStorage.setItem('babyProfile', JSON.stringify(profileData));
        localStorage.setItem('babyProfileCompleted', 'true');
        toast({
          title: "Baby profile updated",
          description: "Baby profile has been updated successfully."
        });
      }
      
      setShowBabyEdit(false);
    } catch (error) {
      console.error('Error updating baby profile:', error);
    } finally {
      setIsUpdatingBaby(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!user?.email) return;
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
        redirectTo: `${window.location.origin}/reset-password`
      });
      
      if (error) throw error;
      
      toast({
        title: "Password reset email sent",
        description: "Check your email for password reset instructions."
      });
    } catch (error) {
      console.error('Error sending password reset:', error);
      toast({
        title: "Error sending reset email",
        description: "Failed to send password reset email. Please try again.",
        variant: "destructive"
      });
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

  return (
    <div className="space-y-6 pb-8">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mx-auto mb-4">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">
          Settings
        </h1>
        <p className="text-muted-foreground text-sm">
          Manage your account and preferences
        </p>
      </div>

      {/* User Profile Section */}
      {user ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              User Profile
            </CardTitle>
            <CardDescription>
              Manage your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src="" alt={fullName || user.email || "User"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {fullName ? getInitials(fullName) : getInitials(user.email || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Button variant="outline" size="sm" className="mb-2">
                  <Camera className="w-4 h-4 mr-2" />
                  Change Photo
                </Button>
                <p className="text-sm text-muted-foreground">
                  Upload a profile picture
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={user.email || ""}
                    disabled
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateUserProfile}
                  disabled={isUpdatingProfile}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isUpdatingProfile ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  onClick={handlePasswordReset}
                  variant="outline"
                  className="flex-1"
                >
                  <Key className="w-4 h-4 mr-2" />
                  Reset Password
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Guest User</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Sign in to save your data across devices and access more features
            </p>
            <Button onClick={() => navigate("/auth")} className="w-full">
              <User className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Baby Profile Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Baby className="w-5 h-5" />
            Baby Profile
          </CardTitle>
          <CardDescription>
            Manage your baby's information
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showBabyEdit ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium">{babyName}</p>
                  {babyBirthday && (
                    <p className="text-sm text-muted-foreground">
                      Born {new Date(babyBirthday).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setShowBabyEdit(true)}
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label htmlFor="babyName">Baby's Name</Label>
                <Input
                  id="babyName"
                  value={babyName}
                  onChange={(e) => setBabyName(e.target.value)}
                  placeholder="Enter baby's name"
                />
              </div>

              <div>
                <Label htmlFor="babyBirthday">Birthday (Optional)</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="babyBirthday"
                    type="date"
                    value={babyBirthday}
                    onChange={(e) => setBabyBirthday(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleUpdateBabyProfile}
                  disabled={isUpdatingBaby}
                  className="flex-1"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {isUpdatingBaby ? "Saving..." : "Save Changes"}
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setShowBabyEdit(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Collaborators Section */}
      {user && <InviteCollaborator />}

      {/* App Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>App Preferences</CardTitle>
          <CardDescription>
            Customize your app experience
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="font-medium">{t('theme')}</p>
              <p className="text-sm text-muted-foreground">
                Switch between light and dark mode
              </p>
            </div>
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="font-medium">{t('language')}</p>
              <p className="text-sm text-muted-foreground">
                Switch between English and Chinese
              </p>
            </div>
            <LanguageToggle />
          </div>
        </CardContent>
      </Card>

      {/* Sign Out */}
      {user && (
        <Card>
          <CardContent className="p-6">
            <Button
              onClick={signOut}
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('signOut')}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Settings;