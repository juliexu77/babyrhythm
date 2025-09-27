-- Step 4: Migrate data from baby_profiles to households
INSERT INTO public.households (id, name, baby_name, baby_birthday, created_at, updated_at)
SELECT id, 'My Household', name, birthday, created_at, updated_at
FROM public.baby_profiles;

-- Step 5: Update activities to use household_id
UPDATE public.activities 
SET household_id = baby_profile_id;

-- Step 6: Add household_id to collaborators table
ALTER TABLE public.collaborators ADD COLUMN household_id UUID;

-- Step 7: Update collaborators to use household_id
UPDATE public.collaborators 
SET household_id = baby_profile_id;

-- Step 8: Add household_id to invite_links table
ALTER TABLE public.invite_links ADD COLUMN household_id UUID;

-- Step 9: Update invite_links to use household_id
UPDATE public.invite_links 
SET household_id = baby_profile_id;