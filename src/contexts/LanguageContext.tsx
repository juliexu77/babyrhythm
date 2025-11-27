import { createContext, useContext } from 'react';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Simple stub that returns the key as-is (English only)
const translations: Record<string, string> = {
  // Common translations
  'fullName': 'Full Name',
  'email': 'Email',
  'password': 'Password',
  'enterEmail': 'Enter your email',
  'enterPassword': 'Enter your password',
  'createAccount': 'Create Account',
  'signIn': 'Sign In',
  'settingUp': 'Setting up…',
  'loading': 'Loading…',
  'today': 'Today',
  'yesterday': 'Yesterday',
  'noActivitiesStartAdding': 'No activities yet. Start adding activities to see your timeline!',
  'showMoreDays': 'Show more days',
  'moreDays': 'more days',
  'showLess': 'Show less',
  'noHouseholdFound': 'No Household Found',
  'letsSetupHousehold': "Let's set up your household",
  'goToOnboarding': 'Go to Onboarding',
  'profileSettings': 'Profile Settings',
  'babyDetails': 'Baby Details',
  'caregivers': 'Caregivers',
  'appPreferences': 'App Preferences',
  'account': 'Account',
  'language': 'Language',
  'changePassword': 'Change Password',
  'signOut': 'Sign Out',
  'shareInviteLink': 'Share Invite Link',
  'shareTrackingWith': 'Share tracking with caregivers',
  'manageCaregivers': 'Manage Caregivers',
  'enterBabyName': 'Enter baby name',
  'passwordChangeEmailSent': 'Password reset email sent',
  'checkEmailForInstructions': 'Check your email for instructions',
  'errorSendingEmail': 'Error sending email',
  'failedToSendEmail': 'Failed to send password reset email',
  'inviteShared': 'Invite shared',
  'shareDialogOpened': 'Share dialog opened',
  'inviteLinkCopied': 'Invite link copied',
  'shareWithPartner': 'Share with your partner',
  'failedToCreateInvite': 'Failed to create invite',
  'pleaseRetryInvite': 'Please try again',
  // User role translations
  'parentFamily': 'Parent/Family',
  'caregiverNanny': 'Caregiver/Nanny',
  // Activity type translations
  'feeding': 'Feeding',
  'solids': 'Solids',
  'sleep': 'Sleep',
  'diaper': 'Diaper',
  'bottle': 'Bottle',
  'nursing': 'Nursing',
  'solid': 'Solid',
  'time': 'Time',
  'type': 'Type',
  'startTime': 'Start Time',
  'endTime': 'End Time',
  'includeEndTime': 'Include end time',
  'noteText': 'Note',
  'enterNoteHere': 'Enter your note here...',
  'photoOptional': 'Photo (optional)',
  'selectedPhoto': 'Selected photo',
  'remove': 'Remove',
  'changePhoto': 'Change Photo',
  'tapToAddPhoto': 'Tap to add photo',
  'jpgPngUpTo10mb': 'JPG or PNG, up to 10MB',
  // Activity detail translations
  'typeLabel': 'Type',
  'amount': 'Amount',
  'notesLabel': 'Notes',
  'change': 'Change',
  'leak': 'Leak',
  'diaperingCream': 'Diapering Cream',
  'yes': 'Yes',
  'no': 'No',
  'start': 'Start',
  'end': 'End',
  'activityDetails': 'Activity Details',
  // Activity card translations
  'drank': 'drank',
  'nursed': 'nursed',
  'minTotal': 'min total',
  'ate': 'ate',
  'hadSolids': 'had solids',
  'hadAFeeding': 'had a feeding',
  'dreamFeed': 'dream feed',
  'hadAWetDiaper': 'had a wet diaper',
  'hadAPoopDiaper': 'had a poop diaper',
  'hadAWetAndPoopDiaper': 'had a wet and poop diaper',
  'hadADiaperChange': 'had a diaper change',
  'slept': 'slept',
  'isSleeping': 'is sleeping',
  'startedAt': 'started at',
  'tookANap': 'took a nap',
  'note': 'note',
  'measured': 'measured',
  'tall': 'tall',
  'head': 'head',
  'measurementsTaken': 'measurements taken',
  'photo': 'photo',
  'activity': 'activity',
  'authenticationRequired': 'Authentication Required',
  'pleaseLogInToUpload': 'Please log in to upload photos',
  'addActivity': 'Add Activity',
  'editActivity': 'Edit Activity',
  'voiceInput': 'Voice Input',
  'additionalNotesFeeding': 'Additional notes about feeding...',
  'additionalNotesDiaper': 'Additional notes about diaper...',
  'notes': 'Notes',
  'tapToEnterAmount': 'Tap to enter amount',
  'leftSide': 'Left Side',
  'rightSide': 'Right Side',
  'wet': 'Wet',
  'poopy': 'Poopy',
  'both': 'Both',
};

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const t = (key: string): string => {
    return translations[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language: 'en', setLanguage: () => {}, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
