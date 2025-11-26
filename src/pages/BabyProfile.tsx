import { useState, useEffect } from "react";
import { Calendar, Ruler, Scale, Moon, X, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHousehold } from "@/hooks/useHousehold";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useToast } from "@/hooks/use-toast";
import { useActivities } from "@/hooks/useActivities";
import { PhotoUpload } from "@/components/PhotoUpload";
import { format } from "date-fns";

// WHO growth charts data (simplified percentile calculations)
// These are approximate values for demonstration - in production, use full WHO tables
const calculatePercentile = (
  ageInMonths: number,
  value: number,
  type: 'weight' | 'height',
  sex: string
): number => {
  // This is a simplified calculation - in production, use complete WHO data tables
  // For now, return a placeholder percentile based on relative position
  // Real implementation would use WHO standard deviation scores (z-scores)
  
  // Simplified percentile ranges for demonstration
  const ranges: Record<string, any> = {
    weight: {
      male: [
        { age: 0, p5: 2.5, p50: 3.3, p95: 4.3 },
        { age: 3, p5: 5.0, p50: 6.0, p95: 7.2 },
        { age: 6, p5: 6.4, p50: 7.9, p95: 9.8 },
        { age: 12, p5: 8.4, p50: 10.2, p95: 12.3 },
      ],
      female: [
        { age: 0, p5: 2.4, p50: 3.2, p95: 4.2 },
        { age: 3, p5: 4.5, p50: 5.8, p95: 7.0 },
        { age: 6, p5: 5.7, p50: 7.3, p95: 9.3 },
        { age: 12, p5: 7.7, p50: 9.5, p95: 11.5 },
      ]
    },
    height: {
      male: [
        { age: 0, p5: 46, p50: 50, p95: 54 },
        { age: 3, p5: 57, p50: 61, p95: 65 },
        { age: 6, p5: 63, p50: 68, p95: 72 },
        { age: 12, p5: 71, p50: 76, p95: 81 },
      ],
      female: [
        { age: 0, p5: 45, p50: 49, p95: 53 },
        { age: 3, p5: 55, p50: 60, p95: 64 },
        { age: 6, p5: 61, p50: 66, p95: 70 },
        { age: 12, p5: 69, p50: 74, p95: 79 },
      ]
    }
  };

  const genderData = ranges[type][sex === 'female' ? 'female' : 'male'];
  const closest = genderData.reduce((prev: any, curr: any) => 
    Math.abs(curr.age - ageInMonths) < Math.abs(prev.age - ageInMonths) ? curr : prev
  );

  if (value < closest.p5) return 3;
  if (value < closest.p50) return 25;
  if (value < closest.p95) return 75;
  return 97;
};

