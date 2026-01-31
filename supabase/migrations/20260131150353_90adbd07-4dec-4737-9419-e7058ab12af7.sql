-- Add selected_class_name column (A, B, C, D, E) instead of selected_class_id
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS selected_class_name TEXT DEFAULT 'A';

-- The selected_class_id column can remain for backwards compatibility but won't be used