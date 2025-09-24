import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, Share, UserPlus, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export const InviteCollaborator = () => {
  const [inviteLink, setInviteLink] = useState("");
  const [copied, setCopied] = useState(false);
  const [collaboratorName, setCollaboratorName] = useState("");

  const generateInviteLink = () => {
    // Generate a unique invite code
    const inviteCode = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/invite?code=${inviteCode}&name=${encodeURIComponent(collaboratorName || 'Collaborator')}`;
    setInviteLink(link);
    
    toast({
      title: "Invite link generated!",
      description: "Share this link with your partner or nanny.",
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      
      toast({
        title: "Link copied!",
        description: "The invite link has been copied to your clipboard.",
      });
    } catch (err) {
      toast({
        title: "Failed to copy",
        description: "Please copy the link manually.",
        variant: "destructive",
      });
    }
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Baby Tracking App Invitation',
          text: `Join me in tracking our baby's activities!`,
          url: inviteLink,
        });
      } catch (err) {
        // User cancelled or sharing failed
        copyToClipboard();
      }
    } else {
      copyToClipboard();
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Invite Collaborator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="collaborator-name">Collaborator Name (Optional)</Label>
            <Input
              id="collaborator-name"
              value={collaboratorName}
              onChange={(e) => setCollaboratorName(e.target.value)}
              placeholder="e.g., Sarah, John, Nanny Maria"
            />
            <p className="text-xs text-muted-foreground mt-1">
              This helps identify who you're inviting
            </p>
          </div>

          <Button 
            onClick={generateInviteLink}
            className="w-full"
            disabled={!collaboratorName.trim()}
          >
            Generate Invite Link
          </Button>

          {inviteLink && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="invite-link">Invite Link</Label>
                <div className="flex gap-2">
                  <Input
                    id="invite-link"
                    value={inviteLink}
                    readOnly
                    className="text-xs"
                  />
                  <Button
                    onClick={copyToClipboard}
                    size="icon"
                    variant="outline"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <Button
                onClick={shareLink}
                variant="secondary"
                className="w-full"
              >
                <Share className="h-4 w-4 mr-2" />
                Share Link
              </Button>

              <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg">
                <p className="font-medium mb-1">How it works:</p>
                <ul className="space-y-1">
                  <li>• Your collaborator clicks the link</li>
                  <li>• They can view and add activities</li>
                  <li>• All changes sync in real-time</li>
                  <li>• You can revoke access anytime</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Active Collaborators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4 text-muted-foreground">
            <UserPlus className="h-8 w-8 mx-auto mb-2 opacity-60" />
            <p className="text-sm">No collaborators yet</p>
            <p className="text-xs">Invite someone to get started</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};