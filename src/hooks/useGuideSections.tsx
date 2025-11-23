import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useHousehold } from './useHousehold';
import { useAuth } from './useAuth';

export interface GuideSections {
  data_pulse: {
    metrics: Array<{ name: string; change: string }>;
    note: string;
  };
  what_to_know: string[];
  what_to_do: string[];
  whats_next: string;
  prep_tip: string;
}

export function useGuideSections(activitiesCount: number) {
  const { household } = useHousehold();
  const { user } = useAuth();
  const [guideSections, setGuideSections] = useState<GuideSections | null>(null);
  const [loading, setLoading] = useState(false);

  // Tier 3: Personalized AI (10+ total activities AND 4+ daytime naps AND 4+ feeds)
  const hasTier3Data = activitiesCount >= 10;

  useEffect(() => {
    if (!hasTier3Data || !user || !household) return;

    const fetchGuideSections = async () => {
      setLoading(true);
      try {
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        console.log('🔄 Fetching guide sections from edge function...');
        const { data, error } = await supabase.functions.invoke('generate-guide-sections', {
          body: { timezone }
        });

        if (error) {
          console.error('❌ Error fetching guide sections:', error);
          return;
        }

        if (data) {
          console.log('✅ Guide sections fetched:', data);
          setGuideSections(data);
          localStorage.setItem('guideSections', JSON.stringify(data));
          localStorage.setItem('guideSectionsLastFetch', new Date().toISOString());
        }
      } catch (err) {
        console.error('❌ Failed to fetch guide sections:', err);
      } finally {
        setLoading(false);
      }
    };

    // Check if we need to fetch
    const lastFetch = localStorage.getItem('guideSectionsLastFetch');
    const cached = localStorage.getItem('guideSections');
    const now = new Date();
    const fiveAM = new Date();
    fiveAM.setHours(5, 0, 0, 0);

    // Load cached data first
    if (cached && !guideSections) {
      try {
        const parsed = JSON.parse(cached);
        console.log('📦 Loaded cached guide sections:', parsed);
        // Check if cached data has new format with data_pulse
        if (!parsed.data_pulse) {
          console.log('⚠️ Old cache format detected, will fetch fresh data');
          localStorage.removeItem('guideSections');
          localStorage.removeItem('guideSectionsLastFetch');
        } else {
          setGuideSections(parsed);
        }
      } catch (e) {
        console.error('Failed to parse cached guide sections:', e);
        localStorage.removeItem('guideSections');
      }
    }

    // Determine if we should fetch new data - once per day at 6am
    let shouldFetch = false;
    if (!lastFetch) {
      shouldFetch = true;
    } else {
      const lastFetchDate = new Date(lastFetch);
      const currentHour = now.getHours();
      
      // Check if last fetch was on a different day and we're at or past 6am
      const lastFetchDay = lastFetchDate.toDateString();
      const todayDay = now.toDateString();
      
      if (lastFetchDay !== todayDay && currentHour >= 6) {
        shouldFetch = true;
      }
    }

    if (shouldFetch && hasTier3Data) {
      console.log('🚀 Fetching fresh guide sections...');
      fetchGuideSections();
    }
  }, [hasTier3Data, user, guideSections, household]);

  return { guideSections, loading };
}
