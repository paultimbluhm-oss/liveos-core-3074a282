-- Add unique constraint on balance_history for user_id and date if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'balance_history_user_id_date_key'
  ) THEN
    ALTER TABLE public.balance_history ADD CONSTRAINT balance_history_user_id_date_key UNIQUE (user_id, date);
  END IF;
END $$;

-- Create a table for user grade color settings
CREATE TABLE IF NOT EXISTS public.grade_color_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  green_min INTEGER NOT NULL DEFAULT 13,
  yellow_min INTEGER NOT NULL DEFAULT 10,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grade_color_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own grade color settings"
ON public.grade_color_settings
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own grade color settings"
ON public.grade_color_settings
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own grade color settings"
ON public.grade_color_settings
FOR UPDATE
USING (auth.uid() = user_id);