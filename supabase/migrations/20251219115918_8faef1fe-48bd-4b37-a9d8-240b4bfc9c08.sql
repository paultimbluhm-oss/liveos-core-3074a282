-- Add XP and priority fields to homework table
ALTER TABLE public.homework 
ADD COLUMN IF NOT EXISTS priority text DEFAULT 'medium',
ADD COLUMN IF NOT EXISTS xp_reward integer DEFAULT 10;