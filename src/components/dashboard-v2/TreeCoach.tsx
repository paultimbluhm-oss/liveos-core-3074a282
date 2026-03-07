import { useState, useEffect, useMemo, useCallback } from 'react';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { TreeCoachSheet } from './TreeCoachSheet';
import { FalkoAvatar } from './falko/FalkoAvatar';
import { generateChallenges, pickChallenge, getMood, type FalkoChallenge, type FalkoMood } from './falko/challengeEngine';

export function TreeCoach() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<{ id: string; name: string; habit_type: string }[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [challenges, setChallenges] = useState<FalkoChallenge[]>([]);
  const [justCompleted, setJustCompleted] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [streakDays, setStreakDays] = useState(0);
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [hRes, cRes, profileRes] = await Promise.all([
      supabase.from('habits').select('id, name, habit_type').eq('user_id', user.id).eq('is_active', true),
      supabase.from('habit_completions').select('habit_id').eq('user_id', user.id).eq('completed_date', today),
      supabase.from('profiles').select('streak_days').eq('user_id', user.id).maybeSingle(),
    ]);
    if (hRes.data) setHabits(hRes.data.map((h: any) => ({ id: h.id, name: h.name, habit_type: h.habit_type || 'check' })));
    if (cRes.data) setCompletedIds(new Set(cRes.data.map((c: any) => c.habit_id)));
    if (profileRes.data) setStreakDays(profileRes.data.streak_days || 0);

    // Generate challenges
    const ch = await generateChallenges(user.id);
    setChallenges(ch);
  }, [user, today]);

  useEffect(() => { if (user) fetchData(); }, [user, fetchData]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('falko-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, fetchData]);

  const total = habits.length;
  const doneCount = habits.filter(h => completedIds.has(h.id)).length;
  const pct = total > 0 ? doneCount / total : 0;
  const allDone = total > 0 && doneCount === total;

  const mood: FalkoMood = getMood(pct, streakDays);

  const currentChallenge = useMemo(
    () => pickChallenge(challenges, today, doneCount),
    [challenges, today, doneCount]
  );

  const happyMessages = [
    'Alles erledigt, top!',
    'Perfekter Tag!',
    'Stark, alles geschafft!',
    'Falko ist stolz auf dich!',
  ];

  const happyMessage = useMemo(() => {
    let hash = 0;
    for (let i = 0; i < today.length; i++) { hash = ((hash << 5) - hash) + today.charCodeAt(i); hash |= 0; }
    return happyMessages[Math.abs(hash) % happyMessages.length];
  }, [today]);

  const handleComplete = async () => {
    if (!currentChallenge || !user) return;

    if (currentChallenge.habitId) {
      await supabase.from('habit_completions').insert({
        user_id: user.id,
        habit_id: currentChallenge.habitId,
        completed_date: today,
      } as any);
    } else if (currentChallenge.taskId) {
      await supabase.from('tasks').update({ completed: true } as any)
        .eq('id', currentChallenge.taskId).eq('user_id', user.id);
    }

    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 1500);
  };

  if (habits.length === 0) return null;

  const hasAction = currentChallenge && (currentChallenge.habitId || currentChallenge.taskId);

  return (
    <>
      <div
        className="flex items-center gap-2 cursor-pointer min-w-0"
        onClick={() => setSheetOpen(true)}
      >
        <FalkoAvatar mood={mood} size="sm" />

        <div className="flex-1 min-w-0">
          <AnimatePresence mode="wait">
            {justCompleted ? (
              <motion.p
                key="done"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-xs font-medium text-primary truncate"
              >
                Falko freut sich!
              </motion.p>
            ) : allDone ? (
              <motion.p
                key="happy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs font-medium text-primary truncate"
              >
                {happyMessage}
              </motion.p>
            ) : currentChallenge ? (
              <motion.p
                key={currentChallenge.id}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-xs text-foreground truncate"
              >
                {currentChallenge.text}
              </motion.p>
            ) : null}
          </AnimatePresence>
        </div>

        {!allDone && hasAction && !justCompleted && (
          <motion.button
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            whileTap={{ scale: 0.85 }}
            onClick={(e) => { e.stopPropagation(); handleComplete(); }}
            className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
          >
            <Check className="w-3 h-3" strokeWidth={2.5} />
          </motion.button>
        )}
      </div>

      <TreeCoachSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        currentPct={pct}
        mood={mood}
        challenges={challenges}
        streakDays={streakDays}
      />
    </>
  );
}
