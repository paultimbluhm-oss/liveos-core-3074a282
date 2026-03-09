
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS priority_order integer DEFAULT 0;
ALTER TABLE public.habits ADD COLUMN IF NOT EXISTS is_queued boolean DEFAULT false;
