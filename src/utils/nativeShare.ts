import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export const canShare = async (): Promise<boolean> => {
  if (!Capacitor.isNativePlatform()) {
    // Check if Web Share API is available
    return 'share' in navigator;
  }
  return true;
};

export const shareInviteLink = async (inviteLink: string, babyName?: string): Promise<boolean> => {
  const title = 'Baby Tracking Invite';
  const text = babyName 
    ? `Join me in tracking ${babyName}'s activities! Click this link to get started:`
    : 'Join me in tracking my baby\'s activities! Click this link to get started:';
  
  try {
    if (Capacitor.isNativePlatform()) {
      // Use Capacitor Share plugin for native platforms
      await Share.share({
        title,
        text,
        url: inviteLink,
        dialogTitle: 'Share Baby Tracking Invite'
      });
      return true;
    } else if ('share' in navigator) {
      // Use Web Share API for web platforms that support it
      await navigator.share({
        title,
        text,
        url: inviteLink
      });
      return true;
    } else {
      // Fallback to clipboard copy
      await (navigator as any).clipboard.writeText(inviteLink);
      return false; // Indicates fallback was used
    }
  } catch (error) {
    console.error('Error sharing:', error);
    // Fallback to clipboard copy
    try {
      await (navigator as any).clipboard.writeText(inviteLink);
      return false; // Indicates fallback was used
    } catch (clipboardError) {
      console.error('Error copying to clipboard:', clipboardError);
      throw new Error('Failed to share or copy link');
    }
  }
};