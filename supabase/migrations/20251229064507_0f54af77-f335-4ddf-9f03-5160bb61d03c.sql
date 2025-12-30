-- Add source and return account columns to loans table
ALTER TABLE public.loans 
ADD COLUMN source_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
ADD COLUMN return_account_id uuid REFERENCES public.accounts(id) ON DELETE SET NULL;