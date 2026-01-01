import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { supabase } from '@/integrations/supabase/client';
import { Flame } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { motion } from 'framer-motion';
import { useGamification } from '@/contexts/GamificationContext';

interface TodayStats {
  tasksCompleted: number;
  tasksTotal: number;
  homeworkCompleted: number;
  homeworkTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
}

export function ProgressRingWidget() {
  const { user } = useAuth();
  const { profile, refetch } = useProfile();
  const { celebrateStreak } = useGamification();
  const [stats, setStats] = useState<TodayStats>({
    tasksCompleted: 0,
    tasksTotal: 0,
    homeworkCompleted: 0,
    homeworkTotal: 0,
    habitsCompleted: 0,
    habitsTotal: 0,
  });
  const hasUpdatedStreakRef = useRef(false);

  const fetchTodayStats = async () => {
    if (!user) return;

    const today = format(new Date(), 'yyyy-MM-dd');

    const [tasksRes, homeworkRes, habitsRes, habitCompletionsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, completed, due_date')
        .eq('user_id', user.id)
        .not('due_date', 'is', null),
      supabase
        .from('homework')
        .select('id, completed, due_date')
        .eq('user_id', user.id)
        .eq('due_date', today),
      supabase
        .from('habits')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('habit_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed_date', today),
    ]);

    const todaysTasks = (tasksRes.data || []).filter(t => {
      if (!t.due_date) return false;
      const taskDate = format(new Date(t.due_date), 'yyyy-MM-dd');
      return taskDate === today;
    });

    setStats({
      tasksCompleted: todaysTasks.filter(t => t.completed).length,
      tasksTotal: todaysTasks.length,
      homeworkCompleted: homeworkRes.data?.filter(h => h.completed).length || 0,
      homeworkTotal: homeworkRes.data?.length || 0,
      habitsCompleted: habitCompletionsRes.data?.length || 0,
      habitsTotal: habitsRes.data?.length || 0,
    });
  };

  // Check if a specific date had 100% completion
  const checkDateCompletion = async (dateStr: string): Promise<boolean> => {
    if (!user) return false;

    const [tasksRes, homeworkRes, habitsRes, habitCompletionsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, completed, due_date')
        .eq('user_id', user.id)
        .not('due_date', 'is', null),
      supabase
        .from('homework')
        .select('id, completed')
        .eq('user_id', user.id)
        .eq('due_date', dateStr),
      supabase
        .from('habits')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true),
      supabase
        .from('habit_completions')
        .select('id')
        .eq('user_id', user.id)
        .eq('completed_date', dateStr),
    ]);

    const dateTasks = (tasksRes.data || []).filter(t => {
      if (!t.due_date) return false;
      const taskDate = format(new Date(t.due_date), 'yyyy-MM-dd');
      return taskDate === dateStr;
    });

    const homework = homeworkRes.data || [];
    const habits = habitsRes.data || [];
    const completions = habitCompletionsRes.data || [];

    const totalItems = dateTasks.length + homework.length + habits.length;
    
    // If no items existed for that day, it doesn't count as completed for streak purposes
    if (totalItems === 0) return false;

    const tasksComplete = dateTasks.every(t => t.completed);
    const homeworkComplete = homework.every(h => h.completed);
    const habitsComplete = completions.length >= habits.length;

    return tasksComplete && homeworkComplete && habitsComplete;
  };

  // Check if streak should be reset (missed a day)
  const checkStreakReset = async () => {
    if (!user || !profile) return;
    
    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    
    const lastActiveDate = profile.last_active_date;
    
    // If last active was before yesterday and streak > 0, reset it
    if (lastActiveDate && lastActiveDate !== today && lastActiveDate !== yesterday && profile.streak_days > 0) {
      await supabase
        .from('profiles')
        .update({ streak_days: 0 })
        .eq('user_id', user.id);
      refetch();
    }
  };

  // Update streak when 100% is reached for the first time today
  const updateStreakIfComplete = async () => {
    if (!user || !profile || hasUpdatedStreakRef.current) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    
    const totalCompleted = stats.tasksCompleted + stats.homeworkCompleted + stats.habitsCompleted;
    const totalItems = stats.tasksTotal + stats.homeworkTotal + stats.habitsTotal;
    
    // Must have items today AND all must be completed
    if (totalItems === 0 || totalCompleted !== totalItems) return;
    
    // Check localStorage to see if we already awarded streak today
    const streakAwardedKey = `streak_awarded_${user.id}_${today}`;
    const alreadyAwarded = localStorage.getItem(streakAwardedKey) === 'true';
    
    if (alreadyAwarded) return;

    hasUpdatedStreakRef.current = true;
    localStorage.setItem(streakAwardedKey, 'true');
    
    const lastActiveDate = profile.last_active_date;
    let newStreak = 1; // Default: start new streak at 1
    
    // Only continue streak if yesterday was also 100% completed
    if (lastActiveDate === yesterday) {
      const yesterdayComplete = await checkDateCompletion(yesterday);
      if (yesterdayComplete) {
        // Continue the streak
        newStreak = (profile.streak_days || 0) + 1;
      }
      // If yesterday wasn't 100%, streak stays at 1
    }
    
    await supabase
      .from('profiles')
      .update({ 
        last_active_date: today,
        streak_days: newStreak
      })
      .eq('user_id', user.id);
    
    // Celebrate and refresh
    if (newStreak > 1) {
      celebrateStreak(newStreak);
    }
    refetch();
  };

  // Check for streak reset on mount
  useEffect(() => {
    if (profile) {
      checkStreakReset();
    }
  }, [profile?.last_active_date]);

  useEffect(() => {
    if (user) {
      fetchTodayStats();
    }
  }, [user]);

  // Check for streak update when stats change
  useEffect(() => {
    updateStreakIfComplete();
  }, [stats, profile]);

  useEffect(() => {
    if (!user) return;

    const tasksChannel = supabase
      .channel('progress-tasks')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchTodayStats)
      .subscribe();

    const homeworkChannel = supabase
      .channel('progress-homework')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, fetchTodayStats)
      .subscribe();

    const habitsChannel = supabase
      .channel('progress-habits')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, fetchTodayStats)
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(homeworkChannel);
      supabase.removeChannel(habitsChannel);
    };
  }, [user]);

  const totalCompleted = stats.tasksCompleted + stats.homeworkCompleted + stats.habitsCompleted;
  const totalItems = stats.tasksTotal + stats.homeworkTotal + stats.habitsTotal;
  
  // If no items for today, show 100% (everything done)
  const overallProgress = totalItems === 0 ? 100 : Math.round((totalCompleted / totalItems) * 100);
  const allDone = totalItems === 0 || totalCompleted === totalItems;
  const streakDays = profile?.streak_days || 0;

  // Ring dimensions for the circular widget
  const size = 96; // md:w-24 h-24
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="flex items-center justify-center p-2">
      <div className="relative">
        {/* SVG Ring as the widget border */}
        <svg 
          className="w-24 h-24 md:w-28 md:h-28 transform -rotate-90" 
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background ring - transparent fill */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="hsl(var(--secondary))"
            strokeWidth={strokeWidth}
            className="opacity-40"
          />
          {/* Progress ring */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={allDone ? "url(#progressGradientSuccess)" : "url(#progressGradient)"}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: circumference * (1 - overallProgress / 100) }}
            transition={{ duration: 1, ease: 'easeOut' }}
            className={allDone ? 'drop-shadow-[0_0_12px_hsl(var(--success)/0.7)]' : 'drop-shadow-[0_0_8px_hsl(var(--primary)/0.5)]'}
          />
          <defs>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--primary))" />
              <stop offset="100%" stopColor="hsl(var(--accent))" />
            </linearGradient>
            <linearGradient id="progressGradientSuccess" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="hsl(var(--success))" />
              <stop offset="50%" stopColor="hsl(160 60% 50%)" />
              <stop offset="100%" stopColor="hsl(var(--success))" />
            </linearGradient>
          </defs>
        </svg>
        
        {/* Content inside the ring */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          {/* Percentage */}
          <motion.span 
            key={overallProgress}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className={`text-lg md:text-xl font-bold font-mono ${allDone ? 'text-success' : 'text-foreground'}`}
          >
            {overallProgress}%
          </motion.span>
          
          {/* Streak with flame */}
          <div className={`flex items-center gap-1 ${streakDays > 0 ? 'text-streak' : 'text-muted-foreground'}`}>
            <Flame className="w-3 h-3" />
            <span className="text-[10px] font-bold font-mono">{streakDays}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
