-- Create table for lifetime/time tracking entries
CREATE TABLE public.time_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  minutes INTEGER NOT NULL DEFAULT 0,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users can manage their own time entries"
ON public.time_entries
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_time_entries_user_date ON public.time_entries(user_id, entry_date);
CREATE INDEX idx_time_entries_category ON public.time_entries(user_id, category);