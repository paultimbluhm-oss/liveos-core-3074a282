
-- ============================================
-- 1. SHARED HABITS: Allow friends to share a habit and track independently
-- ============================================

CREATE TABLE public.shared_habits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  habit_id UUID NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  friend_habit_id UUID REFERENCES public.habits(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(habit_id, friend_id)
);

ALTER TABLE public.shared_habits ENABLE ROW LEVEL SECURITY;

-- Security definer function to check shared habit access
CREATE OR REPLACE FUNCTION public.is_shared_habit_participant(_user_id uuid, _shared_habit_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_habits
    WHERE id = _shared_habit_id
      AND (owner_id = _user_id OR friend_id = _user_id)
  )
$$;

-- RLS policies for shared_habits
CREATE POLICY "Users can view shared habits they participate in"
  ON public.shared_habits FOR SELECT
  TO authenticated
  USING (owner_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can create shared habit invites for their own habits"
  ON public.shared_habits FOR INSERT
  TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update shared habits they participate in"
  ON public.shared_habits FOR UPDATE
  TO authenticated
  USING (owner_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can delete their own shared habit invites"
  ON public.shared_habits FOR DELETE
  TO authenticated
  USING (owner_id = auth.uid());

-- ============================================
-- 2. LOANS: Add optional friend_user_id column
-- ============================================

ALTER TABLE public.v2_loans ADD COLUMN friend_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- ============================================
-- 3. Security definer function to check friendship
-- ============================================

CREATE OR REPLACE FUNCTION public.are_friends(_user_id_1 uuid, _user_id_2 uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE status = 'accepted'
      AND (
        (requester_id = _user_id_1 AND addressee_id = _user_id_2)
        OR (requester_id = _user_id_2 AND addressee_id = _user_id_1)
      )
  )
$$;

-- ============================================
-- 4. Allow friends to see shared habit data
-- ============================================

CREATE OR REPLACE FUNCTION public.is_habit_shared_with_user(_habit_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shared_habits
    WHERE status = 'accepted'
      AND (
        (habit_id = _habit_id AND friend_id = _user_id)
        OR (friend_habit_id = _habit_id AND owner_id = _user_id)
      )
  )
$$;

-- Drop existing ALL policies that conflict, then add specific ones
DROP POLICY IF EXISTS "Users can manage their own habit completions" ON public.habit_completions;
DROP POLICY IF EXISTS "Users can manage their own habits" ON public.habits;

-- Habits: own + shared
CREATE POLICY "Users can view own and shared habits"
  ON public.habits FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_habit_shared_with_user(id, auth.uid()));

CREATE POLICY "Users can insert own habits"
  ON public.habits FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own habits"
  ON public.habits FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own habits"
  ON public.habits FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- Habit completions: own + shared
CREATE POLICY "Users can view own and shared completions"
  ON public.habit_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_habit_shared_with_user(habit_id, auth.uid()));

CREATE POLICY "Users can insert own completions"
  ON public.habit_completions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own completions"
  ON public.habit_completions FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own completions"
  ON public.habit_completions FOR DELETE TO authenticated
  USING (user_id = auth.uid());
