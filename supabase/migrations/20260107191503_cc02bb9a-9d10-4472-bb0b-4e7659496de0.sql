-- Create friendship status enum
CREATE TYPE public.friendship_status AS ENUM ('pending', 'accepted', 'rejected', 'blocked');

-- Create friendships table
CREATE TABLE public.friendships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  addressee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status friendship_status NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(requester_id, addressee_id),
  CHECK (requester_id != addressee_id)
);

-- Create friend streaks table (daily check-ins together)
CREATE TABLE public.friend_streaks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  friendship_id UUID NOT NULL REFERENCES public.friendships(id) ON DELETE CASCADE,
  current_streak INTEGER NOT NULL DEFAULT 0,
  longest_streak INTEGER NOT NULL DEFAULT 0,
  last_both_active_date DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(friendship_id)
);

-- Create challenges table
CREATE TABLE public.challenges (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenge_type TEXT NOT NULL, -- 'xp_race', 'task_count', 'habit_streak', 'custom'
  title TEXT NOT NULL,
  description TEXT,
  target_value INTEGER,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'active', 'completed', 'declined'
  winner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create challenge progress tracking
CREATE TABLE public.challenge_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  challenge_id UUID NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  current_value INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(challenge_id, user_id)
);

-- Create privacy settings table
CREATE TABLE public.friend_privacy_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  share_level BOOLEAN NOT NULL DEFAULT true,
  share_xp BOOLEAN NOT NULL DEFAULT true,
  share_streak BOOLEAN NOT NULL DEFAULT true,
  share_habits BOOLEAN NOT NULL DEFAULT false,
  share_tasks BOOLEAN NOT NULL DEFAULT false,
  share_grades BOOLEAN NOT NULL DEFAULT false,
  share_finance BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friend_privacy_settings ENABLE ROW LEVEL SECURITY;

-- Friendships policies
CREATE POLICY "Users can view their own friendships"
ON public.friendships FOR SELECT
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create friend requests"
ON public.friendships FOR INSERT
WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they're part of"
ON public.friendships FOR UPDATE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete their own friend requests"
ON public.friendships FOR DELETE
USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Friend streaks policies
CREATE POLICY "Users can view streaks of their friendships"
ON public.friend_streaks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f 
    WHERE f.id = friendship_id 
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    AND f.status = 'accepted'
  )
);

CREATE POLICY "System can manage friend streaks"
ON public.friend_streaks FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.friendships f 
    WHERE f.id = friendship_id 
    AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
  )
);

-- Challenges policies
CREATE POLICY "Users can view challenges they're part of"
ON public.challenges FOR SELECT
USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE POLICY "Users can create challenges"
ON public.challenges FOR INSERT
WITH CHECK (auth.uid() = challenger_id);

CREATE POLICY "Users can update challenges they're part of"
ON public.challenges FOR UPDATE
USING (auth.uid() = challenger_id OR auth.uid() = challenged_id);

CREATE POLICY "Users can delete their own challenges"
ON public.challenges FOR DELETE
USING (auth.uid() = challenger_id);

-- Challenge progress policies
CREATE POLICY "Users can view challenge progress"
ON public.challenge_progress FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.challenges c 
    WHERE c.id = challenge_id 
    AND (c.challenger_id = auth.uid() OR c.challenged_id = auth.uid())
  )
);

CREATE POLICY "Users can update their own progress"
ON public.challenge_progress FOR ALL
USING (user_id = auth.uid());

-- Privacy settings policies
CREATE POLICY "Users can view their own privacy settings"
ON public.friend_privacy_settings FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own privacy settings"
ON public.friend_privacy_settings FOR ALL
USING (auth.uid() = user_id);

-- Allow users to see other users' privacy settings (for determining what to show)
CREATE POLICY "Users can view others privacy settings for sharing"
ON public.friend_privacy_settings FOR SELECT
USING (true);

-- Add avatar_url and display_name to profiles if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'display_name') THEN
    ALTER TABLE public.profiles ADD COLUMN display_name TEXT;
  END IF;
END $$;