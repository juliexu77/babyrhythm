import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { SimpleInviteCollaborator } from "@/components/SimpleInviteCollaborator";
import { useAuth } from "@/hooks/useAuth";
import { useBabyProfile } from "@/hooks/useBabyProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Baby, 
  LogOut, 
  Mail, 
  Camera, 
  Key,
  Calendar,
  Edit3,
  Palette,
  Globe
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
    }, 1000); // Auto-save after 1 second of no typing

    return () => clearTimeout(timeoutId);
  }, [fullName, user, toast]);

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

  // Auto-save baby profile changes
  useEffect(() => {
    if (!babyName.trim() || showBabyEdit) return;
    
    const timeoutId = setTimeout(async () => {
      setIsUpdatingBaby(true);
      try {
        const profileData = {
          name: babyName.trim(),
          birthday: babyBirthday || undefined
        };

        if (babyProfile && user) {
          await updateBabyProfile(profileData);
        } else if (user) {
          await createBabyProfile(profileData.name, profileData.birthday);
        } else {
          localStorage.setItem('babyProfile', JSON.stringify(profileData));
          localStorage.setItem('babyProfileCompleted', 'true');
        }
      } catch (error) {
        console.error('Error updating baby profile:', error);
      } finally {
        setIsUpdatingBaby(false);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [babyName, babyBirthday, babyProfile, user, updateBabyProfile, createBabyProfile, showBabyEdit]);


  const handleSaveBabyProfile = async () => {
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
        await updateBabyProfile(profileData);
      } else if (user) {
        await createBabyProfile(profileData.name, profileData.birthday);
      } else {
        localStorage.setItem('babyProfile', JSON.stringify(profileData));
        localStorage.setItem('babyProfileCompleted', 'true');
      }
      
      setShowBabyEdit(false);
      toast({
        title: "Baby profile updated",
        description: "Changes saved successfully."
      });
    } catch (error) {
      console.error('Error updating baby profile:', error);
    } finally {
      setIsUpdatingBaby(false);
    }
  };

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

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-4 pb-8">

      {/* User Profile */}
      {user ? (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src="" alt={fullName || user.email || "User"} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {fullName ? getInitials(fullName) : getInitials(user.email || "U")}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Button variant="outline" size="sm">
                  <Camera className="w-4 h-4 mr-2" />
                  Change Photo
                </Button>
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

              <Button 
                onClick={handleChangePassword}
                variant="outline"
                className="w-full"
              >
                <Key className="w-4 h-4 mr-2" />
                Change Password
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Guest User</h3>
            <Button onClick={() => navigate("/auth")} className="w-full">
              <User className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Baby Profile */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          {!showBabyEdit ? (
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
                  onClick={handleSaveBabyProfile}
                  disabled={isUpdatingBaby}
                  className="flex-1"
                >
                  {isUpdatingBaby ? "Saving..." : "Save"}
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

      <SimpleInviteCollaborator />

      {/* App Preferences */}
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center justify-between">
            <Palette className="w-5 h-5 text-muted-foreground" />
            <ThemeToggle />
          </div>

          <div className="flex items-center justify-between">
            <Globe className="w-5 h-5 text-muted-foreground" />
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