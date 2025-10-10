-- Delete Franklin's two empty duplicate households
-- This will cascade delete the collaborator records automatically
DELETE FROM public.households 
WHERE id IN ('9bec1b3f-94f1-4a70-904f-7877d98d0f35', '9cb3a5ca-622e-4589-9a46-7aa8e1ef60b7')
  AND baby_name IS NULL
  AND id NOT IN (SELECT DISTINCT household_id FROM activities);