import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface UserProfile {
  id: string;
  user_id: string;
  full_name?: string;
  photo_url?: string;
  role: 'parent' | 'caregiver';
  baby_name?: string;
  baby_birth_date?: string;
  created_at: string;
  updated_at: string;
}

export const useUserProfile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  // Fetch user profile
  const fetchUserProfile = async () => {
    if (!user) return null;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      
      setUserProfile(data as UserProfile);
      return data;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Update user profile
  const updateUserProfile = async (updates: Partial<Pick<UserProfile, 'full_name' | 'photo_url' | 'role' | 'baby_name' | 'baby_birth_date'>>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      // Ensure we have a valid session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No valid session found');

      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('user_id', session.user.id)
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data as UserProfile);
      return data;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  };

  // Create user profile (called from auth trigger, but can be called manually)
  const createUserProfile = async (profile: Partial<Pick<UserProfile, 'full_name' | 'photo_url' | 'role'>>) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No valid session found');

      const { data, error } = await supabase
        .from('profiles')
        .insert({
          user_id: session.user.id,
          full_name: profile.full_name || null,
          photo_url: profile.photo_url || null,
          role: profile.role || 'parent'
        })
        .select()
        .single();

      if (error) throw error;

      setUserProfile(data as UserProfile);
      return data;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  };

  // Load profile when user changes
  useEffect(() => {
    if (user) {
      fetchUserProfile();
    } else {
      setUserProfile(null);
    }
  }, [user]);

  // Set up realtime subscription for profile changes
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('user_profile_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          if (payload.eventType === 'UPDATE' || payload.eventType === 'INSERT') {
            setUserProfile(payload.new as UserProfile);
          } else if (payload.eventType === 'DELETE') {
            setUserProfile(null);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  return {
    userProfile,
    loading,
    fetchUserProfile,
    updateUserProfile,
    createUserProfile
  };
};