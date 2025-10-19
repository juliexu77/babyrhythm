-- Fix 1: Make baby-photos bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'baby-photos';

-- Fix 2: Allow household collaborators to view chat messages
DROP POLICY IF EXISTS "Users can view their own chat messages" ON public.chat_messages;

CREATE POLICY "Collaborators can view household chat messages"
ON public.chat_messages
FOR SELECT
TO authenticated
USING (
  household_id IN (
    SELECT household_id 
    FROM public.collaborators 
    WHERE user_id = auth.uid()
  )
);

-- Fix 3: Restrict invite link visibility to parents only
DROP POLICY IF EXISTS "Users can view invite links for accessible households" ON public.invite_links;

CREATE POLICY "Parents can view household invite links"
ON public.invite_links
FOR SELECT
TO authenticated
USING (
  household_id IN (
    SELECT household_id 
    FROM public.collaborators 
    WHERE user_id = auth.uid() 
    AND role = 'parent'
  )
);

-- Fix 4: Remove legacy role column from profiles table
ALTER TABLE public.profiles 
DROP COLUMN IF EXISTS role;