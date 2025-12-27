import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from './useHousehold';
import { useAuth } from './useAuth';

interface TravelDay {
  id: string;
  date: string;
  created_at: string;
}

export const useTravelDays = () => {
  const { household } = useHousehold();
  const { user } = useAuth();
  const [travelDays, setTravelDays] = useState<TravelDay[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch travel days for the household
  const fetchTravelDays = useCallback(async () => {
    if (!household?.id) {
      setTravelDays([]);
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('travel_days')
        .select('id, date, created_at')
        .eq('household_id', household.id)
        .order('date', { ascending: false });

      if (error) throw error;
      setTravelDays(data || []);
    } catch (error) {
      console.error('Error fetching travel days:', error);
    } finally {
      setLoading(false);
    }
  }, [household?.id]);

  useEffect(() => {
    fetchTravelDays();
  }, [fetchTravelDays]);

  // Check if a date is marked as travel day
  const isTravelDay = useCallback((dateKey: string): boolean => {
    return travelDays.some(td => td.date === dateKey);
  }, [travelDays]);

  // Toggle travel day status for a date
  const toggleTravelDay = useCallback(async (dateKey: string): Promise<boolean> => {
    if (!household?.id || !user?.id) return false;

    const existingTravelDay = travelDays.find(td => td.date === dateKey);

    try {
      if (existingTravelDay) {
        // Remove travel day
        const { error } = await supabase
          .from('travel_days')
          .delete()
          .eq('id', existingTravelDay.id);

        if (error) throw error;
        
        setTravelDays(prev => prev.filter(td => td.id !== existingTravelDay.id));
        return false; // Now NOT a travel day
      } else {
        // Add travel day
        const { data, error } = await supabase
          .from('travel_days')
          .insert({
            household_id: household.id,
            date: dateKey,
            created_by: user.id
          })
          .select('id, date, created_at')
          .single();

        if (error) throw error;
        
        if (data) {
          setTravelDays(prev => [...prev, data]);
        }
        return true; // Now IS a travel day
      }
    } catch (error) {
      console.error('Error toggling travel day:', error);
      throw error;
    }
  }, [household?.id, user?.id, travelDays]);

  // Get all travel day date strings for filtering
  const travelDayDates = travelDays.map(td => td.date);

  return {
    travelDays,
    travelDayDates,
    loading,
    isTravelDay,
    toggleTravelDay,
    refetch: fetchTravelDays
  };
};
