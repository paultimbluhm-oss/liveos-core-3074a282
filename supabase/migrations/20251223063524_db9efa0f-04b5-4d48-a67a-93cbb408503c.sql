-- Create loans table for tracking loaned money
CREATE TABLE public.loans (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  person_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  loan_type TEXT NOT NULL DEFAULT 'lent', -- 'lent' = I lent, 'borrowed' = I borrowed
  description TEXT,
  loan_date DATE DEFAULT CURRENT_DATE,
  due_date DATE,
  is_returned BOOLEAN DEFAULT false,
  returned_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can manage their own loans"
ON public.loans
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);