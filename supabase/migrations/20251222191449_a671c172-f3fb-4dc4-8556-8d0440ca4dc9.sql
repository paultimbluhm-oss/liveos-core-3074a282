-- Add position field to contacts table
ALTER TABLE public.contacts ADD COLUMN position text;

-- Create contact_connections table for linking contacts
CREATE TABLE public.contact_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  from_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  to_contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'connection',
  description text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (from_contact_id, to_contact_id)
);

-- Enable RLS
ALTER TABLE public.contact_connections ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own contact connections"
ON public.contact_connections
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);