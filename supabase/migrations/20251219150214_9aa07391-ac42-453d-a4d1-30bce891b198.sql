-- Create balance_history table for tracking daily balance snapshots
CREATE TABLE public.balance_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_balance NUMERIC NOT NULL DEFAULT 0,
  accounts_balance NUMERIC NOT NULL DEFAULT 0,
  investments_balance NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Enable RLS
ALTER TABLE public.balance_history ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own balance history"
ON public.balance_history
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create index for faster queries
CREATE INDEX idx_balance_history_user_date ON public.balance_history(user_id, date DESC);