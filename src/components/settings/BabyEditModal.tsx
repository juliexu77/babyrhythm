import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { InputWithStatus } from "@/components/ui/input-with-status";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { useLanguage } from "@/contexts/LanguageContext";
import { useToast } from "@/hooks/use-toast";
import { PhotoUpload } from "@/components/PhotoUpload";
import { DatePicker } from "@/components/ui/date-picker";
import { Baby } from "lucide-react";

interface BabyEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BabyEditModal = ({ open, onOpenChange }: BabyEditModalProps) => {
  const { user } = useAuth();
  const { household, updateHousehold } = useHousehold();
  const { t } = useLanguage();
  const { toast } = useToast();
  
  const [babyName, setBabyName] = useState("");
  const [babyBirthday, setBabyBirthday] = useState("");
  
  // Save status states
  const [babyNameSaveStatus, setBabyNameSaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");
  const [babyBirthdaySaveStatus, setBabyBirthdaySaveStatus] = useState<"idle" | "unsaved" | "saving" | "saved" | "error">("idle");

  // Initialize values when modal opens
  useEffect(() => {
    if (open && household) {
      setBabyName(household.baby_name || "");
      setBabyBirthday(household.baby_birthday || "");
    }
  }, [open, household]);

  // Auto-save baby name changes
  useEffect(() => {
    if (!user || !babyName || !household || babyName === household.baby_name) return;
    
    setBabyNameSaveStatus("unsaved");
    setBabyNameSaveStatus("saving");
    const timeoutId = setTimeout(async () => {
      try {
        await updateHousehold({ baby_name: babyName });
        setBabyNameSaveStatus("saved");
        setTimeout(() => setBabyNameSaveStatus("idle"), 3000);
      } catch (error) {
        setBabyNameSaveStatus("error");
        console.error('Error saving baby name:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [babyName, household, updateHousehold, user]);

  // Auto-save baby birthday changes
  useEffect(() => {
    if (!user || !household || babyBirthday === household.baby_birthday) return;
    
    setBabyBirthdaySaveStatus("unsaved");
    setBabyBirthdaySaveStatus("saving");
    const timeoutId = setTimeout(async () => {
      try {
        await updateHousehold({ baby_birthday: babyBirthday });
        setBabyBirthdaySaveStatus("saved");
        setTimeout(() => setBabyBirthdaySaveStatus("idle"), 3000);
      } catch (error) {
        setBabyBirthdaySaveStatus("error");
        console.error('Error updating baby birthday:', error);
      }
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [babyBirthday, household, updateHousehold, user]);

  const handleBabyPhotoUpdate = async (photoUrl: string | null) => {
    try {
      if (!household) return;
      
      // Update household with baby photo URL
      await updateHousehold({ baby_photo_url: photoUrl });
      console.log('Baby photo updated:', photoUrl);
      toast({
        title: "Photo uploaded",
        description: "Baby photo has been updated.",
      });
    } catch (error) {
      console.error('Error updating baby photo:', error);
      toast({
        title: "Error updating photo",
        description: "Please try again.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto p-0 [&>button[data-state]]:hidden">
        <DialogHeader className="p-6 pb-4">
          <DialogTitle className="text-center text-lg font-medium">
            {t('babyDetails')}
          </DialogTitle>
        </DialogHeader>
        
        <div className="px-6 pb-6 space-y-6">
          {/* Baby Photo */}
          <div className="flex justify-center">
            <PhotoUpload
              currentPhotoUrl={household?.baby_photo_url}
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
              className="mt-2"
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
                selected={babyBirthday ? (() => { 
                  const [y,m,d] = babyBirthday.split('-').map(Number); 
                  return new Date(y, m-1, d); 
                })() : undefined}
                onSelect={(date) => {
                  if (date) {
                    const year = date.getFullYear();
                    const month = String(date.getMonth() + 1).padStart(2, '0');
                    const day = String(date.getDate()).padStart(2, '0');
                    setBabyBirthday(`${year}-${month}-${day}`);
                  } else {
                    setBabyBirthday("");
                  }
                }}
                placeholder={t('selectBirthday')}
              />
            </div>
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