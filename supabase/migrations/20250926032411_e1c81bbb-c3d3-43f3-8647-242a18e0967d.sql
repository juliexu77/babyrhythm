-- Fix security warnings by setting search_path for functions
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN upper(substr(md5(random()::text), 1, 8));
END;
$$;

CREATE OR REPLACE FUNCTION public.accept_invite(invite_code TEXT)
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  invite_record public.invite_links%ROWTYPE;
  baby_profile_id UUID;
BEGIN
  -- Get the invite
  SELECT * INTO invite_record 
  FROM public.invite_links 
  WHERE code = invite_code 
    AND expires_at > now() 
    AND used_at IS NULL;
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite code';
  END IF;
  
  baby_profile_id := invite_record.baby_profile_id;
  
  -- Add user as collaborator
  INSERT INTO public.collaborators (baby_profile_id, user_id, role, invited_by)
  VALUES (baby_profile_id, auth.uid(), invite_record.role, invite_record.created_by)
  ON CONFLICT (baby_profile_id, user_id) DO NOTHING;
  
  -- Mark invite as used
  UPDATE public.invite_links 
  SET used_at = now(), used_by = auth.uid()
  WHERE id = invite_record.id;
  
  RETURN baby_profile_id;
END;
$$;