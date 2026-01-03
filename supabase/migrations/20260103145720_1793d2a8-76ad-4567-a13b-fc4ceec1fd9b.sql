-- Create health items table for storing health-related data
CREATE TABLE public.health_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'daily_routine',
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create health completions table for tracking daily progress
CREATE TABLE public.health_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  health_item_id UUID NOT NULL REFERENCES public.health_items(id) ON DELETE CASCADE,
  completed_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(health_item_id, completed_date)
);

-- Enable RLS
ALTER TABLE public.health_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_completions ENABLE ROW LEVEL SECURITY;

-- RLS policies for health_items
CREATE POLICY "Users can manage their own health items"
ON public.health_items
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for health_completions
CREATE POLICY "Users can manage their own health completions"
ON public.health_completions
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);