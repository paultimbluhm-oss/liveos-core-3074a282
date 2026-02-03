-- Add table for external savings (money from others like parents)
CREATE TABLE public.v2_external_savings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  source_person TEXT NOT NULL,
  amount NUMERIC NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'EUR',
  expected_date DATE,
  note TEXT,
  is_received BOOLEAN NOT NULL DEFAULT false,
  received_date DATE,
  received_account_id UUID REFERENCES public.v2_accounts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.v2_external_savings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view own external savings" ON public.v2_external_savings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own external savings" ON public.v2_external_savings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own external savings" ON public.v2_external_savings FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own external savings" ON public.v2_external_savings FOR DELETE USING (auth.uid() = user_id);