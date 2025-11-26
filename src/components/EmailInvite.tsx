import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Mail, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

interface EmailInviteProps {
  inviteLink: string;
  babyName?: string;
}

const emailSchema = z.object({
  email: z.string().trim().email({ message: "Please enter a valid email address" }),
  name: z.string().trim().min(1, { message: "Please enter the recipient's name" }).max(50, { message: "Name must be less than 50 characters" })
});

export const EmailInvite = ({ inviteLink, babyName }: EmailInviteProps) => {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { toast } = useToast();

  const handleSendEmail = async () => {
    try {
      // Validate inputs
      const validation = emailSchema.safeParse({ email, name });
      if (!validation.success) {
        toast({
          title: "Invalid input",
          description: validation.error.errors[0].message,
          variant: "destructive"
        });
        return;
      }

      setIsSending(true);

      const subject = encodeURIComponent('Baby Tracking Invite');
      const body = encodeURIComponent(
        `Hi ${name},\n\n` +
        `You've been invited to help track ${babyName || 'our baby'}'s activities!\n\n` +
        `Click this link to get started:\n${inviteLink}\n\n` +
        `This will allow you to view and add activities like feedings, sleep, and diaper changes.\n\n` +
        `Best regards`
      );

      // Open email client with pre-filled content
      const mailtoLink = `mailto:${email}?subject=${subject}&body=${body}`;
      window.open(mailtoLink, '_blank');

      toast({
        title: "Email client opened",
        description: "Please send the email from your email application.",
      });

      // Reset form and close dialog
      setEmail("");
      setName("");
      setIsOpen(false);

    } catch (error) {
      console.error('Error preparing email:', error);
      toast({
        title: "Error",
        description: "Failed to prepare email invitation.",
        variant: "destructive"
      });
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full h-12 rounded-lg">
          <Mail className="w-4 h-4 mr-2" />
          Send Email Invite
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Email Invitation</DialogTitle>
          <DialogDescription>
            Send a personalized invitation email to collaborate on baby tracking.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient-name">Recipient's Name</Label>
            <Input
              id="recipient-name"
              placeholder="Enter their name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isSending}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="recipient-email">Email Address</Label>
            <Input
              id="recipient-email"
              type="email"
              placeholder="Enter their email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isSending}
            />
          </div>
          <Button 
            onClick={handleSendEmail} 
            disabled={isSending || !email.trim() || !name.trim()}
            className="w-full"
          >
            <Send className="w-4 h-4 mr-2" />
            {isSending ? "Preparing..." : "Open Email Client"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};