
-- Orders table for business v2
CREATE TABLE public.v2_company_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.v2_companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'active',
  revenue numeric DEFAULT 0,
  expenses numeric DEFAULT 0,
  time_spent_minutes integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_company_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own orders"
  ON public.v2_company_orders
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Checklist items for each order
CREATE TABLE public.v2_order_checklist_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.v2_company_orders(id) ON DELETE CASCADE,
  title text NOT NULL,
  completed boolean DEFAULT false,
  completed_at timestamptz,
  order_index integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_order_checklist_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own order checklist items"
  ON public.v2_order_checklist_items
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
