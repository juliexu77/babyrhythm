-- Clean slate: Remove orphaned profiles so users can start fresh
DELETE FROM public.profiles WHERE user_id NOT IN (
  SELECT user_id FROM public.collaborators
);