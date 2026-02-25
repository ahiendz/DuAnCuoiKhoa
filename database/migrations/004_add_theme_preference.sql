-- Migration 004: Add theme preference to users table
-- For Enterprise Theme System (Light / Dark / System)

ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_preference VARCHAR(20) DEFAULT 'system';

-- Ensure valid values
ALTER TABLE users ADD CONSTRAINT chk_theme_preference 
    CHECK (theme_preference IN ('light', 'dark', 'system'));
