-- Fix the infinite recursion in collaborators RLS policies
-- Drop the problematic policies first
DROP POLICY IF EXISTS "Users can view collaborators for accessible households" ON public.collaborators;
DROP POLICY IF EXISTS "Users can manage collaborators for their households" ON public.collaborators;
DROP POLICY IF EXISTS "Users can remove collaborators from their households" ON public.collaborators;

-- Create new policies that don't cause infinite recursion
-- Allow users to view collaborators for households they belong to (using the security definer function)
CREATE POLICY "Users can view collaborators for accessible households" 
ON public.collaborators 
FOR SELECT 
USING (public.user_has_household_access(auth.uid(), household_id));

-- Allow users to add collaborators to households they belong to, OR allow the invite system to add new collaborators
CREATE POLICY "Users can add collaborators to their households" 
ON public.collaborators 
FOR INSERT 
WITH CHECK (
    -- Either the user is already a collaborator in this household (for existing members adding others)
    public.user_has_household_access(auth.uid(), household_id)
    OR 
    -- Or this is a new user being added to a household (for initial household creation or invite acceptance)
    -- In this case, we allow the insert if the user is adding themselves
    (user_id = auth.uid())
);

-- Allow users to remove collaborators from households they belong to
CREATE POLICY "Users can remove collaborators from their households" 
ON public.collaborators 
FOR DELETE 
USING (public.user_has_household_access(auth.uid(), household_id));

-- Add a policy to allow users to update their own collaborator record (if needed)
CREATE POLICY "Users can update their own collaborator record" 
ON public.collaborators 
FOR UPDATE 
USING (user_id = auth.uid());