export const BabyProfile = ({ onClose }: { onClose?: () => void }) => {
  const { household, updateHousehold } = useHousehold();
  const { userProfile, updateUserProfile } = useUserProfile();
  const { activities } = useActivities();
  const { toast } = useToast();
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);

  const getBabyAge = () => {
    if (!household?.baby_birthday) return "";
    
    const birthDate = new Date(household.baby_birthday);
    const today = new Date();
    
    let ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    
    if (today.getDate() < birthDate.getDate()) {
      ageInMonths = Math.max(0, ageInMonths - 1);
    }
    
    const lastMonthDate = new Date(birthDate);
    lastMonthDate.setMonth(birthDate.getMonth() + ageInMonths);
    const daysSinceLastMonth = Math.floor((today.getTime() - lastMonthDate.getTime()) / (1000 * 60 * 60 * 24));
    const weeks = Math.floor(daysSinceLastMonth / 7);
    
    return ageInMonths === 0 
      ? `${weeks} ${weeks === 1 ? 'week' : 'weeks'}` 
      : `${ageInMonths} ${ageInMonths === 1 ? 'month' : 'months'}${weeks > 0 ? ` ${weeks}w` : ''}`;
  };

  const getAgeInMonths = () => {
    if (!household?.baby_birthday) return 0;
    const birthDate = new Date(household.baby_birthday);
    const today = new Date();
    let ageInMonths = (today.getFullYear() - birthDate.getFullYear()) * 12 + (today.getMonth() - birthDate.getMonth());
    if (today.getDate() < birthDate.getDate()) {
      ageInMonths = Math.max(0, ageInMonths - 1);
    }
    return ageInMonths;
  };

  // Get most recent measurements from database activities
  const measurementActivities = (activities as any[])
    .filter(a => a.type === 'measure' && a.details)
    .sort((a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime());

  const latestWeightActivity = measurementActivities.find(m => (m.details as any).weight);
  const latestHeightActivity = measurementActivities.find(m => (m.details as any).height);
  
  const latestWeight = latestWeightActivity ? (latestWeightActivity.details as any).weight : null;
  const latestHeight = latestHeightActivity ? (latestHeightActivity.details as any).height : null;
  const latestWeightDate = latestWeightActivity?.logged_at;
  const latestHeightDate = latestHeightActivity?.logged_at;

  const ageInMonths = getAgeInMonths();
  const weightPercentile = latestWeight && household?.baby_sex 
    ? calculatePercentile(ageInMonths, parseFloat(latestWeight), 'weight', household.baby_sex)
    : null;
  const heightPercentile = latestHeight && household?.baby_sex
    ? calculatePercentile(ageInMonths, parseFloat(latestHeight), 'height', household.baby_sex)
    : null;

  const handleBabyPhotoUpdate = async (newPhotoUrl: string | null) => {
    try {
      await updateHousehold({ baby_photo_url: newPhotoUrl });
      toast({
        title: newPhotoUrl ? "Photo updated" : "Photo removed",
      });
    } catch (error) {
      console.error('Error updating baby photo:', error);
      toast({
        title: "Error updating photo",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <h1 className="text-xl font-serif font-semibold">Profile</h1>
          {onClose && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="h-8 w-8 p-0 rounded-full"
            >
              <X className="h-5 w-5" />
            </Button>
          )}
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Baby Photo & Name Section */}
        <div className="px-6 pt-8 pb-6 border-b border-border">
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <Avatar className="h-24 w-24 ring-2 ring-border ring-offset-2 ring-offset-background">
                <AvatarImage src={household?.baby_photo_url || undefined} />
                <AvatarFallback className="text-3xl">
                  {household?.baby_name?.charAt(0).toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              <PhotoUpload
                currentPhotoUrl={household?.baby_photo_url || null}
                bucketName="baby-photos"
                folder={household?.id || 'default'}
                onPhotoUpdate={handleBabyPhotoUpdate}
                fallbackIcon="baby"
                size="sm"
              />
            </div>
            
            <div className="text-center">
              <h2 className="text-2xl font-serif font-bold">{household?.baby_name || 'Baby'}</h2>
              <p className="text-muted-foreground mt-1">{getBabyAge() || 'Age not set'}</p>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="px-6 py-2">
          {household?.baby_birthday && (
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Birthday</p>
                  <p className="text-sm text-muted-foreground">
                    {format(new Date(household.baby_birthday), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {latestWeight && (
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Scale className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Weight</p>
                  <p className="text-sm text-muted-foreground">
                    {latestWeight} kg
                    {weightPercentile && ` • ${weightPercentile}th percentile`}
                  </p>
                  {latestWeightDate && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(latestWeightDate), 'MMM d')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {latestHeight && (
            <div className="flex items-center justify-between py-4 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Ruler className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Height</p>
                  <p className="text-sm text-muted-foreground">
                    {latestHeight} cm
                    {heightPercentile && ` • ${heightPercentile}th percentile`}
                  </p>
                  {latestHeightDate && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {format(new Date(latestHeightDate), 'MMM d')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sleep Schedule Section */}
        <div className="px-6 py-4 border-t-8 border-muted/50">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            Sleep Schedule
          </h3>
          
          <div className="space-y-1">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Moon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Night starts</p>
                  <p className="text-xs text-muted-foreground">When sleep begins</p>
                </div>
              </div>
              <Select
                value={`${(userProfile as any)?.night_sleep_start_hour ?? 19}:${(userProfile as any)?.night_sleep_start_minute ?? 0}`}
                onValueChange={async (value) => {
                  try {
                    const [hour, minute] = value.split(':').map(Number);
                    await updateUserProfile({ 
                      night_sleep_start_hour: hour,
                      night_sleep_start_minute: minute 
                    } as any);
                    toast({
                      title: "Updated",
                      description: "Night sleep start time saved",
                    });
                  } catch (error) {
                    console.error('Error updating night sleep start:', error);
                    toast({
                      title: "Error",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <SelectTrigger className="w-[110px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 24 }, (_, i) => {
                    const totalMinutes = (18 * 60) + (i * 15);
                    const hour = Math.floor(totalMinutes / 60);
                    const minute = totalMinutes % 60;
                    if (hour >= 24) return null;
                    
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
            </div>

            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-3 flex-1">
                <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                  <Moon className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Night ends</p>
                  <p className="text-xs text-muted-foreground">When sleep ends</p>
                </div>
              </div>
              <Select
                value={`${(userProfile as any)?.night_sleep_end_hour ?? 7}:${(userProfile as any)?.night_sleep_end_minute ?? 0}`}
                onValueChange={async (value) => {
                  try {
                    const [hour, minute] = value.split(':').map(Number);
                    await updateUserProfile({ 
                      night_sleep_end_hour: hour,
                      night_sleep_end_minute: minute 
                    } as any);
                    toast({
                      title: "Updated",
                      description: "Night sleep end time saved",
                    });
                  } catch (error) {
                    console.error('Error updating night sleep end:', error);
                    toast({
                      title: "Error",
                      variant: "destructive",
                    });
                  }
                }}
              >
                <SelectTrigger className="w-[110px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 21 }, (_, i) => {
                    const totalMinutes = (5 * 60) + (i * 15);
                    const hour = Math.floor(totalMinutes / 60);
                    const minute = totalMinutes % 60;
                    if (hour > 10) return null;
                    
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BabyProfile;
