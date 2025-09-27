import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserPlus, Share } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useHousehold } from "@/hooks/useHousehold";
import { useNavigate } from "react-router-dom";

export const SimpleInviteCollaborator = () => {
  const { user } = useAuth();
  const { generateInviteLink } = useHousehold();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleInviteClick = async () => {
    if (!user) {
      // Redirect to auth if not logged in
      navigate("/auth");
      return;
    }

    if (loading) return; // Prevent multiple clicks

    setLoading(true);
    try {
      // Use the proper generateInviteLink function from useBabyProfile
      const inviteData = await generateInviteLink();
      
      await (navigator as any).clipboard.writeText(inviteData.link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Invite link copied!",
        description: "Share this link with your partner or caregiver.",
      });
    } catch (err) {
      toast({
        title: "Failed to create invite",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserPlus className="h-5 w-5" />
          Share Tracking
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Share tracking with someone so they can view and add activities too.
        </p>

        <Button 
          onClick={handleInviteClick}
          disabled={loading}
          className="w-full"
        >
          <Share className="h-4 w-4 mr-2" />
          {loading ? "Generating..." : user ? (copied ? "Link Copied!" : "Copy Invite Link") : "Sign In to Share"}
        </Button>
      </CardContent>
    </Card>
  );
};