-- Add user_id column to chat_messages table (nullable initially)
ALTER TABLE public.chat_messages 
ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Delete existing chat messages since they don't have a user_id and were household-shared
-- Users will start fresh with their own personal chat history
DELETE FROM public.chat_messages WHERE user_id IS NULL;

-- Now make user_id NOT NULL for future inserts
ALTER TABLE public.chat_messages 
ALTER COLUMN user_id SET NOT NULL;

-- Drop old household-based RLS policies
DROP POLICY IF EXISTS "Users can create chat messages in their household" ON public.chat_messages;
DROP POLICY IF EXISTS "Users can view their household chat messages" ON public.chat_messages;

-- Create new user-specific RLS policies
CREATE POLICY "Users can create their own chat messages"
ON public.chat_messages
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  household_id IN (
    SELECT household_id FROM collaborators 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their own chat messages"
ON public.chat_messages
FOR SELECT
USING (auth.uid() = user_id);

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_id ON public.chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_date ON public.chat_messages(user_id, chat_date);