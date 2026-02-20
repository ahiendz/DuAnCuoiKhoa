-- Migration: Parent Module Enhancements
-- Description: Add columns to support parent account lifecycle and analytics
-- Version: 001
-- Created: 2026-02-17

-- ====================
-- 1. USERS TABLE
-- ====================

-- Add must_change_password flag for forced password change on first login
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN DEFAULT TRUE NOT NULL;

-- Add is_active flag for account status
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE NOT NULL;

-- Add updated_at timestamp for audit trail
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at 
BEFORE UPDATE ON users 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Set existing users to NOT require password change (backward compatibility)
UPDATE users 
SET must_change_password = FALSE 
WHERE must_change_password IS NULL OR role IN ('admin', 'teacher');

COMMENT ON COLUMN users.must_change_password IS 'Forces user to change password on next login (default TRUE for new accounts)';
COMMENT ON COLUMN users.is_active IS 'Account active status (for soft deletion)';
COMMENT ON COLUMN users.updated_at IS 'Last update timestamp (auto-updated)';

-- ====================
-- 2. PARENTS TABLE
-- ====================

-- Add full_name column
ALTER TABLE parents 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(200);

-- For existing records without full_name, set from users.name
UPDATE parents p
SET full_name = u.name
FROM users u
WHERE p.user_id = u.id AND p.full_name IS NULL;

-- Now make full_name NOT NULL
ALTER TABLE parents 
ALTER COLUMN full_name SET NOT NULL;

COMMENT ON COLUMN parents.full_name IS 'Parent full name (separate from user.name for flexibility)';

-- ====================
-- 3. STUDENT_PARENTS TABLE
-- ====================

-- Add relationship column
ALTER TABLE student_parents 
ADD COLUMN IF NOT EXISTS relationship VARCHAR(50);

-- Add created_at timestamp
ALTER TABLE student_parents 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL;

-- Add unique constraint to prevent duplicate parent-student links
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'student_parents_unique_link'
    ) THEN
        ALTER TABLE student_parents 
        ADD CONSTRAINT student_parents_unique_link 
        UNIQUE (student_id, parent_id);
    END IF;
END $$;

COMMENT ON COLUMN student_parents.relationship IS 'Parent-student relationship (e.g., father, mother, guardian)';
COMMENT ON COLUMN student_parents.created_at IS 'When the parent-student link was created';

-- ====================
-- 4. INDEXES FOR PERFORMANCE
-- ====================

-- Index for parent ownership queries (frequently used in API)
CREATE INDEX IF NOT EXISTS idx_student_parents_parent_id 
ON student_parents(parent_id);

CREATE INDEX IF NOT EXISTS idx_student_parents_student_id 
ON student_parents(student_id);

-- Index for user email lookups (used in parent creation)
CREATE INDEX IF NOT EXISTS idx_users_email_role 
ON users(email, role);

-- Index for parent user_id lookups
CREATE INDEX IF NOT EXISTS idx_parents_user_id 
ON parents(user_id);

-- ====================
-- VERIFICATION QUERIES
-- ====================

-- Uncomment to verify migration success:
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'users' AND column_name IN ('must_change_password', 'is_active', 'updated_at');

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'parents' AND column_name = 'full_name';

-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'student_parents' AND column_name IN ('relationship', 'created_at');

-- SELECT constraint_name FROM information_schema.table_constraints 
-- WHERE table_name = 'student_parents' AND constraint_type = 'UNIQUE';

COMMIT;
