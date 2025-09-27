import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface Household {
  id: string;
  name: string;
  baby_name: string | null;
  baby_birthday: string | null; // Date as string in YYYY-MM-DD format
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
}

export const useHousehold = () => {
  const { user } = useAuth();
  const [household, setHousehold] = useState<Household | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch user's household and collaborators
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    fetchHousehold();
    fetchCollaborators();

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
      console.log('Fetching household for user:', user.id);
      
      // Get household through collaborator relationship
      const { data: collaboratorData, error: collaboratorError } = await supabase
        .from('collaborators')
        .select('household_id')
        .eq('user_id', user.id)
        .limit(1);

      if (collaboratorError) {
        console.error('Error fetching collaborator data:', collaboratorError);
        setLoading(false);
        return;
      }

      if (!collaboratorData || collaboratorData.length === 0) {
        console.log('No household found for user');
        setHousehold(null);
        setLoading(false);
        return;
      }

      const householdId = collaboratorData[0].household_id;

      // Fetch the actual household data
      const { data: householdData, error: householdError } = await supabase
        .from('households')
        .select('*')
        .eq('id', householdId)
        .single();

      if (householdError) {
        console.error('Error fetching household:', householdError);
        setLoading(false);
        return;
      }

      console.log('Household data:', householdData);
      setHousehold(householdData);
    } catch (error) {
      console.error('Error in fetchHousehold:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCollaborators = async (householdId?: string) => {
    if (!user) return;

    try {
      const targetHouseholdId = householdId || household?.id;
      if (!targetHouseholdId) return;

      const { data, error } = await supabase
        .from('collaborators')
        .select('*')
        .eq('household_id', targetHouseholdId);

      if (error) {
        console.error('Error fetching collaborators:', error);
        return;
      }

      setCollaborators(data || []);
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

      // Add user as collaborator (owner)
      const { error: collaboratorError } = await supabase
        .from('collaborators')
        .insert([{
          household_id: newHouseholdId,
          user_id: user.id,
          role: 'owner',
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

  const updateHousehold = async (updates: Partial<Pick<Household, 'name' | 'baby_name' | 'baby_birthday'>>) => {
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

      setHousehold(data);
      return data;
    } catch (error) {
      console.error('Error in updateHousehold:', error);
      throw error;
    }
  };

  const generateInviteLink = async (role?: 'partner' | 'caregiver' | 'grandparent') => {
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

      // Refresh household data
      await fetchHousehold();
      return data;
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

  const refetch = async () => {
    setLoading(true);
    await fetchHousehold();
    await fetchCollaborators();
  };

  return {
    household,
    collaborators,
    loading,
    createHousehold,
    updateHousehold,
    generateInviteLink,
    acceptInvite,
    removeCollaborator,
    refetch,
  };
};

// Helper function to generate invite codes
function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase();
}