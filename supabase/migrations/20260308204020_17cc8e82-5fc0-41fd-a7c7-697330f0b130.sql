
CREATE TABLE public.v2_business_costs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  cost_type TEXT NOT NULL DEFAULT 'one_time',
  frequency TEXT DEFAULT 'monthly',
  category TEXT,
  notes TEXT,
  date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_business_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own business costs"
  ON public.v2_business_costs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
