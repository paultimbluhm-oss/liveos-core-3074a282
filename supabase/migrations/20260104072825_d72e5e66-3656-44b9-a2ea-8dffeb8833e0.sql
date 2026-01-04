-- Ernährungsregeln (z.B. "Mindestens 2x Fisch pro Woche", "Täglich Gemüse")
CREATE TABLE public.nutrition_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  frequency_type TEXT NOT NULL DEFAULT 'daily', -- 'daily' oder 'weekly'
  target_count INTEGER NOT NULL DEFAULT 1, -- Wie oft pro Tag/Woche
  is_active BOOLEAN DEFAULT true,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS für nutrition_rules
ALTER TABLE public.nutrition_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own nutrition rules"
ON public.nutrition_rules
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Verknüpfung: Welche Regeln erfüllt ein Rezept
CREATE TABLE public.recipe_nutrition_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  rule_id UUID NOT NULL REFERENCES public.nutrition_rules(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(recipe_id, rule_id)
);

-- RLS für recipe_nutrition_rules
ALTER TABLE public.recipe_nutrition_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own recipe nutrition rules"
ON public.recipe_nutrition_rules
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Mahlzeiten-Log: Welche Mahlzeiten wurden an welchem Tag gegessen
CREATE TABLE public.meal_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  recipe_id UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL DEFAULT 'lunch', -- 'breakfast', 'lunch', 'dinner', 'snack'
  meal_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, recipe_id, meal_type, meal_date)
);

-- RLS für meal_log
ALTER TABLE public.meal_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own meal log"
ON public.meal_log
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);