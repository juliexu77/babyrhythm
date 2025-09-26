import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface BabyProfile {
  id: string;
  name: string;
  birthday?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Collaborator {
  id: string;
  baby_profile_id: string;
  user_id: string;
  role: 'owner' | 'partner' | 'caregiver' | 'grandparent';
  invited_by: string;
  created_at: string;
  profiles?: {
    full_name: string;
  };
}

export function useBabyProfile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [babyProfile, setBabyProfile] = useState<BabyProfile | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchBabyProfile();
    
    // Set up real-time subscription
    const profileChannel = supabase
      .channel('baby-profile-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'baby_profiles'
        },
        () => fetchBabyProfile()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'collaborators'
        },
        () => fetchCollaborators()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [user]);

  const fetchBabyProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('baby_profiles')
        .select('*')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setBabyProfile(data || null);
      if (data) {
        fetchCollaborators(data.id);
      }
    } catch (error) {
      console.error('Error fetching baby profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaborators = async (profileId?: string) => {
    const profileIdToUse = profileId || babyProfile?.id;
    if (!profileIdToUse) return;

    try {
      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('baby_profile_id', profileIdToUse);

      if (error) throw error;
      setCollaborators((data || []).map(item => ({
        ...item,
        role: item.role as 'owner' | 'partner' | 'caregiver' | 'grandparent'
      })));
    } catch (error) {
      console.error('Error fetching collaborators:', error);
    }
  };

  const createBabyProfile = async (name: string, birthday?: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .from('baby_profiles')
        .insert({
          name,
          birthday: birthday || null,
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      setBabyProfile(data);
      
      // Clear localStorage baby profile if it exists
      localStorage.removeItem('babyProfile');
      
      toast({
        title: "Baby profile created!",
        description: `${name}'s profile has been set up successfully.`
      });

      return data;
    } catch (error) {
      console.error('Error creating baby profile:', error);
      toast({
        title: "Error creating profile",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const updateBabyProfile = async (updates: Partial<Pick<BabyProfile, 'name' | 'birthday'>>) => {
    if (!user || !babyProfile) throw new Error('User not authenticated or no profile');

    try {
      const { data, error } = await supabase
        .from('baby_profiles')
        .update(updates)
        .eq('id', babyProfile.id)
        .select()
        .single();

      if (error) throw error;

      setBabyProfile(data);
      
      toast({
        title: "Profile updated!",
        description: "Baby profile has been updated successfully."
      });

      return data;
    } catch (error) {
      console.error('Error updating baby profile:', error);
      toast({
        title: "Error updating profile",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const generateInviteLink = async (role: 'partner' | 'caregiver' | 'grandparent' = 'caregiver') => {
    if (!user || !babyProfile) throw new Error('User not authenticated or no profile');

    try {
      // Generate invite code
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_invite_code');

      if (codeError) throw codeError;

      const code = codeData;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { data, error } = await supabase
        .from('invite_links')
        .insert({
          baby_profile_id: babyProfile.id,
          code,
          role,
          expires_at: expiresAt.toISOString(),
          created_by: user.id
        })
        .select()
        .single();

      if (error) throw error;

      const inviteLink = `${window.location.origin}/invite/${code}`;
      
      toast({
        title: "Invite link created!",
        description: "Share this link with your partner or caregiver."
      });

      return { ...data, link: inviteLink };
    } catch (error) {
      console.error('Error generating invite link:', error);
      toast({
        title: "Error creating invite",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const acceptInvite = async (code: string) => {
    if (!user) throw new Error('User not authenticated');

    try {
      const { data, error } = await supabase
        .rpc('accept_invite', { invite_code: code });

      if (error) throw error;

      // Refresh baby profile after accepting invite
      await fetchBabyProfile();
      
      toast({
        title: "Invite accepted!",
        description: "You now have access to this baby's tracking."
      });

      return data;
    } catch (error) {
      console.error('Error accepting invite:', error);
      toast({
        title: "Error accepting invite",
        description: error.message || "Please check the invite link and try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    if (!user || !babyProfile) throw new Error('User not authenticated or no profile');

    try {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) throw error;

      toast({
        title: "Collaborator removed",
        description: "Access has been revoked successfully."
      });

      fetchCollaborators();
    } catch (error) {
      console.error('Error removing collaborator:', error);
      toast({
        title: "Error removing collaborator",
        description: "Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  return {
    babyProfile,
    collaborators,
    loading,
    createBabyProfile,
    updateBabyProfile,
    generateInviteLink,
    acceptInvite,
    removeCollaborator,
    refetch: fetchBabyProfile
  };
}