-- Delete activities in Caleb household before September 28, 2025
DELETE FROM activities
WHERE household_id IN (
  SELECT id FROM households WHERE baby_name = 'Caleb'
)
AND logged_at < '2025-09-28'::date;