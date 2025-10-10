import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Household {
  id: string;
  name: string;
  baby_name: string | null;
  baby_birthday: string | null; // Date as string in YYYY-MM-DD format
  baby_photo_url: string | null; // Added baby photo URL
  created_at: string;
  updated_at: string;
}

interface Collaborator {
  id: string;
  household_id: string;
  user_id: string;
  role: string;
  invited_by: string;
  created_at: string;
  profiles?: {
    full_name: string | null;
    user_id: string;
  } | null;
}

export const useHousehold = () => {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch user's household and collaborators
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchHousehold();
    // fetchCollaborators will be called from within fetchHousehold after household is set

    // Set up real-time subscriptions
    const householdsSubscription = supabase
      .channel('household-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'households' }, 
        () => {
          fetchHousehold();
        }
      )
      .subscribe();

    const collaboratorsSubscription = supabase
      .channel('collaborator-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'collaborators' }, 
        () => {
          fetchCollaborators();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(householdsSubscription);
      supabase.removeChannel(collaboratorsSubscription);
    };
  }, [user]);

  const fetchHousehold = async () => {
    if (!user) return;

    try {
      setError(null);
      console.log('Fetching household for user:', user.id);
      
      // Try to use the active household from localStorage first
      let preferredHouseholdId: string | null = null;
      try {
        preferredHouseholdId = localStorage.getItem('active_household_id');
      } catch {}
      
      let householdId: string | null = null;

      if (preferredHouseholdId) {
        // Verify the user is a collaborator of the preferred household
        const { data: preferredCollab, error: preferredError } = await supabase
          .from('collaborators')
          .select('household_id')
          .eq('user_id', user.id)
          .eq('household_id', preferredHouseholdId)
          .limit(1);

        if (preferredError) {
          console.error('Error verifying preferred household access:', preferredError);
          // Clear invalid household ID
          localStorage.removeItem('active_household_id');
        } else if (preferredCollab && preferredCollab.length > 0) {
          householdId = preferredCollab[0].household_id;
        } else {
          // User no longer has access to this household, clear it
          console.log('User no longer has access to preferred household, clearing');
          localStorage.removeItem('active_household_id');
        }
      }

      if (!householdId) {
        // Fallback to the oldest (original) household as default
        const { data: collaboratorData, error: collaboratorError } = await supabase
          .from('collaborators')
          .select('household_id, created_at')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true })
          .limit(1);

        if (collaboratorError) {
          console.error('Error fetching collaborator data:', collaboratorError);
          setError('Failed to load your household. Please try again.');
          setLoading(false);
          return;
        }

        if (!collaboratorData || collaboratorData.length === 0) {
          console.log('No household found for user');
          setHousehold(null);
          setError(null); // No error - user just doesn't have a household
          setLoading(false);
          return;
        }

        householdId = collaboratorData[0].household_id;

        // Persist as active if none was set
        try {
          if (!preferredHouseholdId) {
            localStorage.setItem('active_household_id', householdId);
          }
        } catch {}
      }

      // Fetch the actual household data
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('id', householdId)
        .single();

      if (householdError) {
        console.error('Error fetching household:', householdError);
        setError('Failed to load household data. Please try again.');
        setLoading(false);
        return;
      }

      console.log('Household data:', householdData);
      setHousehold(householdData);
      setError(null);
      
      // Fetch collaborators immediately after setting household
      await fetchCollaborators(householdData.id);
    } catch (error) {
      console.error('Error in fetchHousehold:', error);
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaborators = async (householdId?: string) => {
    if (!user) return;

    try {
      const targetHouseholdId = householdId || household?.id;
      if (!targetHouseholdId) return;

      console.log('Fetching collaborators for household:', targetHouseholdId);

      // Use the secure function to get collaborators with profile names
      const { data, error } = await supabase.rpc('get_collaborators_with_profiles', {
        _household_id: targetHouseholdId
      });

      if (error) {
        console.error('Error fetching collaborators:', error);
        return;
      }

      console.log('Collaborators with profiles:', data);

      // Transform the data to match our interface
      const collaborators = data?.map((collaborator: any) => ({
        id: collaborator.id,
        household_id: collaborator.household_id,
        user_id: collaborator.user_id,
        role: collaborator.role,
        invited_by: collaborator.invited_by,
        created_at: collaborator.created_at,
        profiles: collaborator.full_name ? {
          full_name: collaborator.full_name,
          user_id: collaborator.user_id
        } : null
      })) || [];

      setCollaborators(collaborators);
    } catch (error) {
      console.error('Error in fetchCollaborators:', error);
    }
  };

  const createHousehold = async (babyName: string, babyBirthday?: string) => {
    if (!user) {
      throw new Error('User must be authenticated to create household');
    }

    try {
      console.log('Creating household with baby name:', babyName, 'birthday:', babyBirthday);

      // Check if user is already a parent in another household
      const { data: isParent } = await supabase.rpc('user_is_parent_in_household', {
        _user_id: user.id
      });

      if (isParent) {
        throw new Error('You already have a household. You can only be the owner of one household, but you can join others as a collaborator.');
      }

      // Create household with client-generated id to avoid RLS issues on RETURNING
      const newHouseholdId = crypto.randomUUID();

      const { error: householdError } = await supabase
        .from('households')
        .insert([
          {
            id: newHouseholdId,
            name: `${babyName}'s Household`,
            baby_name: babyName,
            baby_birthday: babyBirthday || null,
          }
        ]);

      if (householdError) {
        console.error('Household creation error:', householdError);
        throw householdError;
      }

      // Add user as collaborator (parent)
      const { error: collaboratorError } = await supabase
        .from('collaborators')
        .insert([{
          household_id: newHouseholdId,
          user_id: user.id,
          role: 'parent',
          invited_by: user.id,
        }]);

      if (collaboratorError) {
        console.error('Error adding user as collaborator:', collaboratorError);
        throw collaboratorError;
      }

      // Now we can safely fetch the household (SELECT policy will pass)
      const { data: householdData, error: fetchError } = await supabase
        .from('households')
        .select('*')
        .eq('id', newHouseholdId)
        .single();

      if (fetchError) {
        console.error('Error fetching newly created household:', fetchError);
        throw fetchError;
      }

      setHousehold(householdData);
      await fetchCollaborators(newHouseholdId);
      
      return householdData;
    } catch (error) {
      console.error('Error creating household:', error);
      throw error;
    }
  };

  const updateHousehold = async (updates: Partial<Pick<Household, 'name' | 'baby_name' | 'baby_birthday' | 'baby_photo_url'>>) => {
    if (!household) {
      throw new Error('No household to update');
    }

    try {
      const { data, error } = await supabase
        .from('households')
        .update(updates)
        .eq('id', household.id)
        .select()
        .single();

      if (error) {
        console.error('Error updating household:', error);
        throw error;
      }

      console.log('Updated household data:', data);
      setHousehold(data);
      return data;
    } catch (error) {
      console.error('Error in updateHousehold:', error);
      throw error;
    }
  };

  const generateInviteLink = async (role?: 'caregiver') => {
    if (!user || !household) {
      throw new Error('User and household required for invite');
    }

    try {
      const inviteRole = role || 'caregiver';
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now

      const { data, error } = await supabase
        .from('invite_links')
        .insert([{
          household_id: household.id,
          role: inviteRole,
          expires_at: expiresAt.toISOString(),
          created_by: user.id,
          code: generateInviteCode(),
        }])
        .select()
        .single();

      if (error) {
        console.error('Error creating invite:', error);
        throw error;
      }

      const inviteLink = `${window.location.origin}/invite/${data.code}`;
      return {
        ...data,
        link: inviteLink,
      };
    } catch (error) {
      console.error('Error generating invite link:', error);
      throw error;
    }
  };

  const acceptInvite = async (code: string) => {
    if (!user) {
      throw new Error('User must be authenticated to accept invite');
    }

    try {
      const { data, error } = await supabase.rpc('accept_invite', {
        invite_code: code,
      });

      if (error) {
        console.error('Error accepting invite:', error);
        throw error;
      }

      const householdId = data as string;

      // Remember this as the active household and immediately set it
      try {
        localStorage.setItem('active_household_id', householdId);
      } catch {}

      // Immediately fetch and set the accepted household as current
      await fetchHousehold();
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('id', householdId)
        .single();

      if (householdError) {
        console.error('Error fetching accepted household:', householdError);
        throw householdError;
      }

      setHousehold(householdData);
      await fetchCollaborators(householdId);
      return householdId;
    } catch (error) {
      console.error('Error in acceptInvite:', error);
      throw error;
    }
  };

  const removeCollaborator = async (collaboratorId: string) => {
    try {
      const { error } = await supabase
        .from('collaborators')
        .delete()
        .eq('id', collaboratorId);

      if (error) {
        console.error('Error removing collaborator:', error);
        throw error;
      }

      // Refresh collaborators
      await fetchCollaborators();
    } catch (error) {
      console.error('Error in removeCollaborator:', error);
      throw error;
    }
  };

  const updateCollaboratorRole = async (collaboratorId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('collaborators')
        .update({ role: newRole })
        .eq('id', collaboratorId);

      if (error) {
        console.error('Error updating collaborator role:', error);
        throw error;
      }

      // Refresh collaborators to ensure UI updates
      await fetchCollaborators();
      
      // Also update local state immediately to ensure instant UI feedback
      setCollaborators(prev => 
        prev.map(collab => 
          collab.id === collaboratorId 
            ? { ...collab, role: newRole }
            : collab
        )
      );
    } catch (error) {
      console.error('Error in updateCollaboratorRole:', error);
      throw error;
    }
  };

  const refetch = async () => {
    setLoading(true);
    await fetchHousehold();
    await fetchCollaborators();
  };

  return {
    household,
    collaborators,
    loading,
    error,
    createHousehold,
    updateHousehold,
    generateInviteLink,
    acceptInvite,
    removeCollaborator,
    updateCollaboratorRole,
    refetch,
  };
};

// Helper function to generate invite codes
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}