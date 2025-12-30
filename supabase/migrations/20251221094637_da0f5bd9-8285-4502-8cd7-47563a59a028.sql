-- Add address and status fields to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS address text,
ADD COLUMN IF NOT EXISTS status text DEFAULT 'idea';

-- Add comment for status values
COMMENT ON COLUMN public.contacts.status IS 'Status: idea, contacted, in_exchange, has_orders';