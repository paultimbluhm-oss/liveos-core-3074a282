-- Create v2_company_categories table
CREATE TABLE public.v2_company_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create v2_companies table
CREATE TABLE public.v2_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.v2_company_categories(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'researched' CHECK (status IN ('researched', 'contacted', 'in_contact', 'completed')),
  website TEXT,
  industry TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create v2_company_contacts table
CREATE TABLE public.v2_company_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES public.v2_companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position TEXT,
  email TEXT,
  phone TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create v2_company_relations table
CREATE TABLE public.v2_company_relations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  from_company_id UUID NOT NULL REFERENCES public.v2_companies(id) ON DELETE CASCADE,
  to_company_id UUID NOT NULL REFERENCES public.v2_companies(id) ON DELETE CASCADE,
  relation_type TEXT NOT NULL CHECK (relation_type IN ('partner', 'competitor', 'subsidiary', 'supplier', 'customer')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT different_companies CHECK (from_company_id != to_company_id)
);

-- Enable RLS on all tables
ALTER TABLE public.v2_company_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v2_company_relations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for v2_company_categories
CREATE POLICY "Users can view their own categories" ON public.v2_company_categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own categories" ON public.v2_company_categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own categories" ON public.v2_company_categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own categories" ON public.v2_company_categories FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for v2_companies
CREATE POLICY "Users can view their own companies" ON public.v2_companies FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own companies" ON public.v2_companies FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own companies" ON public.v2_companies FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own companies" ON public.v2_companies FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for v2_company_contacts
CREATE POLICY "Users can view their own contacts" ON public.v2_company_contacts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own contacts" ON public.v2_company_contacts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own contacts" ON public.v2_company_contacts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own contacts" ON public.v2_company_contacts FOR DELETE USING (auth.uid() = user_id);

-- RLS Policies for v2_company_relations
CREATE POLICY "Users can view their own relations" ON public.v2_company_relations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own relations" ON public.v2_company_relations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own relations" ON public.v2_company_relations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own relations" ON public.v2_company_relations FOR DELETE USING (auth.uid() = user_id);

-- Create trigger for updated_at on v2_companies
CREATE TRIGGER update_v2_companies_updated_at
  BEFORE UPDATE ON public.v2_companies
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();