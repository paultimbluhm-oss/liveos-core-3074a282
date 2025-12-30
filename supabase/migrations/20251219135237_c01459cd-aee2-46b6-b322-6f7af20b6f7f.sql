-- Create checklist_sections table for grouping items
CREATE TABLE public.checklist_sections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  checklist_id UUID NOT NULL REFERENCES public.checklists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.checklist_sections ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own checklist sections"
ON public.checklist_sections
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add section_id to checklist_items (nullable for items without a section)
ALTER TABLE public.checklist_items 
ADD COLUMN section_id UUID REFERENCES public.checklist_sections(id) ON DELETE SET NULL;