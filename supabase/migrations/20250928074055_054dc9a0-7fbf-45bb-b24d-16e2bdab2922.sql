-- Function to return collaborators with profile names for a given household
CREATE OR REPLACE FUNCTION public.get_collaborators_with_profiles(_household_id uuid)
RETURNS TABLE(
  id uuid,
  household_id uuid,
  user_id uuid,
  role text,
  invited_by uuid,
  created_at timestamptz,
  full_name text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    c.id,
    c.household_id,
    c.user_id,
    c.role,
    c.invited_by,
    c.created_at,
    p.full_name
  FROM public.collaborators c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE c.household_id = _household_id;
$$;

-- Allow authenticated users to execute this function
GRANT EXECUTE ON FUNCTION public.get_collaborators_with_profiles(uuid) TO authenticated;