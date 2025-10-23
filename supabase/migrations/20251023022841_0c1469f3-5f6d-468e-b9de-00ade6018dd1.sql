-- Create table for cached daily activity summaries
CREATE TABLE IF NOT EXISTS public.daily_activity_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id uuid NOT NULL,
  summary_date date NOT NULL,
  feed_count integer DEFAULT 0,
  total_feed_volume integer DEFAULT 0,
  feed_unit text DEFAULT 'ml',
  nap_count integer DEFAULT 0,
  nap_details jsonb DEFAULT '[]'::jsonb,
  total_nap_minutes integer DEFAULT 0,
  avg_nap_length integer DEFAULT 0,
  wake_windows jsonb DEFAULT '[]'::jsonb,
  avg_wake_window integer DEFAULT 0,
  diaper_count integer DEFAULT 0,
  measurements jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(household_id, summary_date)
);

-- Enable RLS
ALTER TABLE public.daily_activity_summaries ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view summaries for their households
CREATE POLICY "Users can view summaries for accessible households"
ON public.daily_activity_summaries
FOR SELECT
USING (
  household_id IN (
    SELECT household_id FROM collaborators WHERE user_id = auth.uid()
  )
);

-- Policy: System can insert/update summaries (for background processing)
CREATE POLICY "System can manage summaries"
ON public.daily_activity_summaries
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for faster lookups
CREATE INDEX idx_daily_summaries_household_date 
ON public.daily_activity_summaries(household_id, summary_date DESC);

-- Add trigger to update updated_at
CREATE OR REPLACE FUNCTION update_daily_summary_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_daily_summaries_updated_at
BEFORE UPDATE ON public.daily_activity_summaries
FOR EACH ROW
EXECUTE FUNCTION update_daily_summary_updated_at();