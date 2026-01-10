import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputWithStatus } from "@/components/ui/input-with-status";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PhotoUpload } from "@/components/PhotoUpload";
import { User } from "lucide-react";

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ProfileEditModal = ({ open, onOpenChange }: ProfileEditModalProps) => {
  const { user } = useAuth();
  const { userProfile, updateUserProfile } = useUserProfile();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [fullName, setFullName] = useState("");
  
  // Save status states
  const [fullNameSaveStatus, setFullNameSaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");

  // Initialize values when modal opens
  useEffect(() => {
    if (open) {
      setFullName(user?.user_metadata?.full_name || userProfile?.full_name || "");
    }
  }, [open, user, userProfile]);

  // Auto-save full name changes
  useEffect(() => {
    if (!user || !fullName || fullName === (user?.user_metadata?.full_name || userProfile?.full_name || "")) return;
    
    setFullNameSaveStatus("unsaved");
    const timeoutId = setTimeout(async () => {
      setFullNameSaveStatus("saving");
      try {
        const { error } = await supabase.auth.updateUser({
          data: { full_name: fullName }
        });
        
        if (error) throw error;
        setFullNameSaveStatus("saved");
        setTimeout(() => setFullNameSaveStatus("idle"), 3000);
        
      } catch (error) {
        setFullNameSaveStatus("error");
        console.error('Error updating profile:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [fullName, user]);

  const handleUserPhotoUpdate = async (photoUrl: string | null) => {
    try {
      await updateUserProfile({ photo_url: photoUrl });
    } catch (error) {
      console.error('Error updating user photo:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto p-0 [&>button[data-state]]:hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-center text-lg font-medium">
            {t('profile')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6 space-y-6">
          {/* Profile Photo */}
          <div className="flex justify-center">
            <PhotoUpload
              currentPhotoUrl={userProfile?.photo_url}
              bucketName="profile-photos"
              folder={user?.id || "unknown"}
              fallbackIcon={<User className="w-10 h-10 text-muted-foreground" />}
              onPhotoUpdate={handleUserPhotoUpdate}
              size="lg"
            />
          </div>

          {/* Full Name */}
          <div>
            <Label htmlFor="fullName" className="text-form-label">
              {t('fullName')}
            </Label>
            <InputWithStatus
              id="fullName"
              value={fullName}
              onValueChange={setFullName}
              placeholder="Enter your full name"
              className="mt-2"
              saveStatus={fullNameSaveStatus}
              errorMessage={t('failedToSaveName')}
            />
          </div>
          
          {/* Email - Read only */}
          <div>
            <Label className="text-form-label">{t('email')}</Label>
            <Input
              value={user?.email || ""}
              disabled
              className="mt-2 bg-muted"
            />
          </div>

          <Button
            onClick={() => onOpenChange(false)} 
            className="w-full"
          >
            {t('done')}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};