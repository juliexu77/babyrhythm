-- Fix infinite recursion in collaborators table policies
-- Drop the problematic policy that's causing recursion
DROP POLICY IF EXISTS "Users can view collaborators for their baby profiles" ON public.collaborators;

-- Create a simpler, non-recursive policy for viewing collaborators
CREATE POLICY "Users can view collaborators for accessible profiles"
ON public.collaborators
FOR SELECT
USING (
  baby_profile_id IN (
    SELECT id FROM baby_profiles 
    WHERE created_by = auth.uid()
    UNION
    SELECT baby_profile_id FROM collaborators 
    WHERE user_id = auth.uid()
  )
);