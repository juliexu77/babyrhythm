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
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
        
        // Clear user data when signed out or user deleted
        if (event === 'SIGNED_OUT' || !session) {
          clearAllUserData();
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    // Clear all app-related localStorage data
    clearAllUserData();
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
      'baby_tracker_sync_status'
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