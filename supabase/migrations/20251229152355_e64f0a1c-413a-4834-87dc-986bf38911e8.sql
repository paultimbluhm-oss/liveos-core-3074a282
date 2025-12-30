-- Add new PERMA-based columns to journal_entries
ALTER TABLE public.journal_entries 
  ADD COLUMN IF NOT EXISTS flow_experiences INTEGER CHECK (flow_experiences >= 0 AND flow_experiences <= 10),
  ADD COLUMN IF NOT EXISTS connection_quality INTEGER CHECK (connection_quality >= 1 AND connection_quality <= 5),
  ADD COLUMN IF NOT EXISTS purpose_feeling INTEGER CHECK (purpose_feeling >= 1 AND purpose_feeling <= 5),
  ADD COLUMN IF NOT EXISTS helped_others BOOLEAN,
  ADD COLUMN IF NOT EXISTS accomplishment_feeling INTEGER CHECK (accomplishment_feeling >= 1 AND accomplishment_feeling <= 5),
  ADD COLUMN IF NOT EXISTS progress_made INTEGER CHECK (progress_made >= 1 AND progress_made <= 5),
  ADD COLUMN IF NOT EXISTS autonomy_feeling INTEGER CHECK (autonomy_feeling >= 1 AND autonomy_feeling <= 5),
  ADD COLUMN IF NOT EXISTS best_moment TEXT;

-- Drop physical tracking columns that are no longer needed
ALTER TABLE public.journal_entries 
  DROP COLUMN IF EXISTS sleep_hours,
  DROP COLUMN IF EXISTS sleep_quality,
  DROP COLUMN IF EXISTS nutrition_quality,
  DROP COLUMN IF EXISTS hydration_liters,
  DROP COLUMN IF EXISTS exercise_type;