import { useState, useEffect, useMemo } from 'react';
import { Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { TreeCoachSheet } from './TreeCoachSheet';

interface Habit {
  id: string;
  name: string;
  habit_type: string;
}

interface Completion {
  habit_id: string;
  value: number | null;
}

const TREE_STAGES = [
  { emoji: '\u{1F331}', label: 'Setzling' },    // seedling
  { emoji: '\u{1FAB4}', label: 'Spross' },       // potted plant
  { emoji: '\u{1F333}', label: 'Baum' },          // deciduous tree
  { emoji: '\u{1F334}', label: 'Palme' },         // palm tree (bonus)
];

const PROMPTS_CHECK = [
  (name: string) => `Mach jetzt ${name}!`,
  (name: string) => `Zeit fuer ${name}.`,
  (name: string) => `${name} steht noch aus.`,
  (name: string) => `Wie waer's mit ${name}?`,
];

const PROMPTS_COUNT = [
  (name: string, n: number) => `Mach ${n}x ${name}!`,
  (name: string, n: number) => `Noch ${n} ${name} heute.`,
  (name: string, n: number) => `${n}x ${name} packen wir!`,
];

const HAPPY_MESSAGES = [
  'Alles erledigt, top!',
  'Perfekter Tag!',
  'Stark, alles geschafft!',
  'Weiter so!',
];

function getStableRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function TreeCoach() {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completions, setCompletions] = useState<Completion[]>([]);
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [justCompleted, setJustCompleted] = useState(false);
  const today = format(new Date(), 'yyyy-MM-dd');

  const fetchData = async () => {
    if (!user) return;
    const [hRes, cRes] = await Promise.all([
      supabase.from('habits').select('id, name, habit_type').eq('user_id', user.id).eq('is_active', true),
      supabase.from('habit_completions').select('habit_id, value').eq('user_id', user.id).eq('completed_date', today),
    ]);
    if (hRes.data) setHabits(hRes.data.map((h: any) => ({ id: h.id, name: h.name, habit_type: h.habit_type || 'check' })));
    if (cRes.data) {
      setCompletions(cRes.data as Completion[]);
      setCompletedIds(new Set(cRes.data.map((c: any) => c.habit_id)));
    }
  };

  useEffect(() => { if (user) fetchData(); }, [user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('tree-coach-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'habits' }, fetchData)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  const incompleteHabits = useMemo(
    () => habits.filter(h => !completedIds.has(h.id)),
    [habits, completedIds]
  );

  const total = habits.length;
  const doneCount = habits.filter(h => completedIds.has(h.id)).length;
  const pct = total > 0 ? doneCount / total : 0;
  const allDone = total > 0 && doneCount === total;

  // Tree stage based on completion percentage
  const stageIndex = allDone ? 3 : pct >= 0.66 ? 2 : pct >= 0.33 ? 1 : 0;
  const tree = TREE_STAGES[stageIndex];

  // Pick a stable suggestion for this session (changes when completions change)
  const suggestion = useMemo(() => {
    if (incompleteHabits.length === 0) return null;
    const seed = today + doneCount;
    const idx = getStableRandom(String(seed)) % incompleteHabits.length;
    return incompleteHabits[idx];
  }, [incompleteHabits, doneCount, today]);

  const suggestionText = useMemo(() => {
    if (!suggestion) return '';
    const seed = getStableRandom(today + suggestion.id);
    if (suggestion.habit_type === 'count') {
      const targets = [2, 3, 5, 10];
      const target = targets[seed % targets.length];
      const prompt = PROMPTS_COUNT[seed % PROMPTS_COUNT.length];
      return prompt(suggestion.name, target);
    }
    const prompt = PROMPTS_CHECK[seed % PROMPTS_CHECK.length];
    return prompt(suggestion.name);
  }, [suggestion, today]);

  const happyMessage = useMemo(() => {
    const seed = getStableRandom(today);
    return HAPPY_MESSAGES[seed % HAPPY_MESSAGES.length];
  }, [today]);

  const handleComplete = async () => {
    if (!suggestion || !user) return;
    if (suggestion.habit_type === 'count') {
      const seed = getStableRandom(today + suggestion.id);
      const targets = [2, 3, 5, 10];
      const target = targets[seed % targets.length];
      const existing = completions.find(c => c.habit_id === suggestion.id);
      if (existing) {
        await (supabase.from('habit_completions').update({ value: (existing.value || 0) + target } as any)
          .eq('habit_id', suggestion.id).eq('completed_date', today).eq('user_id', user.id));
      } else {
        await supabase.from('habit_completions').insert({ user_id: user.id, habit_id: suggestion.id, completed_date: today, value: target } as any);
      }
    } else {
      await supabase.from('habit_completions').insert({ user_id: user.id, habit_id: suggestion.id, completed_date: today } as any);
    }
    setJustCompleted(true);
    setTimeout(() => setJustCompleted(false), 1500);
  };

  if (habits.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-card border border-border/50"
    >
      {/* Tree */}
      <motion.span
        key={stageIndex}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-2xl shrink-0 leading-none"
      >
        {tree.emoji}
      </motion.span>

      {/* Message */}
      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          {justCompleted ? (
            <motion.p
              key="done"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-xs font-medium text-success truncate"
            >
              Super, danke!
            </motion.p>
          ) : allDone ? (
            <motion.p
              key="happy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-medium text-success truncate"
            >
              {happyMessage}
            </motion.p>
          ) : (
            <motion.p
              key={suggestion?.id || 'none'}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="text-xs text-foreground truncate"
            >
              {suggestionText}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Action button */}
      {!allDone && suggestion && !justCompleted && (
        <motion.button
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.85 }}
          onClick={handleComplete}
          className="shrink-0 w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center hover:bg-primary/20 transition-colors"
        >
          <Check className="w-3.5 h-3.5" strokeWidth={2} />
        </motion.button>
      )}
    </motion.div>
  );
}
