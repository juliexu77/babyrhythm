-- Fix security issues

-- 1. Fix function search_path mutable warning
CREATE OR REPLACE FUNCTION public.get_chat_date(timestamp_tz TIMESTAMP WITH TIME ZONE, user_timezone TEXT)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  local_time TIMESTAMP;
  chat_date DATE;
BEGIN
  -- Convert to user's timezone
  local_time := timestamp_tz AT TIME ZONE user_timezone;
  
  -- If before 6am, use previous date
  IF EXTRACT(HOUR FROM local_time) < 6 THEN
    chat_date := (local_time - INTERVAL '1 day')::DATE;
  ELSE
    chat_date := local_time::DATE;
  END IF;
  
  RETURN chat_date;
END;
$$;

-- 2. Fix invite_links public exposure - remove the overly permissive policy
DROP POLICY IF EXISTS "Anyone can view valid invite links for joining" ON public.invite_links;

-- Users can only view a specific invite link when they provide the exact code
-- This will be handled by the accept_invite function which has SECURITY DEFINER
-- No need for a public SELECT policy since the function will handle the lookup