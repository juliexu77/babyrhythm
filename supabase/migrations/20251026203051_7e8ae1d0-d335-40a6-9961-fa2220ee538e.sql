-- Restore the deleted dream feeds and fix their dates
-- These were from prior days but got incorrectly assigned to Oct 24

-- Restore the entries with corrected dates based on their creation timestamps
INSERT INTO activities (id, household_id, type, logged_at, timezone, details, created_at, created_by)
SELECT 
  '71044f32-0b78-4f97-88a3-e6e269f824b4',
  household_id,
  'feed',
  '2025-10-25 22:00:00'::timestamp,  -- Should be Oct 25 based on creation time
  'America/Los_Angeles',
  '{"displayTime": "10:00 PM", "isDreamFeed": true, "feedType": "bottle", "quantity": "200", "unit": "ml"}',
  '2025-10-25 06:02:56.443261+00',
  created_by
FROM activities 
WHERE id = '60bac60f-bf31-4691-aff1-1ab035785dde'
LIMIT 1;

INSERT INTO activities (id, household_id, type, logged_at, timezone, details, created_at, created_by)
SELECT 
  'fd27eb9c-f536-4a73-b082-85f90c492fa3',
  household_id,
  'feed',
  '2025-10-24 22:00:00'::timestamp,  -- Actually was Oct 24 (different time slot)
  'America/Los_Angeles',
  '{"displayTime": "10:00 PM", "isDreamFeed": true, "feedType": "bottle", "quantity": "200", "unit": "ml"}',
  '2025-10-24 15:19:38.008691+00',
  created_by
FROM activities 
WHERE id = '60bac60f-bf31-4691-aff1-1ab035785dde'
LIMIT 1;