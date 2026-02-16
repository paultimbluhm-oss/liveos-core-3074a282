
-- Dashboard V2 config table (account-bound, not device-bound)
CREATE TABLE public.dashboard_v2_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  widgets JSONB NOT NULL DEFAULT '[]'::jsonb,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT dashboard_v2_config_user_id_key UNIQUE (user_id)
);

ALTER TABLE public.dashboard_v2_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own dashboard config"
  ON public.dashboard_v2_config FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own dashboard config"
  ON public.dashboard_v2_config FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own dashboard config"
  ON public.dashboard_v2_config FOR UPDATE USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_dashboard_v2_config_updated_at
  BEFORE UPDATE ON public.dashboard_v2_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
