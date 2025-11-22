-- Drop the old check constraint
ALTER TABLE activities DROP CONSTRAINT IF EXISTS activities_type_check;

-- Add new check constraint that includes both 'measure' and 'solids'
ALTER TABLE activities ADD CONSTRAINT activities_type_check 
CHECK (type IN ('feed', 'diaper', 'nap', 'note', 'measure', 'solids', 'photo'));

-- Migrate Caleb's feeding activities with feedType='solid' to solids type
UPDATE activities 
SET type = 'solids'
WHERE household_id = '5516efc8-90ca-4aa6-ba86-16263fcd9cb5' 
AND type = 'feed' 
AND details->>'feedType' = 'solid';