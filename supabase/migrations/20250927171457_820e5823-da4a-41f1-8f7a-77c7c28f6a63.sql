-- Update collaborators table to use simplified roles
ALTER TABLE public.collaborators DROP CONSTRAINT IF EXISTS collaborators_role_check;
ALTER TABLE public.collaborators ADD CONSTRAINT collaborators_role_check CHECK (role IN ('parent', 'caregiver'));

-- Update invite_links table to use simplified roles  
ALTER TABLE public.invite_links DROP CONSTRAINT IF EXISTS invite_links_role_check;
ALTER TABLE public.invite_links ADD CONSTRAINT invite_links_role_check CHECK (role IN ('parent', 'caregiver'));

-- Update profiles table to use simplified roles
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('parent', 'caregiver'));

-- Update existing data: map complex roles to simple ones
UPDATE public.collaborators SET role = 'parent' WHERE role IN ('owner', 'partner', 'grandparent');
UPDATE public.invite_links SET role = 'caregiver' WHERE role IN ('owner', 'partner', 'grandparent');
UPDATE public.profiles SET role = 'parent' WHERE role IN ('owner', 'partner', 'grandparent');