-- Add illness tracking fields to daily_activity_summaries
ALTER TABLE daily_activity_summaries 
ADD COLUMN is_sick boolean DEFAULT false,
ADD COLUMN symptoms jsonb DEFAULT '[]'::jsonb,
ADD COLUMN illness_severity text CHECK (illness_severity IN ('mild', 'moderate', 'severe')),
ADD COLUMN illness_notes text;

COMMENT ON COLUMN daily_activity_summaries.is_sick IS 'Whether baby was sick on this day';
COMMENT ON COLUMN daily_activity_summaries.symptoms IS 'Array of symptoms: fever, cold, runny_nose, cough, etc';
COMMENT ON COLUMN daily_activity_summaries.illness_severity IS 'Severity of illness: mild, moderate, severe';
COMMENT ON COLUMN daily_activity_summaries.illness_notes IS 'Additional notes about illness';