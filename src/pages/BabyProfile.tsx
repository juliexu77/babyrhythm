import { useState, useEffect } from "react";
import { Calendar, Ruler, Scale, Moon } from "lucide-react";
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
    <div className="min-h-screen bg-background overflow-y-auto">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-h2 text-foreground">Baby Profile</h1>
        </div>

        {/* Baby Photo */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <Avatar className="h-32 w-32">
              <AvatarImage src={household?.baby_photo_url || undefined} />
              <AvatarFallback className="text-4xl">
                {household?.baby_name?.charAt(0).toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          </div>
          
          <PhotoUpload
            currentPhotoUrl={household?.baby_photo_url || null}
            bucketName="baby-photos"
            folder={household?.id || 'default'}
            onPhotoUpdate={handleBabyPhotoUpdate}
            fallbackIcon="baby"
            size="lg"
          />
        </div>

        {/* Baby Details */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-base font-medium">{household?.baby_name || 'Not set'}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Age</p>
                <p className="text-base font-medium">{getBabyAge() || 'Not set'}</p>
              </div>
            </div>
          </div>

          {household?.baby_birthday && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="text-sm text-muted-foreground">Birthday</p>
                  <p className="text-base font-medium">
                    {format(new Date(household.baby_birthday), 'MMMM d, yyyy')}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Measurements */}
        {(latestWeight || latestHeight) && (
          <div className="bg-card border border-border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Latest Measurements</h3>
            
            {latestWeight && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Scale className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Weight</p>
                    <p className="text-base font-medium">
                      {latestWeight} kg
                      {weightPercentile && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({weightPercentile}th percentile)
                        </span>
                      )}
                    </p>
                    {latestWeightDate && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(latestWeightDate), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {latestHeight && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Ruler className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Height</p>
                    <p className="text-base font-medium">
                      {latestHeight} cm
                      {heightPercentile && (
                        <span className="text-sm text-muted-foreground ml-2">
                          ({heightPercentile}th percentile)
                        </span>
                      )}
                    </p>
                    {latestHeightDate && (
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(latestHeightDate), 'MMM d, yyyy')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Night Sleep Window */}
        <div className="bg-card border border-border rounded-lg p-4 space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Sleep Schedule</h3>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Night Sleep Start</p>
                <p className="text-xs text-muted-foreground">When overnight sleep typically begins</p>
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
                    title: "Night sleep start updated",
                    description: "Schedule will update on next refresh",
                  });
                } catch (error) {
                  console.error('Error updating night sleep start:', error);
                  toast({
                    title: "Error updating setting",
                    variant: "destructive",
                  });
                }
              }}
            >
              <SelectTrigger className="w-[120px]">
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">Night Sleep End</p>
                <p className="text-xs text-muted-foreground">When overnight sleep typically ends</p>
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
                    title: "Night sleep end updated",
                    description: "Schedule will update on next refresh",
                  });
                } catch (error) {
                  console.error('Error updating night sleep end:', error);
                  toast({
                    title: "Error updating setting",
                    variant: "destructive",
                  });
                }
              }}
            >
              <SelectTrigger className="w-[120px]">
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
  );
};

export default BabyProfile;
