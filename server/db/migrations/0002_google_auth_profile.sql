ALTER TABLE users ADD COLUMN google_id TEXT;
ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'legacy';
ALTER TABLE users ADD COLUMN profile_complete INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN profile_completed_at INTEGER;

UPDATE users
SET profile_complete = CASE
  WHEN mobile IS NOT NULL AND TRIM(mobile) <> '' AND address IS NOT NULL AND TRIM(address) <> '' THEN 1
  ELSE 0
END;
