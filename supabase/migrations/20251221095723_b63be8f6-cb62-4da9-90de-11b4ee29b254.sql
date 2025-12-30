-- Add new columns to orders table for comprehensive order tracking
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS expenses numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS time_spent_hours numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS revenue numeric DEFAULT 0,
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS notes text;

-- Create order_expenses table for detailed expense tracking
CREATE TABLE IF NOT EXISTS public.order_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  description text NOT NULL,
  amount numeric NOT NULL,
  category text,
  date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now()
);

-- Create order_time_entries table for time tracking
CREATE TABLE IF NOT EXISTS public.order_time_entries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  description text,
  hours numeric NOT NULL,
  date date DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_time_entries ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_expenses
CREATE POLICY "Users can manage their own order expenses" 
ON public.order_expenses 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- RLS policies for order_time_entries
CREATE POLICY "Users can manage their own order time entries" 
ON public.order_time_entries 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);