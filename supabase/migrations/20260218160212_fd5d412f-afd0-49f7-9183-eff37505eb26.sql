
CREATE TABLE public.v2_loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  loan_type TEXT NOT NULL, -- 'lent' or 'borrowed'
  person_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'EUR',
  account_id UUID REFERENCES public.v2_accounts(id) ON DELETE SET NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  is_settled BOOLEAN DEFAULT false,
  settled_date DATE,
  settled_account_id UUID REFERENCES public.v2_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.v2_loans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own loans" ON public.v2_loans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
