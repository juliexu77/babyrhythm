/**
 * Shared Household types used across the application
 */

export interface Household {
  id: string;
  name: string;
  baby_name: string | null;
  baby_birthday: string | null;
  baby_photo_url: string | null;
  baby_sex: string | null;
  created_at: string;
  updated_at: string;
}

export interface Collaborator {
  id: string;
  household_id: string;
  user_id: string;
  role: 'parent' | 'caregiver' | 'viewer';
  invited_by: string;
  created_at: string;
}

export interface CollaboratorWithProfile extends Collaborator {
  full_name?: string;
  email?: string;
  last_sign_in_at?: string;
}

export interface InviteLink {
  id: string;
  code: string;
  household_id: string;
  role: string;
  created_by: string;
  expires_at: string;
  used_at?: string | null;
  used_by?: string | null;
  created_at: string;
}
