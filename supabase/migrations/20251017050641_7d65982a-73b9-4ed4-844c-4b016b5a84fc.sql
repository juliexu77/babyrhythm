-- Create chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID NOT NULL REFERENCES public.households(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  chat_date DATE NOT NULL -- The "day" this message belongs to (starts at 6am)
);

-- Create index for efficient queries
CREATE INDEX idx_chat_messages_household_date ON public.chat_messages(household_id, chat_date DESC, created_at ASC);

-- Enable RLS
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

-- Users can read messages from their household
CREATE POLICY "Users can view their household chat messages"
  ON public.chat_messages FOR SELECT
  USING (
    household_id IN (
      SELECT household_id FROM public.collaborators WHERE user_id = auth.uid()
    )
  );

-- Users can insert messages to their household
CREATE POLICY "Users can create chat messages in their household"
  ON public.chat_messages FOR INSERT
  WITH CHECK (
    household_id IN (
      SELECT household_id FROM public.collaborators WHERE user_id = auth.uid()
    )
  );

-- Function to calculate the "chat date" (resets at 6am)
CREATE OR REPLACE FUNCTION public.get_chat_date(timestamp_tz TIMESTAMP WITH TIME ZONE, user_timezone TEXT)
RETURNS DATE
LANGUAGE plpgsql
IMMUTABLE
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