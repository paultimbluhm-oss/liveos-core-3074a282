
-- 1. Sprachpaare (z.B. Deutsch → Spanisch)
CREATE TABLE public.v2_vocab_languages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  source_lang TEXT NOT NULL DEFAULT 'Deutsch',
  target_lang TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_vocab_languages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own vocab languages" ON public.v2_vocab_languages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 2. Lernsets (z.B. "Vokabeltest 12.02")
CREATE TABLE public.v2_vocab_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  language_id UUID NOT NULL REFERENCES public.v2_vocab_languages(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  set_date DATE,
  high_score_mc INTEGER NOT NULL DEFAULT 0,
  high_score_type INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_vocab_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own vocab sets" ON public.v2_vocab_sets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Woerter
CREATE TABLE public.v2_vocab_words (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES public.v2_vocab_sets(id) ON DELETE CASCADE,
  source_word TEXT NOT NULL,
  target_word TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_vocab_words ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own vocab words" ON public.v2_vocab_words
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Lernfortschritt pro Wort
CREATE TABLE public.v2_vocab_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES public.v2_vocab_words(id) ON DELETE CASCADE,
  set_id UUID NOT NULL REFERENCES public.v2_vocab_sets(id) ON DELETE CASCADE,
  correct_count INTEGER NOT NULL DEFAULT 0,
  wrong_count INTEGER NOT NULL DEFAULT 0,
  last_reviewed TIMESTAMP WITH TIME ZONE,
  mastered BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.v2_vocab_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own vocab progress" ON public.v2_vocab_progress
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_v2_vocab_sets_language ON public.v2_vocab_sets(language_id);
CREATE INDEX idx_v2_vocab_words_set ON public.v2_vocab_words(set_id);
CREATE INDEX idx_v2_vocab_progress_word ON public.v2_vocab_progress(word_id);
CREATE INDEX idx_v2_vocab_progress_set ON public.v2_vocab_progress(set_id);
