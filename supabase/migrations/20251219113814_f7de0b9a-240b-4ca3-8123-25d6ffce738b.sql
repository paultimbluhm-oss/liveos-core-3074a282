-- Add currency column to investments table
ALTER TABLE public.investments 
ADD COLUMN currency text NOT NULL DEFAULT 'EUR';