-- Allow users to be parents in multiple households
DROP TRIGGER IF EXISTS prevent_multiple_parent_households_trigger ON public.collaborators;
DROP FUNCTION IF EXISTS public.prevent_multiple_parent_households() CASCADE;
DROP FUNCTION IF EXISTS public.transfer_parent_role(uuid, uuid);