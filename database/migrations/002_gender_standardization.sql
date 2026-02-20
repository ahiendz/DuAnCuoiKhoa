-- Migration: Convert existing gender values from Vietnamese to English
-- Run this ONLY if you have existing data with Vietnamese gender values

BEGIN;

-- Update students table
UPDATE students 
SET gender = CASE 
    WHEN gender = 'Nam' THEN 'male'
    WHEN gender = 'Nữ' THEN 'female'
    ELSE gender  -- Keep as-is if already in English or NULL
END
WHERE gender IN ('Nam', 'Nữ');

-- Update users table (if gender column exists for teachers/parents)
UPDATE users 
SET gender = CASE 
    WHEN gender = 'Nam' THEN 'male'
    WHEN gender = 'Nữ' THEN 'female'
    ELSE gender
END
WHERE gender IN ('Nam', 'Nữ');

-- Verify changes
SELECT 'Students gender values:' as info;
SELECT DISTINCT gender, COUNT(*) as count FROM students GROUP BY gender;

SELECT 'Users gender values:' as info;
SELECT DISTINCT gender, COUNT(*) as count FROM users WHERE gender IS NOT NULL GROUP BY gender;

COMMIT;

-- Note: This migration is OPTIONAL and only needed if you have existing Vietnamese gender data
-- New data will automatically use English values (male/female) from the updated UI forms
