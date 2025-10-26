import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let initialLoadComplete = false;
    
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Only set loading false after initial load is done
        if (initialLoadComplete) {
          setLoading(false);
        }
        
        // Clear user data when signed out or user deleted
        if (event === 'SIGNED_OUT' || !session) {
          clearAllUserData();
        }
      }
    );

    // THEN check for existing session - this is the source of truth for initial load
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      initialLoadComplete = true;
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear all app-related localStorage data
    clearAllUserData();
  };

  const ensureUserHasHousehold = async (userId: string) => {
    try {
      // Check if user already has any household (as parent or collaborator)
      const { data: collaboratorData } = await supabase
        .from('collaborators')
        .select('household_id, role')
        .eq('user_id', userId)
        .limit(1);

      if (collaboratorData && collaboratorData.length > 0) {
        // User already has a household
        console.log('User already has a household, role:', collaboratorData[0].role);
        return;
      }

      // Double-check they're not a parent elsewhere using the security definer function
      const { data: isParent } = await supabase.rpc('user_is_parent_in_household', {
        _user_id: userId
      });

      if (isParent) {
        console.log('User is already a parent in another household');
        return;
      }

      // Create default household
      const newHouseholdId = crypto.randomUUID();

      const { error: householdError } = await supabase
        .from('households')
        .insert([{
          id: newHouseholdId,
          name: 'My Household',
        }]);

      if (householdError) {
        console.error('Error creating default household:', householdError);
        return;
      }

      // Add user as parent collaborator
      const { error: collaboratorError } = await supabase
        .from('collaborators')
        .insert([{
          household_id: newHouseholdId,
          user_id: userId,
          role: 'parent',
          invited_by: userId,
        }]);

      if (collaboratorError) {
        console.error('Error adding user as collaborator:', collaboratorError);
      }
    } catch (error) {
      console.error('Error ensuring user has household:', error);
    }
  };

  const clearAllUserData = () => {
    // Clear all user-related localStorage items
    const keysToRemove = [
      'babyProfile',
      'babyProfileCompleted', 
      'babyProfileSkipped',
      'isCollaborator',
      'initialActivities',
      'hasSeenAddActivityTooltip',
      'hasSeenDemo',
      'lastUsedUnit',
      'lastFeedQuantity',
      'language', // Keep this one as it's a user preference
      'baby_tracker_offline_activities',
      'baby_tracker_sync_status',
      'active_household_id' // Clear household ID on logout
    ];
    
    keysToRemove.forEach(key => {
      if (key !== 'language') { // Keep language preference
        localStorage.removeItem(key);
      }
    });
  };

  const value = {
    user,
    session,
    loading,
    signOut,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}