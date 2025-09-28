import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useHousehold } from "@/hooks/useHousehold";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Baby, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface InviteDetails {
  household_id: string;
  role: string;
  created_by: string;
  inviter_name?: string;
  baby_name?: string;
}

const InviteAccept = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { acceptInvite } = useHousehold();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null);

  useEffect(() => {
    if (!user) {
      // Redirect to auth if not logged in
      navigate(`/auth?redirect=/invite/${code}`);
      return;
    }
    
    // Fetch invite details
    fetchInviteDetails();
  }, [user, code, navigate]);

  const fetchInviteDetails = async () => {
    if (!code) return;
    
    try {
      // Get invite details with inviter information
      const { data, error } = await supabase
        .from('invite_links')
        .select(`
          household_id,
          role,
          created_by,
          households!inner(baby_name),
          profiles!inner(full_name)
        `)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .is('used_at', null)
        .maybeSingle();

      if (error) {
        console.error('Error fetching invite details:', error);
        return;
      }

      if (data) {
        setInviteDetails({
          household_id: data.household_id,
          role: data.role,
          created_by: data.created_by,
          inviter_name: (data.profiles as any)?.full_name || 'Someone',
          baby_name: (data.households as any)?.baby_name || 'a baby'
        });
      }
    } catch (err) {
      console.error('Error fetching invite details:', err);
    }
  };

  const handleAcceptInvite = async () => {
    if (!code) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await acceptInvite(code);
      // Navigate to main app after successful invite acceptance
      navigate("/app");
    } catch (err: any) {
      setError(err.message || "Failed to accept invite");
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <Baby className="w-8 h-8 text-white" />
            </div>
            <CardTitle>Join Baby Tracking</CardTitle>
            <CardDescription>
              Sign in to accept this invitation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-center text-muted-foreground">
              Redirecting to sign in...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <Baby className="w-8 h-8 text-white" />
          </div>
          <CardTitle>You've been invited!</CardTitle>
          <CardDescription>
            {inviteDetails?.inviter_name || 'Someone'} has invited you to help track {inviteDetails?.baby_name || 'their baby'}'s activities
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          
          <Button 
            onClick={handleAcceptInvite} 
            disabled={loading}
            className="w-full"
          >
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Accept Invitation
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={() => navigate("/")}
            className="w-full"
          >
            Skip for now
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default InviteAccept;