import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useHousehold } from "@/hooks/useHousehold";

interface Collaborator {
  id: string;
  household_id: string;
  user_id: string;
  role: string;
  invited_by: string;
  created_at: string;
}
import { UserPlus, Trash2, Mail, Volume2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface CaregiverManagementProps {
  onClose: () => void;
}

export function CaregiverManagement({ onClose }: CaregiverManagementProps) {
  const { household, collaborators, removeCollaborator, generateInviteLink } = useHousehold();
  const [isActive, setIsActive] = useState(true);
  const [emailInvite, setEmailInvite] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const { toast } = useToast();

  const getInitials = (email: string) => {
    return email
      .split('@')[0]
      .split('.')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-primary text-primary-foreground';
      case 'partner':
        return 'bg-blue-500 text-white';
      case 'caregiver':
        return 'bg-green-500 text-white';
      case 'grandparent':
        return 'bg-purple-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

const handleAddCaregiver = async () => {
    try {
      const inviteData = await generateInviteLink();
      if (inviteData?.link) {
        await (navigator as any).clipboard.writeText(inviteData.link);
        toast({
          title: "Invite link copied!",
          description: "Share this link with your caregiver."
        });
      }
    } catch (error) {
      console.error('Error generating invite:', error);
    }
  };

  const handleEmailInvite = async () => {
    if (!emailInvite.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address.",
        variant: "destructive"
      });
      return;
    }

    if (!emailInvite.includes('@')) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address.",
        variant: "destructive"
      });
      return;
    }

    setIsInviting(true);
    try {
      const inviteData = await generateInviteLink();
      if (inviteData?.link) {
        // In a real app, you'd send this via email service
        // For now, we'll copy and show instructions
        const message = `Hi! You've been invited to help track ${household?.baby_name || "a baby"}'s activities. Click this link to join: ${inviteData.link}`;
        await (navigator as any).clipboard.writeText(message);
        
        toast({
          title: "Invite message copied!",
          description: `Send this message to ${emailInvite} to invite them.`
        });
        setEmailInvite("");
      }
    } catch (error) {
      console.error('Error sending invite:', error);
      toast({
        title: "Error sending invite",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsInviting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" onClick={onClose} className="text-muted-foreground">
            ← Back
          </Button>
          <h1 className="text-xl font-medium">{household?.baby_name || "Baby"}</h1>
          <Button variant="ghost" className="text-muted-foreground">
            Cancel
          </Button>
        </div>

        {/* Baby Info Section */}
        <div className="px-4 pb-6">
          <div className="flex flex-col items-center space-y-4">
            <Avatar className="w-20 h-20">
              <AvatarImage src={undefined} />
              <AvatarFallback className="bg-muted text-2xl">
                👶
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <h2 className="text-lg font-medium">{household?.baby_name || "Baby"}</h2>
            </div>
          </div>
        </div>

        {/* Parents / Caregivers Section */}
        <div className="px-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Parents / Caregivers</h3>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            Each caregiver will be able to view and save entries for {household?.baby_name || "Baby"}
          </p>

          {/* Collaborators List */}
          <div className="space-y-3">
            {collaborators.map((collaborator) => (
              <div key={collaborator.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="relative">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-muted text-sm">
                        {getInitials(collaborator.user_id)}
                      </AvatarFallback>
                    </Avatar>
                    <Volume2 className="w-4 h-4 absolute -bottom-1 -right-1 bg-background rounded-full p-0.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      User {collaborator.user_id.slice(0, 8)}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {collaborator.role}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="secondary" className={getRoleColor(collaborator.role)}>
                    {collaborator.role}
                  </Badge>
                  {collaborator.role !== 'owner' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCollaborator(collaborator.id)}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Email Invite Section */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <Label className="font-medium">Invite by Email</Label>
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder="Enter email address"
                value={emailInvite}
                onChange={(e) => setEmailInvite(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={handleEmailInvite}
                disabled={isInviting}
                size="sm"
              >
                {isInviting ? <Send className="w-4 h-4 animate-pulse" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              We'll copy an invite message for you to send
            </p>
          </div>

          {/* Add Caregiver Button */}
          <Button 
            onClick={handleAddCaregiver}
            variant="outline" 
            className="w-full h-12 border-dashed border-primary text-primary hover:bg-primary/5"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Copy Invite Link
          </Button>

          {/* Profile Status Section */}
          <div className="space-y-4 pt-6 border-t">
            <h4 className="font-medium">Profile Status</h4>
            <p className="text-sm text-muted-foreground">
              Inactive profiles are hidden on your homepage
            </p>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="active-profile" className="text-base">
                Active Profile
              </Label>
              <Switch
                id="active-profile"
                checked={isActive}
                onCheckedChange={setIsActive}
              />
            </div>
          </div>

          {/* Remove Button */}
          <div className="pt-8 pb-8">
            <Button 
              variant="ghost" 
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/5"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Remove
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}