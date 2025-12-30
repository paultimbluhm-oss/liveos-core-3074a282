-- Create technical_terms table for vocabulary/professional language
CREATE TABLE public.technical_terms (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  term TEXT NOT NULL,
  simple_term TEXT,
  explanation TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.technical_terms ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own technical terms"
  ON public.technical_terms
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create optimizations table for tracking improvements/problems
CREATE TABLE public.optimizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  status TEXT DEFAULT 'idea',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.optimizations ENABLE ROW LEVEL SECURITY;

-- Create policy
CREATE POLICY "Users can manage their own optimizations"
  ON public.optimizations
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_optimizations_updated_at
  BEFORE UPDATE ON public.optimizations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();