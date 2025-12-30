-- Create school_projects table
CREATE TABLE public.school_projects (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE SET NULL,
  status TEXT DEFAULT 'open',
  deadline DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create school_tasks table for classmate and teacher tasks
CREATE TABLE public.school_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  task_type TEXT NOT NULL, -- 'classmate' or 'teacher'
  person_name TEXT,
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.school_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.school_tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for school_projects
CREATE POLICY "Users can manage their own school projects"
ON public.school_projects
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Create policies for school_tasks
CREATE POLICY "Users can manage their own school tasks"
ON public.school_tasks
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_school_projects_updated_at
BEFORE UPDATE ON public.school_projects
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();