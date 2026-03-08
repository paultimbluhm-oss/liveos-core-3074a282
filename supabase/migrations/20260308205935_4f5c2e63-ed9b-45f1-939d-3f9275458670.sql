
-- Store course classification for Abi-Rechner (LK, GK, abgewaehlt)
CREATE TABLE public.v2_abi_course_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id uuid NOT NULL,
  course_type text NOT NULL DEFAULT 'gk' CHECK (course_type IN ('lk', 'gk', 'abgewaehlt')),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, course_id)
);

ALTER TABLE public.v2_abi_course_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own abi course settings"
  ON public.v2_abi_course_settings
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
