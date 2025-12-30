-- Create activity_skills table for tracking skills/milestones within activities
CREATE TABLE public.activity_skills (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  activity_id UUID NOT NULL REFERENCES public.boredom_activities(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  xp_reward INTEGER DEFAULT 15,
  order_index INTEGER DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.activity_skills ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own activity skills"
ON public.activity_skills
FOR ALL
USING (auth.uid() = user_id);

-- Add xp_reward and description to boredom_activities if not exists
ALTER TABLE public.boredom_activities 
ADD COLUMN IF NOT EXISTS description TEXT,
ADD COLUMN IF NOT EXISTS total_xp_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS icon TEXT DEFAULT 'Lightbulb';