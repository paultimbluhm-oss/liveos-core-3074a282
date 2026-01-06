-- Add rule_type column to nutrition_rules for min/max rules
ALTER TABLE public.nutrition_rules 
ADD COLUMN IF NOT EXISTS rule_type TEXT DEFAULT 'min' CHECK (rule_type IN ('min', 'max'));