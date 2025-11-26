import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useHousehold } from "@/hooks/useHousehold";
import { UserPlus, Trash2, Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/contexts/LanguageContext";
import { logError } from "@/utils/logger";
import { formatDistanceToNow } from "date-fns";

interface Collaborator {
  id: string;
  household_id: string;
  user_id: string;
  role: string;
  invited_by: string;
  created_at: string;
  full_name?: string | null;
  email?: string | null;
  last_sign_in_at?: string | null;
  profiles?: {
    full_name: string | null;
    user_id: string;
  } | null;
}

interface CaregiverManagementProps {
  onClose: () => void;
}

export function CaregiverManagement({ onClose }: CaregiverManagementProps) {
  const { household, collaborators, removeCollaborator, updateCollaboratorRole, generateInviteLink } = useHousehold();
  const { t } = useLanguage();
  const [isActive, setIsActive] = useState(true);
  const [emailInvite, setEmailInvite] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [selectedCollaborator, setSelectedCollaborator] = useState<Collaborator | null>(null);
  const { toast } = useToast();

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'parent':
        return 'bg-primary text-primary-foreground';
      case 'partner':
        return 'bg-blue-500 text-white';
      case 'caregiver':
        return 'bg-green-500 text-white';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

const handleAddCaregiver = async () => {
    try {
      const inviteData = await generateInviteLink();
      if (inviteData?.link) {
        // Try modern Clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(inviteData.link);
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement("textarea");
          textArea.value = inviteData.link;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        toast({
          title: "Invite link copied!",
          description: "Share this link with your caregiver."
        });
      }
    } catch (error) {
      logError('Generate invite', error);
      toast({
        title: "Error copying link",
        description: "Please try again.",
        variant: "destructive"
      });
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
        
        // Try modern Clipboard API first
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(message);
        } else {
          // Fallback for older browsers or non-secure contexts
          const textArea = document.createElement("textarea");
          textArea.value = message;
          textArea.style.position = "fixed";
          textArea.style.left = "-999999px";
          document.body.appendChild(textArea);
          textArea.select();
          document.execCommand('copy');
          document.body.removeChild(textArea);
        }
        
        toast({
          title: "Invite message copied!",
          description: `Send this message to ${emailInvite} to invite them.`
        });
        setEmailInvite("");
      }
    } catch (error) {
      logError('Send invite', error);
      toast({
        title: "Error sending invite",
        description: "Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleRoleClick = async (collaboratorId: string, currentRole: string) => {
    const roles = ['parent', 'caregiver'];
    const currentIndex = roles.indexOf(currentRole);
    const nextRole = roles[(currentIndex + 1) % roles.length];
    
    try {
      await updateCollaboratorRole(collaboratorId, nextRole);
      toast({
        title: "Role updated",
        description: `Role changed to ${nextRole}`
      });
    } catch (error) {
      logError('Update role', error);
      toast({
        title: "Error updating role",
        description: "Please try again.",
        variant: "destructive"
      });
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
          <h1 className="text-xl font-serif font-medium">{household?.baby_name || "Baby"}</h1>
          <Button variant="ghost" className="text-muted-foreground">
            Cancel
          </Button>
        </div>

        {/* Parents / Caregivers Section */}
        <div className="px-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-serif font-medium">{t('parentsCaregiversTitle')}</h3>
          </div>
          
          <p className="text-sm text-muted-foreground mb-4">
            {t('eachCaregiverDescription')} {household?.baby_name || "Baby"}
          </p>

          {/* Collaborators List */}
          <div className="space-y-3">
            {collaborators.length === 0 ? (
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <p className="text-sm text-muted-foreground">{t('noCollaboratorsFound')}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {t('inviteSomeoneBelow')}
                </p>
              </div>
            ) : (
              collaborators.map((collaborator) => {
                const userName = collaborator.full_name || collaborator.profiles?.full_name || `User ${collaborator.user_id.slice(0, 8)}`;
                return (
                  <div 
                    key={collaborator.id} 
                    className="flex items-center justify-between p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted/70 transition-colors"
                    onClick={() => setSelectedCollaborator(collaborator)}
                  >
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-10 h-10">
                        <AvatarFallback className="bg-muted text-sm">
                          {getInitials(userName)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {userName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {collaborator.email || collaborator.role}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRoleClick(collaborator.id, collaborator.role);
                        }}
                        className="transition-colors hover:opacity-80"
                      >
                        <Badge variant="secondary" className={`${getRoleColor(collaborator.role)} cursor-pointer`}>
                          {collaborator.role}
                        </Badge>
                      </button>
                      {collaborator.role !== 'parent' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeCollaborator(collaborator.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Email Invite Section */}
          <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <Label className="font-medium">{t('inviteByEmail')}</Label>
            </div>
            <div className="flex gap-2">
              <Input
                type="email"
                placeholder={t('enterEmailAddress')}
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
              {t('wellCopyInviteMessage')}
            </p>
          </div>

          {/* Add Caregiver Button */}
          <Button 
            onClick={handleAddCaregiver}
            variant="outline" 
            className="w-full h-12 border-dashed border-primary text-primary hover:bg-primary/5"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            {t('copyInviteLink')}
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

      {/* Collaborator Details Dialog */}
      <Dialog open={!!selectedCollaborator} onOpenChange={(open) => !open && setSelectedCollaborator(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Collaborator Details</DialogTitle>
          </DialogHeader>
          {selectedCollaborator && (
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <Avatar className="w-16 h-16">
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedCollaborator.full_name || selectedCollaborator.profiles?.full_name || "User")}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-serif font-semibold text-lg">
                    {selectedCollaborator.full_name || selectedCollaborator.profiles?.full_name || "User"}
                  </h3>
                  <Badge className={getRoleColor(selectedCollaborator.role)}>
                    {selectedCollaborator.role}
                  </Badge>
                </div>
              </div>
              
              <div className="space-y-3 pt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="text-sm font-medium">{selectedCollaborator.email || "Not available"}</p>
                </div>
                
                {selectedCollaborator.last_sign_in_at && (
                  <div>
                    <p className="text-sm text-muted-foreground">Last signed in</p>
                    <p className="text-sm font-medium">
                      {formatDistanceToNow(new Date(selectedCollaborator.last_sign_in_at), { addSuffix: true })}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-muted-foreground">Joined</p>
                  <p className="text-sm font-medium">
                    {formatDistanceToNow(new Date(selectedCollaborator.created_at), { addSuffix: true })}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}