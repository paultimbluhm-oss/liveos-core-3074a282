
-- Remove XP system entirely

-- Drop achievements table
DROP TABLE IF EXISTS public.achievements CASCADE;

-- Remove xp and level from profiles
ALTER TABLE public.profiles DROP COLUMN IF EXISTS xp;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS level;

-- Remove xp_reward from tasks
ALTER TABLE public.tasks DROP COLUMN IF EXISTS xp_reward;

-- Remove xp_reward from habits
ALTER TABLE public.habits DROP COLUMN IF EXISTS xp_reward;

-- Remove xp_reward and xp_per_improvement from activity_skills
ALTER TABLE public.activity_skills DROP COLUMN IF EXISTS xp_reward;
ALTER TABLE public.activity_skills DROP COLUMN IF EXISTS xp_per_improvement;

-- Remove total_xp_earned from boredom_activities
ALTER TABLE public.boredom_activities DROP COLUMN IF EXISTS total_xp_earned;
