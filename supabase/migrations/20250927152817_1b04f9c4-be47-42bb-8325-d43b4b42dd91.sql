-- Ensure unique collaborator per household
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'collaborators_unique_household_user'
  ) THEN
    ALTER TABLE public.collaborators
    ADD CONSTRAINT collaborators_unique_household_user UNIQUE (household_id, user_id);
  END IF;
END $$;