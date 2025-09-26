import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useBabyProfile } from "@/hooks/useBabyProfile";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Baby, Loader2 } from "lucide-react";

const InviteAccept = () => {
  const { code } = useParams<{ code: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { acceptInvite } = useBabyProfile();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      // Redirect to auth if not logged in
      navigate(`/auth?redirect=/invite/${code}`);
      return;
    }
  }, [user, code, navigate]);

  const handleAcceptInvite = async () => {
    if (!code) return;
    
    setLoading(true);
    setError(null);
    
    try {
      await acceptInvite(code);
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
            Someone has invited you to help track their baby's activities
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
            onClick={() => navigate("/app")}
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