import { useEffect, useRef } from "react";
import { useToast } from "@/hooks/use-toast";
import { PredictedSchedule } from "@/utils/schedulePredictor";
import { Bell, Moon, Milk } from "lucide-react";

interface UseSmartRemindersProps {
  schedule: PredictedSchedule | null;
  enabled: boolean;
}

/**
 * Hook to manage smart reminders for upcoming schedule events
 * Shows notifications 15 minutes before naps and 30 minutes before feeds
 */
export function useSmartReminders({ schedule, enabled }: UseSmartRemindersProps) {
  const { toast } = useToast();
  const shownRemindersRef = useRef<Set<string>>(new Set());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!schedule || !enabled) {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    // Reset shown reminders daily
    const today = new Date().toDateString();
    const lastResetDate = localStorage.getItem('remindersResetDate');
    if (lastResetDate !== today) {
      shownRemindersRef.current.clear();
      localStorage.setItem('remindersResetDate', today);
      localStorage.removeItem('shownReminders');
    } else {
      // Load previously shown reminders
      const stored = localStorage.getItem('shownReminders');
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          shownRemindersRef.current = new Set(parsed);
        } catch (e) {
          console.error('Failed to parse shown reminders:', e);
        }
      }
    }

    const parseTime = (timeStr: string): number => {
      const match = timeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      if (!match) return 0;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const period = match[3].toUpperCase();
      if (period === 'PM' && hours !== 12) hours += 12;
      if (period === 'AM' && hours === 12) hours = 0;
      return hours * 60 + minutes;
    };

    const formatTime = (minutes: number): string => {
      const hours24 = Math.floor(minutes / 60) % 24;
      const mins = Math.floor(minutes % 60);
      const period = hours24 >= 12 ? 'PM' : 'AM';
      const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24;
      return `${hours12}:${mins.toString().padStart(2, '0')} ${period}`;
    };

    const checkReminders = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();

      schedule.events.forEach((event) => {
        const eventMinutes = parseTime(event.time);
        const minutesUntil = eventMinutes - currentMinutes;
        
        // Reminder key to track if shown
        const reminderKey = `${event.type}-${event.time}`;
        
        // Don't show if already shown
        if (shownRemindersRef.current.has(reminderKey)) return;

        // Wind-down reminder 15 minutes before nap
        if (event.type === 'nap' && minutesUntil <= 15 && minutesUntil > 0) {
          toast({
            title: "Wind-down time approaching",
            description: `Nap scheduled at ${event.time} — start calming activities`,
            duration: 8000,
            action: (
              <Moon className="w-5 h-5 text-blue-500" />
            ),
          });
          shownRemindersRef.current.add(reminderKey);
          saveShownReminders();
        }
        
        // Feed window reminder 30 minutes before feed
        if (event.type === 'feed' && minutesUntil <= 30 && minutesUntil > 0) {
          toast({
            title: "Feed window opening soon",
            description: `Feed scheduled at ${event.time} — prepare bottles/nursing area`,
            duration: 8000,
            action: (
              <Milk className="w-5 h-5 text-amber-500" />
            ),
          });
          shownRemindersRef.current.add(reminderKey);
          saveShownReminders();
        }

        // Bedtime routine reminder 30 minutes before bed
        if (event.type === 'bed' && minutesUntil <= 30 && minutesUntil > 0) {
          toast({
            title: "Bedtime routine approaching",
            description: `Bedtime at ${event.time} — start winding down`,
            duration: 8000,
            action: (
              <Bell className="w-5 h-5 text-purple-500" />
            ),
          });
          shownRemindersRef.current.add(reminderKey);
          saveShownReminders();
        }
      });
    };

    const saveShownReminders = () => {
      localStorage.setItem(
        'shownReminders',
        JSON.stringify(Array.from(shownRemindersRef.current))
      );
    };

    // Check every minute
    checkReminders(); // Check immediately
    checkIntervalRef.current = setInterval(checkReminders, 60000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
    };
  }, [schedule, enabled, toast]);

  return {
    resetReminders: () => {
      shownRemindersRef.current.clear();
      localStorage.removeItem('shownReminders');
    }
  };
}
