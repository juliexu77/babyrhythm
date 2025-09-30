-- Drop all existing delete and update policies
DROP POLICY IF EXISTS "Users can delete their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can update their own activities" ON public.activities;
DROP POLICY IF EXISTS "Users can delete activities in their households" ON public.activities;
DROP POLICY IF EXISTS "Users can update activities in their households" ON public.activities;

-- Create new policies that allow parents to manage all household activities
CREATE POLICY "Users can delete activities in their households"
ON public.activities
FOR DELETE
USING (
  created_by = auth.uid() 
  OR 
  (
    household_id IN (
      SELECT household_id 
      FROM public.collaborators 
      WHERE user_id = auth.uid() 
      AND role = 'parent'
    )
  )
);

CREATE POLICY "Users can update activities in their households"
ON public.activities
FOR UPDATE
USING (
  created_by = auth.uid() 
  OR 
  (
    household_id IN (
      SELECT household_id 
      FROM public.collaborators 
      WHERE user_id = auth.uid() 
      AND role = 'parent'
    )
  )
);