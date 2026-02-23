
-- Add Atomic Habits fields to habits table
ALTER TABLE public.habits 
  ADD COLUMN IF NOT EXISTS identity_statement text NULL,
  ADD COLUMN IF NOT EXISTS when_trigger text NULL,
  ADD COLUMN IF NOT EXISTS where_location text NULL,
  ADD COLUMN IF NOT EXISTS habit_stacking text NULL,
  ADD COLUMN IF NOT EXISTS temptation_bundling text NULL,
  ADD COLUMN IF NOT EXISTS cue_creation text NULL,
  ADD COLUMN IF NOT EXISTS obstacles text NULL,
  ADD COLUMN IF NOT EXISTS obstacle_removal text NULL,
  ADD COLUMN IF NOT EXISTS environment_prep text NULL,
  ADD COLUMN IF NOT EXISTS fun_activity text NULL,
  ADD COLUMN IF NOT EXISTS positive_benefits text NULL,
  ADD COLUMN IF NOT EXISTS negative_consequences text NULL,
  ADD COLUMN IF NOT EXISTS reward text NULL;
