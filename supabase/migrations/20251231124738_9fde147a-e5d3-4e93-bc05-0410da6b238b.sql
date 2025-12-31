-- Create function to update timestamps if it doesn't exist
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for daily lifetime goals
CREATE TABLE public.lifetime_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category TEXT NOT NULL,
  target_minutes INTEGER NOT NULL DEFAULT 60,
  day_of_week INTEGER, -- 0=Sunday, 1=Monday, etc. NULL means applies to all days
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, category, day_of_week)
);

-- Enable RLS
ALTER TABLE public.lifetime_goals ENABLE ROW LEVEL SECURITY;

-- Create policy for users to manage their own goals
CREATE POLICY "Users can manage their own lifetime goals" 
ON public.lifetime_goals 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_lifetime_goals_updated_at
BEFORE UPDATE ON public.lifetime_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();