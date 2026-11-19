-- Run once on an existing NutriTrack database before starting the updated API.
ALTER TABLE users ADD COLUMN IF NOT EXISTS username TEXT;
WITH names AS (
  SELECT id,
         lower(regexp_replace(trim(display_name), '[^a-zA-Z0-9._-]+', '_', 'g')) AS base_name,
         row_number() OVER (
           PARTITION BY lower(regexp_replace(trim(display_name), '[^a-zA-Z0-9._-]+', '_', 'g'))
           ORDER BY created_at, id
         ) AS rn
  FROM users
)
UPDATE users u
SET username = CASE WHEN n.rn = 1 THEN n.base_name
                    ELSE n.base_name || '_' || left(replace(u.id::text,'-',''),6) END
FROM names n
WHERE u.id = n.id AND (u.username IS NULL OR btrim(u.username) = '');
ALTER TABLE users ALTER COLUMN username SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_uq ON users (lower(username));

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS height_cm NUMERIC(6,2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6,2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS target_weight_kg NUMERIC(6,2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS activity_level TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS goal_type TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS meals_per_day INTEGER;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS sex_for_estimate TEXT;
