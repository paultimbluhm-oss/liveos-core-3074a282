-- Update period constraint to 1-9
ALTER TABLE public.timetable_entries DROP CONSTRAINT IF EXISTS timetable_entries_period_check;
ALTER TABLE public.timetable_entries ADD CONSTRAINT timetable_entries_period_check CHECK (period >= 1 AND period <= 9);