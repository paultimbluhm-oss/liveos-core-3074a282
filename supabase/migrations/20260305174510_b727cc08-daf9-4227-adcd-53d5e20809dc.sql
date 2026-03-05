CREATE TABLE public.v2_company_statuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key text NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#64748b',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, key)
);

ALTER TABLE public.v2_company_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own statuses" ON public.v2_company_statuses FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);