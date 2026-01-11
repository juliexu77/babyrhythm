import { format } from "date-fns";
import { Activity } from "@/types/activity";
import { rawStorage } from "@/hooks/useLocalStorage";
import { logError } from "@/utils/logger";
import { supabase } from "@/integrations/supabase/client";

interface MissedActivityHandlerProps {
  suggestion: {
    activityType: 'feed' | 'nap' | 'diaper';
    subType?: string;
    suggestedTime: string;
  };
  householdId?: string;
  ongoingNap?: Activity | null;
  addActivity?: (type: string, details?: any, activityDate?: Date, activityTime?: string) => Promise<void>;
}

export const handleMissedActivityAccept = async ({
  suggestion,
  householdId,
  ongoingNap,
  addActivity
}: MissedActivityHandlerProps) => {
  const { activityType, subType, suggestedTime } = suggestion;
  
  const acceptKey = `accepted-${householdId || 'household'}-${activityType}-${subType || 'default'}-${format(new Date(), 'yyyy-MM-dd-HH:mm')}`;
  rawStorage.set(acceptKey as any, Date.now().toString());
  
  if (subType === 'morning-wake') {
    if (ongoingNap && addActivity) {
      try {
        const { error } = await supabase
          .from('activities')
          .update({ details: { ...ongoingNap.details, endTime: suggestedTime } })
          .eq('id', ongoingNap.id);
        
        if (error) throw error;
        window.dispatchEvent(new CustomEvent('refetch-activities'));
      } catch (error) {
        logError('End sleep', error);
      }
    }
  } else {
    if (activityType === 'nap') {
      await addActivity?.('nap', { startTime: suggestedTime }, new Date(), suggestedTime);
    } else {
      await addActivity?.(activityType, {}, new Date(), suggestedTime);
    }
  }
};

export const handleMissedActivityDismiss = (
  suggestion: { activityType: string; subType?: string },
  householdId?: string
) => {
  const { activityType, subType } = suggestion;
  const dismissalKey = `missed-${householdId || 'household'}-${activityType}-${subType || 'default'}-${format(new Date(), 'yyyy-MM-dd')}`;
  rawStorage.set(dismissalKey as any, 'true');
  window.dispatchEvent(new CustomEvent('refetch-activities'));
};

interface QuickLogHandlerProps {
  type: 'feed' | 'nap' | 'diaper';
  time: string;
  activities: Activity[];
  addActivity?: (type: string, details?: any, activityDate?: Date, activityTime?: string) => Promise<void>;
}

export const handleQuickLog = async ({
  type,
  time,
  activities,
  addActivity
}: QuickLogHandlerProps) => {
  if (type === 'nap') {
    await addActivity?.('nap', { startTime: time }, new Date(), time);
  } else if (type === 'feed') {
    const recentFeed = activities
      .filter(a => a.type === 'feed' && a.details?.quantity)
      .sort((a, b) => new Date(b.loggedAt || b.time).getTime() - new Date(a.loggedAt || a.time).getTime())[0];
    
    const feedDetails: any = {};
    if (recentFeed?.details?.quantity) {
      feedDetails.quantity = recentFeed.details.quantity;
      if (recentFeed.details.unit) feedDetails.unit = recentFeed.details.unit;
      if (recentFeed.details.feedType) feedDetails.feedType = recentFeed.details.feedType;
    }
    
    await addActivity?.('feed', feedDetails, new Date(), time);
  } else if (type === 'diaper') {
    await addActivity?.('diaper', {}, new Date(), time);
  }
};

export const getAvailableStoryDates = (): string[] => {
  const dates: string[] = [];
  const today = new Date();
  for (let i = 4; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    dates.push(format(date, 'yyyy-MM-dd'));
  }
  return dates;
};
