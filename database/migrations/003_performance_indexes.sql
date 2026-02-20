-- Migration: Additional Performance Indexes for Parent Module
-- Description: Adds indexes on frequently-queried columns in parent analytics API
-- Version: 003
-- Created: 2026-02-19

-- ====================
-- 1. GRADES TABLE
-- Primary: student_id is used in EVERY parent analytics query
-- Composite: student_id + semester to speed up semester-filtered analytics
-- ====================

CREATE INDEX IF NOT EXISTS idx_grades_student_id
ON grades(student_id);

CREATE INDEX IF NOT EXISTS idx_grades_student_semester
ON grades(student_id, semester);

-- ====================
-- 2. ATTENDANCE TABLE
-- Primary: student_id for all parent attendance queries
-- Composite: student_id + date for range-based queries
-- ====================

CREATE INDEX IF NOT EXISTS idx_attendance_student_id
ON attendance(student_id);

CREATE INDEX IF NOT EXISTS idx_attendance_student_date
ON attendance(student_id, date);

-- ====================
-- 3. USERS TABLE
-- Plain email index for parent creation lookups (without role filter)
-- Note: idx_users_email_role (email, role) composite already exists from migration 001
-- ====================

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

-- ====================
-- VERIFICATION
-- SELECT indexname, tablename
-- FROM pg_indexes
-- WHERE tablename IN ('grades', 'attendance', 'users') AND indexname LIKE 'idx_%'
-- ORDER BY tablename, indexname;
-- ====================
