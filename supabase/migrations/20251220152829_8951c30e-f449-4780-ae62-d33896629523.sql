-- Add week_type column for biweekly lessons (A/B weeks)
ALTER TABLE public.timetable_entries 
ADD COLUMN week_type text DEFAULT 'both' CHECK (week_type IN ('both', 'odd', 'even'));

-- Add comment for clarity
COMMENT ON COLUMN public.timetable_entries.week_type IS 'Which weeks this lesson occurs: both (weekly), odd (A-Woche), even (B-Woche)';