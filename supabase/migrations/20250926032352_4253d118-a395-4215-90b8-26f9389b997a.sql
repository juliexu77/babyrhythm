-- Create baby profiles table for shared tracking
CREATE TABLE public.baby_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  birthday DATE,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.baby_profiles ENABLE ROW LEVEL SECURITY;

-- Create activities table for shared logging
CREATE TABLE public.activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_profile_id UUID REFERENCES public.baby_profiles(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('feed', 'diaper', 'nap', 'note')),
  logged_at TIMESTAMP WITH TIME ZONE NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;

-- Create collaborators table for sharing access
CREATE TABLE public.collaborators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_profile_id UUID REFERENCES public.baby_profiles(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL DEFAULT 'caregiver' CHECK (role IN ('owner', 'partner', 'caregiver', 'grandparent')),
  invited_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(baby_profile_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;

-- Create invite links table
CREATE TABLE public.invite_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  baby_profile_id UUID REFERENCES public.baby_profiles(id) ON DELETE CASCADE NOT NULL,
  code TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'caregiver' CHECK (role IN ('partner', 'caregiver', 'grandparent')),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security  
ALTER TABLE public.invite_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies for baby_profiles
CREATE POLICY "Users can view baby profiles they have access to" 
ON public.baby_profiles FOR SELECT 
USING (
  created_by = auth.uid() OR 
  id IN (
    SELECT baby_profile_id FROM public.collaborators 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can create baby profiles" 
ON public.baby_profiles FOR INSERT 
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Profile owners can update their profiles" 
ON public.baby_profiles FOR UPDATE 
USING (created_by = auth.uid());

-- RLS Policies for activities
CREATE POLICY "Users can view activities for accessible baby profiles" 
ON public.activities FOR SELECT 
USING (
  baby_profile_id IN (
    SELECT id FROM public.baby_profiles 
    WHERE created_by = auth.uid() OR 
    id IN (
      SELECT baby_profile_id FROM public.collaborators 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can create activities for accessible baby profiles" 
ON public.activities FOR INSERT 
WITH CHECK (
  auth.uid() = created_by AND
  baby_profile_id IN (
    SELECT id FROM public.baby_profiles 
    WHERE created_by = auth.uid() OR 
    id IN (
      SELECT baby_profile_id FROM public.collaborators 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Users can update their own activities" 
ON public.activities FOR UPDATE 
USING (created_by = auth.uid());

CREATE POLICY "Users can delete their own activities" 
ON public.activities FOR DELETE 
USING (created_by = auth.uid());

-- RLS Policies for collaborators  
CREATE POLICY "Users can view collaborators for their baby profiles" 
ON public.collaborators FOR SELECT 
USING (
  baby_profile_id IN (
    SELECT id FROM public.baby_profiles 
    WHERE created_by = auth.uid() OR 
    id IN (
      SELECT baby_profile_id FROM public.collaborators 
      WHERE user_id = auth.uid()
    )
  )
);

CREATE POLICY "Profile owners can manage collaborators" 
ON public.collaborators FOR INSERT 
WITH CHECK (
  baby_profile_id IN (
    SELECT id FROM public.baby_profiles 
    WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Profile owners can remove collaborators" 
ON public.collaborators FOR DELETE 
USING (
  baby_profile_id IN (
    SELECT id FROM public.baby_profiles 
    WHERE created_by = auth.uid()
  )
);

-- RLS Policies for invite_links
CREATE POLICY "Users can view invite links for their baby profiles" 
ON public.invite_links FOR SELECT 
USING (
  baby_profile_id IN (
    SELECT id FROM public.baby_profiles 
    WHERE created_by = auth.uid()
  )
);

CREATE POLICY "Profile owners can create invite links" 
ON public.invite_links FOR INSERT 
WITH CHECK (
  baby_profile_id IN (
    SELECT id FROM public.baby_profiles 
    WHERE created_by = auth.uid()
  ) AND
  auth.uid() = created_by
);

CREATE POLICY "Anyone can view valid invite links for joining" 
ON public.invite_links FOR SELECT 
USING (expires_at > now() AND used_at IS NULL);

CREATE POLICY "Profile owners can update invite links" 
ON public.invite_links FOR UPDATE 
USING (
  baby_profile_id IN (
    SELECT id FROM public.baby_profiles 
    WHERE created_by = auth.uid()
  )
);

-- Add timestamp triggers
CREATE TRIGGER update_baby_profiles_updated_at
  BEFORE UPDATE ON public.baby_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activities_updated_at
  BEFORE UPDATE ON public.activities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate invite codes
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
BEGIN
  RETURN upper(substr(md5(random()::text), 1, 8));
END;
$$ LANGUAGE plpgsql;

-- Function to accept invite
CREATE OR REPLACE FUNCTION public.accept_invite(invite_code TEXT)
RETURNS UUID AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable realtime for all tables
ALTER TABLE public.baby_profiles REPLICA IDENTITY FULL;
ALTER TABLE public.activities REPLICA IDENTITY FULL;
ALTER TABLE public.collaborators REPLICA IDENTITY FULL;
ALTER TABLE public.invite_links REPLICA IDENTITY FULL;

-- Add tables to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.baby_profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activities;
ALTER PUBLICATION supabase_realtime ADD TABLE public.collaborators;
ALTER PUBLICATION supabase_realtime ADD TABLE public.invite_links;