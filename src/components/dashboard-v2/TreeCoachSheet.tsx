import { useState, useEffect, useMemo } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion } from 'framer-motion';

const TREE_STAGES = [
  { emoji: '\u{1F331}', label: 'Setzling', minPct: 0 },
  { emoji: '\u{1FAB4}', label: 'Spross', minPct: 33 },
  { emoji: '\u{1F333}', label: 'Baum', minPct: 66 },
  { emoji: '\u{1F334}', label: 'Palme', minPct: 100 },
];

interface FriendTree {
  userId: string;
  displayName: string;
  stageIndex: number;
  pct: number;
}

interface DayHistory {
  date: string;
  label: string;
  pct: number;
  stageIndex: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPct: number;
  currentStageIndex: number;
}

function getStageIndex(pct: number): number {
  if (pct >= 1) return 3;
  if (pct >= 0.66) return 2;
  if (pct >= 0.33) return 1;
  return 0;
}

export function TreeCoachSheet({ open, onOpenChange, currentPct, currentStageIndex }: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [friendTrees, setFriendTrees] = useState<FriendTree[]>([]);
  const [history, setHistory] = useState<DayHistory[]>([]);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!open || !user) return;

    const fetchFriendTrees = async () => {
      // Get accepted friendships
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!friendships || friendships.length === 0) {
        setFriendTrees([]);
        return;
      }

      const friendIds = friendships.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      // Get friend profiles
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username')
        .in('user_id', friendIds);

      // Get friend habit counts + completions for today
      const trees: FriendTree[] = [];
      for (const fId of friendIds) {
        const [hRes, cRes] = await Promise.all([
          supabase.from('habits').select('id').eq('user_id', fId).eq('is_active', true),
          supabase.from('habit_completions').select('habit_id').eq('user_id', fId).eq('completed_date', today),
        ]);
        const total = hRes.data?.length || 0;
        const done = cRes.data?.length || 0;
        const pct = total > 0 ? done / total : 0;
        const prof = profiles?.find(p => p.user_id === fId);
        trees.push({
          userId: fId,
          displayName: prof?.display_name || prof?.username || 'Freund',
          stageIndex: getStageIndex(pct),
          pct,
        });
      }
      setFriendTrees(trees);
    };

    const fetchHistory = async () => {
      // Get habit history for last 7 days
      const days: DayHistory[] = [];
      const { data: habits } = await supabase
        .from('habits')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const totalHabits = habits?.length || 0;
      if (totalHabits === 0) {
        setHistory([]);
        return;
      }

      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const label = i === 0 ? 'Heute' : format(d, 'EEE', { locale: de });
        const { data: comps } = await supabase
          .from('habit_completions')
          .select('habit_id')
          .eq('user_id', user.id)
          .eq('completed_date', dateStr);

        const uniqueDone = new Set(comps?.map(c => c.habit_id) || []).size;
        const pct = totalHabits > 0 ? uniqueDone / totalHabits : 0;
        days.push({ date: dateStr, label, pct, stageIndex: getStageIndex(pct) });
      }
      setHistory(days);
    };

    fetchFriendTrees();
    fetchHistory();
  }, [open, user, today]);

  const nextStage = currentStageIndex < 3 ? TREE_STAGES[currentStageIndex + 1] : null;
  const currentStage = TREE_STAGES[currentStageIndex];
  const pctDisplay = Math.round(currentPct * 100);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base font-semibold">Dein Wald</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-4">
          {/* Own tree - large */}
          <div className="flex flex-col items-center gap-2">
            <motion.span
              key={currentStageIndex}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl leading-none"
            >
              {currentStage.emoji}
            </motion.span>
            <p className="text-sm font-medium">{currentStage.label}</p>
            <p className="text-xs text-muted-foreground">{pctDisplay}% erledigt</p>

            {/* Progress to next stage */}
            {nextStage && (
              <div className="w-full max-w-[200px] mt-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1">
                  <span>{currentStage.emoji}</span>
                  <span>{nextStage.emoji}</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{
                      width: `${Math.min(100, ((currentPct * 100) - currentStage.minPct) / (nextStage.minPct - currentStage.minPct) * 100)}%`
                    }}
                    transition={{ duration: 0.6, ease: 'easeOut' }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center mt-1">
                  Noch {nextStage.minPct - pctDisplay}% bis {nextStage.label}
                </p>
              </div>
            )}
            {!nextStage && (
              <p className="text-xs text-primary font-medium">Maximale Stufe erreicht</p>
            )}
          </div>

          {/* 7-day history */}
          {history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Letzte 7 Tage</p>
              <div className="flex items-end justify-between gap-1">
                {history.map((day) => (
                  <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                    <span className="text-lg leading-none">
                      {TREE_STAGES[day.stageIndex].emoji}
                    </span>
                    <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${Math.round(day.pct * 100)}%` }}
                      />
                    </div>
                    <span className="text-[9px] text-muted-foreground">{day.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Friends' forest */}
          {friendTrees.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Wald deiner Freunde</p>
              <div className="grid grid-cols-4 gap-3">
                {/* Own tree in forest */}
                <div className="flex flex-col items-center gap-1">
                  <span className="text-2xl leading-none">{currentStage.emoji}</span>
                  <span className="text-[10px] font-medium truncate max-w-full">
                    {profile?.display_name || 'Du'}
                  </span>
                </div>
                {friendTrees.map((ft) => (
                  <div key={ft.userId} className="flex flex-col items-center gap-1">
                    <span className="text-2xl leading-none">
                      {TREE_STAGES[ft.stageIndex].emoji}
                    </span>
                    <span className="text-[10px] text-muted-foreground truncate max-w-full">
                      {ft.displayName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {friendTrees.length === 0 && (
            <div className="text-center py-3">
              <p className="text-xs text-muted-foreground">
                Fuege Freunde hinzu, um einen gemeinsamen Wald zu pflanzen
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
