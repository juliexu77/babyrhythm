-- Create table for cohort statistics
CREATE TABLE public.cohort_statistics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cohort_label TEXT NOT NULL, -- e.g., "April 2025 Babies"
  cohort_month DATE NOT NULL, -- First day of birth month
  week_start_date DATE NOT NULL, -- Monday of the week
  week_end_date DATE NOT NULL, -- Sunday of the week
  
  -- Core metrics
  night_sleep_hours NUMERIC(4,1),
  night_sleep_change NUMERIC(4,1),
  naps_per_day NUMERIC(3,1),
  naps_per_day_change NUMERIC(3,1),
  feed_count_per_day NUMERIC(3,1),
  feed_count_change NUMERIC(3,1),
  avg_feed_volume NUMERIC(5,1),
  avg_feed_volume_change NUMERIC(5,1),
  solids_started_pct NUMERIC(4,1),
  
  -- Metadata
  active_baby_count INTEGER NOT NULL DEFAULT 0,
  metric_coverage JSONB DEFAULT '{}', -- {"night_sleep": 0.75, "naps": 0.82, ...}
  
  -- Generated insight
  insight_text TEXT,
  fallback_tier TEXT, -- null | "seed" | "blended" | "adjacent" | "minimal"
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(cohort_month, week_start_date)
);

-- Enable RLS
ALTER TABLE public.cohort_statistics ENABLE ROW LEVEL SECURITY;

-- Anyone can read cohort stats (they're aggregated and anonymous)
CREATE POLICY "Anyone can view cohort statistics"
ON public.cohort_statistics
FOR SELECT
USING (true);

-- Only service role can insert/update (via edge function)
CREATE POLICY "Service role can manage cohort statistics"
ON public.cohort_statistics
FOR ALL
USING (true)
WITH CHECK (true);

-- Create index for fast lookups
CREATE INDEX idx_cohort_stats_month_week ON public.cohort_statistics(cohort_month, week_start_date DESC);

-- Add updated_at trigger
CREATE TRIGGER update_cohort_statistics_updated_at
BEFORE UPDATE ON public.cohort_statistics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();