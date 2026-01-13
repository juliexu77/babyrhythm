-- Add auto_log_bedtime_enabled column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN auto_log_bedtime_enabled boolean DEFAULT false;