-- Migration 003: Add branding columns to tenants table
BEGIN;

ALTER TABLE tenants
  ADD COLUMN IF NOT EXISTS logo_url TEXT,
  ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#1e40af',
  ADD COLUMN IF NOT EXISTS accent_color VARCHAR(20) DEFAULT '#f59e0b',
  ADD COLUMN IF NOT EXISTS bg_color VARCHAR(20) DEFAULT '#f8fafc',
  ADD COLUMN IF NOT EXISTS surface_color VARCHAR(20) DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS font_display VARCHAR(100) DEFAULT 'Playfair Display',
  ADD COLUMN IF NOT EXISTS font_body VARCHAR(100) DEFAULT 'Cairo',
  ADD COLUMN IF NOT EXISTS tagline TEXT;

COMMIT;
