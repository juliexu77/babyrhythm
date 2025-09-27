-- Step 2: Add RLS policies for households table
CREATE POLICY "Anyone can create households" ON public.households
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Collaborators can view accessible households" ON public.households
FOR SELECT 
USING (
  id IN (
    SELECT baby_profile_id FROM public.collaborators 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Collaborators can update accessible households" ON public.households
FOR UPDATE 
USING (
  id IN (
    SELECT baby_profile_id FROM public.collaborators 
    WHERE user_id = auth.uid()
  )
);

-- Step 3: Add household_id to activities table
ALTER TABLE public.activities ADD COLUMN household_id UUID;