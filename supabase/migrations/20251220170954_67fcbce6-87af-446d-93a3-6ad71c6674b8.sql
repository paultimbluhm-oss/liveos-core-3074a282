-- Create custom holidays table for manually added holidays
CREATE TABLE public.custom_holidays (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.custom_holidays ENABLE ROW LEVEL SECURITY;

-- Create policy for user access
CREATE POLICY "Users can manage their own custom holidays"
  ON public.custom_holidays
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);