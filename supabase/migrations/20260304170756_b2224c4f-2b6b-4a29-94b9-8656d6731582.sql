
-- Timeline entries for companies
CREATE TABLE public.v2_company_timeline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  company_id UUID NOT NULL REFERENCES public.v2_companies(id) ON DELETE CASCADE,
  entry_type TEXT NOT NULL DEFAULT 'note',
  title TEXT,
  content TEXT,
  contact_id UUID REFERENCES public.v2_company_contacts(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Company tags
CREATE TABLE public.v2_company_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, name)
);

-- Junction table for company <-> tag
CREATE TABLE public.v2_company_tag_assignments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.v2_companies(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.v2_company_tags(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users NOT NULL,
  UNIQUE(company_id, tag_id)
);

-- Company todos / next steps
CREATE TABLE public.v2_company_todos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  company_id UUID NOT NULL REFERENCES public.v2_companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  completed BOOLEAN DEFAULT false,
  due_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Company links / documents
CREATE TABLE public.v2_company_links (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  company_id UUID NOT NULL REFERENCES public.v2_companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  link_type TEXT DEFAULT 'link',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.v2_company_timeline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_company_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_company_tag_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_company_todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_company_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own timeline" ON public.v2_company_timeline FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own tags" ON public.v2_company_tags FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own tag assignments" ON public.v2_company_tag_assignments FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own todos" ON public.v2_company_todos FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can manage their own links" ON public.v2_company_links FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
