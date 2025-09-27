import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useToast } from "./use-toast";

export interface BabyProfile {
  id: string;
  name: string;
  birthday?: string;
  photo_url?: string | null;
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
      setBabyProfile(null);
      setCollaborators([]);
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
      console.log('Fetching baby profile for user:', user?.id);
      // Query for baby profiles the user has access to
      const { data, error } = await supabase
        .from('baby_profiles')
        .select('*')
        .limit(1);

      console.log('Baby profile query result:', { data, error });

      if (error) {
        console.error('Error fetching baby profile:', error);
        throw error;
      }

      // Take the first profile if any exist
      setBabyProfile(data?.[0] || null);
      if (data?.[0]) {
        fetchCollaborators(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching baby profile:', error);
      setBabyProfile(null);
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
      // Ensure we have a valid session before creating the profile
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user?.id) {
        throw new Error('No valid session found');
      }

      const { data, error } = await supabase
        .from('baby_profiles')
        .insert({
          name,
          birthday: birthday || null,
          created_by: session.user.id
        })
        .select()
        .single();

      if (error) {
        console.error('Baby profile creation error:', error);
        throw error;
      }

      setBabyProfile(data);
      
      // Clear localStorage baby profile if it exists (ensure database is source of truth)
      localStorage.removeItem('babyProfile');
      localStorage.removeItem('babyProfileCompleted');
      
      toast({
        title: "Baby profile created!",
        description: `${name}'s profile has been set up successfully.`
      });

      return data;
    } catch (error: any) {
      console.error('Error creating baby profile:', error);
      
      toast({
        title: "Error creating profile",
        description: "Please try again.",
        variant: "destructive"
      });
      
      throw error;
    }
  };

  const updateBabyProfile = async (updates: Partial<Pick<BabyProfile, 'name' | 'birthday' | 'photo_url'>>) => {
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
    if (!user) throw new Error('User not authenticated');
    
    try {
      // Check if baby profile exists first
      if (!babyProfile) {
        throw new Error('No baby profile found. Please set up your baby profile first.');
      }
      
      let profileToUse = babyProfile;

      // Check for existing valid invite first
      const { data: existingInvites, error: checkError } = await supabase
        .from('invite_links')
        .select('*')
        .eq('baby_profile_id', profileToUse.id)
        .eq('role', role)
        .eq('created_by', user.id)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1);

      if (checkError) throw checkError;

      // If valid invite exists, return it
      if (existingInvites && existingInvites.length > 0) {
        const existingInvite = existingInvites[0];
        const inviteLink = `${window.location.origin}/invite/${existingInvite.code}`;
        
        toast({
          title: "Existing invite link copied!",
          description: "Using your previously created invite link."
        });

        return { ...existingInvite, link: inviteLink };
      }

      // Generate new invite code if none exists
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_invite_code');

      if (codeError) throw codeError;

      const code = codeData;
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

      const { data, error } = await supabase
        .from('invite_links')
        .insert({
          baby_profile_id: profileToUse.id,
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