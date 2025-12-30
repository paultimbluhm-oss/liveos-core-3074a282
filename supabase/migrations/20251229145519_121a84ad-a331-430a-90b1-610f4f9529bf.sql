-- Add recurrence fields to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS recurrence_type TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS recurrence_end_date TIMESTAMP WITH TIME ZONE DEFAULT NULL;

-- recurrence_type can be: 'daily', 'weekly', 'monthly', 'yearly', or null for non-recurring