-- Drop all triggers and the function with CASCADE
DROP FUNCTION IF EXISTS public.prevent_multiple_parent_households() CASCADE;

-- Recreate the function to allow parent role changes within same household
CREATE OR REPLACE FUNCTION public.prevent_multiple_parent_households()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only check if the role being set is 'parent'
  IF NEW.role = 'parent' THEN
    -- Check if user is already a parent in a DIFFERENT household
    IF EXISTS (
      SELECT 1 
      FROM collaborators 
      WHERE user_id = NEW.user_id 
        AND role = 'parent' 
        AND household_id != NEW.household_id
        AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
    ) THEN
      RAISE EXCEPTION 'User can only be a parent in one household. They are already a parent in another household.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recreate the triggers
CREATE TRIGGER prevent_multiple_parent_households_trigger
BEFORE INSERT OR UPDATE ON public.collaborators
FOR EACH ROW
EXECUTE FUNCTION public.prevent_multiple_parent_households();