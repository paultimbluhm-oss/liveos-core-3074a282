-- Create table for individual homework completions per user
CREATE TABLE public.v2_homework_completions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  homework_id UUID NOT NULL REFERENCES public.v2_homework(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  completed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(homework_id, user_id)
);

-- Enable RLS
ALTER TABLE public.v2_homework_completions ENABLE ROW LEVEL SECURITY;

-- Users can see their own completions
CREATE POLICY "Users can view own completions"
  ON public.v2_homework_completions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Users can mark homework as completed
CREATE POLICY "Users can create own completions"
  ON public.v2_homework_completions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own completions
CREATE POLICY "Users can delete own completions"
  ON public.v2_homework_completions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Add index for performance
CREATE INDEX idx_v2_homework_completions_homework ON public.v2_homework_completions(homework_id);
CREATE INDEX idx_v2_homework_completions_user ON public.v2_homework_completions(user_id);