-- Check all tables in the database
SELECT 
  table_name,
  table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Get detailed column information for the preferences table
SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default,
  character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'preferences'
ORDER BY ordinal_position;

-- Get all columns for all tables (broader view)
SELECT 
  table_name,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

-- Check if there are any existing preferences records (to see actual structure)
SELECT *
FROM preferences
LIMIT 1;

