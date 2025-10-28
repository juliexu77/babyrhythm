-- Backfill today's mis-stored activity timestamps
-- These activities were stored with local time as UTC, need to shift by timezone offset

DO $$
DECLARE
  activity_record RECORD;
  offset_hours INTEGER;
  new_logged_at TIMESTAMP WITH TIME ZONE;
  fixed_count INTEGER := 0;
BEGIN
  -- Process activities from today where timezone is America/Los_Angeles
  FOR activity_record IN
    SELECT id, logged_at, timezone, created_at
    FROM activities
    WHERE timezone = 'America/Los_Angeles'
      AND logged_at >= CURRENT_DATE
      AND logged_at < CURRENT_DATE + INTERVAL '1 day'
  LOOP
    -- Check if this looks like local time stored as UTC
    -- If the hour of logged_at is reasonable for local time (0-23), it's likely wrong
    -- Proper UTC for LA should be 7-8 hours ahead (so LA evening = next day UTC morning)
    
    -- Determine if we're in PDT (-7) or PST (-8) on the logged_at date
    -- For October 2025, we're in PDT (UTC-7)
    offset_hours := 7;
    
    -- Add the offset to convert local-stored-as-UTC to proper UTC
    new_logged_at := activity_record.logged_at + (offset_hours || ' hours')::INTERVAL;
    
    -- Update the activity
    UPDATE activities
    SET logged_at = new_logged_at
    WHERE id = activity_record.id;
    
    fixed_count := fixed_count + 1;
    
    RAISE NOTICE 'Fixed activity % - Old: %, New: %',
      activity_record.id,
      activity_record.logged_at,
      new_logged_at;
  END LOOP;
  
  RAISE NOTICE 'Backfill complete. Fixed % activities.', fixed_count;
END $$;