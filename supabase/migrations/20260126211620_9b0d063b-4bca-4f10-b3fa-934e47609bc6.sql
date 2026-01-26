-- Create table for user dashboard configuration
CREATE TABLE public.dashboard_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  widget_order TEXT[] NOT NULL DEFAULT ARRAY['time-distribution', 'progress-ring', 'health-progress', 'today-details', 'quick-stats', 'next-actions', 'habits-overview', 'data-backup'],
  hidden_widgets TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.dashboard_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own dashboard config" 
ON public.dashboard_config 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard config" 
ON public.dashboard_config 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard config" 
ON public.dashboard_config 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_dashboard_config_updated_at
BEFORE UPDATE ON public.dashboard_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();