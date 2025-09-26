import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LanguageToggle } from "@/components/LanguageToggle";
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
  Trash2
} from "lucide-react";

export const Settings = () => {
  const { user, signOut } = useAuth();
  const { babyProfile, collaborators, removeCollaborator } = useBabyProfile();
  const { t } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [copied, setCopied] = useState(false);

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

    // Generate a unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/invite?code=${inviteCode}`;
    
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Invite link copied!",
        description: "Share this link with your partner or caregiver.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please try again.",
        variant: "destructive",
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

  const getUserDisplayName = () => {
    if (!user) return "Guest User";
    return fullName || user.email?.split('@')[0] || "User";
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-6 py-8 space-y-6">
        {/* Header with User Icon and Title */}
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-muted rounded-full mx-auto flex items-center justify-center">
            <User className="w-10 h-10 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-serif font-medium text-foreground">
            Profile & Settings
          </h1>
        </div>

        {/* User Status Section */}
        <div className="text-center space-y-3">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Using as:</p>
            <h2 className="text-lg font-medium text-foreground">
              {getUserDisplayName()}
            </h2>
            {!user && (
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to save your data across devices
              </p>
            )}
          </div>

          {!user ? (
            <Button 
              onClick={() => navigate("/auth")}
              size="lg"
              className="w-full"
            >
              <User className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          ) : (
            <Card>
              <CardContent className="p-4 space-y-4">
                <div>
                  <Label htmlFor="fullName" className="text-sm text-muted-foreground">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label className="text-sm text-muted-foreground">Email</Label>
                  <Input
                    value={user.email || ""}
                    disabled
                    className="mt-1 bg-muted"
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Language Toggle */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">Language</p>
                <p className="text-sm text-muted-foreground">Switch app language</p>
              </div>
              <LanguageToggle />
            </div>
          </CardContent>
        </Card>

        {/* Share Tracking Section */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <UserPlus className="w-5 h-5" />
              Share Tracking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share tracking with someone so they can view and add activities too.
            </p>

            <Button 
              onClick={handleInviteClick}
              className="w-full"
              variant="outline"
            >
              <Share className="w-4 h-4 mr-2" />
              {user ? (copied ? "Link Copied!" : "Copy Invite Link") : "Sign In to Share"}
            </Button>

            {/* List of Caregivers */}
            {collaborators && collaborators.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-medium text-foreground">Caregivers</span>
                </div>
                <div className="space-y-2">
                  {collaborators.map((collaborator) => (
                    <div 
                      key={collaborator.id}
                      className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
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
          </CardContent>
        </Card>

        {/* User Actions */}
        {user && (
          <div className="space-y-3">
            <Button
              onClick={handleChangePassword}
              variant="outline"
              className="w-full"
            >
              <Key className="w-4 h-4 mr-2" />
              Change Password
            </Button>

            <Button
              onClick={signOut}
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
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