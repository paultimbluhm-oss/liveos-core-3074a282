-- Create recurring_transactions table for subscriptions and automated transactions
CREATE TABLE public.recurring_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  transaction_type TEXT NOT NULL, -- 'expense', 'income', 'transfer', 'investment'
  amount NUMERIC NOT NULL,
  source_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  target_account_id UUID REFERENCES public.accounts(id) ON DELETE SET NULL,
  investment_id UUID REFERENCES public.investments(id) ON DELETE SET NULL,
  category TEXT,
  frequency TEXT NOT NULL DEFAULT 'monthly', -- 'weekly', 'monthly', 'yearly'
  day_of_month INTEGER, -- 1-31 for monthly
  day_of_week INTEGER, -- 0-6 for weekly (0 = Sunday)
  next_execution_date DATE NOT NULL,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.recurring_transactions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own recurring transactions"
ON public.recurring_transactions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring transactions"
ON public.recurring_transactions
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own recurring transactions"
ON public.recurring_transactions
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring transactions"
ON public.recurring_transactions
FOR DELETE
USING (auth.uid() = user_id);

-- Trigger for updated_at
CREATE TRIGGER update_recurring_transactions_updated_at
BEFORE UPDATE ON public.recurring_transactions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();