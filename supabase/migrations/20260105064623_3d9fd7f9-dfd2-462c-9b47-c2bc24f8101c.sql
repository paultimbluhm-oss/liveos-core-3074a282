-- Add points_per_minute column to lifetime_goals table
ALTER TABLE public.lifetime_goals 
ADD COLUMN IF NOT EXISTS points_per_minute numeric DEFAULT 0;

-- Add comment for clarity
COMMENT ON COLUMN public.lifetime_goals.points_per_minute IS 'Points earned per minute spent in this category';