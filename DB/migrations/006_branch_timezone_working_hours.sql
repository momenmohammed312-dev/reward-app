ALTER TABLE branches
  ADD COLUMN timezone VARCHAR(50) DEFAULT 'Africa/Cairo',
  ADD COLUMN opening_time TIME,
  ADD COLUMN closing_time TIME;

COMMENT ON COLUMN branches.timezone IS 'IANA timezone e.g. Africa/Cairo, Asia/Riyadh';
COMMENT ON COLUMN branches.opening_time IS 'Branch opening time (local timezone)';
COMMENT ON COLUMN branches.closing_time IS 'Branch closing time (local timezone)';
