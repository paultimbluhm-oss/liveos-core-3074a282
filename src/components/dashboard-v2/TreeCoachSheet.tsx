import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { format, subDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { FalkoAvatar } from './falko/FalkoAvatar';
import { getMood, type FalkoChallenge, type FalkoMood } from './falko/challengeEngine';
import { Flame, Target } from 'lucide-react';

interface DayHistory {
  date: string;
  label: string;
  pct: number;
  mood: FalkoMood;
}

interface FriendFalko {
  userId: string;
  displayName: string;
  mood: FalkoMood;
  pct: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPct: number;
  mood: FalkoMood;
  challenges: FalkoChallenge[];
  streakDays: number;
}

const MOOD_LABELS: Record<FalkoMood, string> = {
  happy: 'Gluecklich',
  motivated: 'Motiviert',
  neutral: 'Entspannt',
  sad: 'Traurig',
};

export function TreeCoachSheet({ open, onOpenChange, currentPct, mood, challenges, streakDays }: Props) {
  const { user } = useAuth();
  const { profile } = useProfile();
  const [friends, setFriends] = useState<FriendFalko[]>([]);
  const [history, setHistory] = useState<DayHistory[]>([]);
  const today = format(new Date(), 'yyyy-MM-dd');

  useEffect(() => {
    if (!open || !user) return;

    const fetchFriends = async () => {
      const { data: friendships } = await supabase
        .from('friendships')
        .select('requester_id, addressee_id')
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

      if (!friendships || friendships.length === 0) { setFriends([]); return; }

      const friendIds = friendships.map(f =>
        f.requester_id === user.id ? f.addressee_id : f.requester_id
      );

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, display_name, username, streak_days')
        .in('user_id', friendIds);

      const result: FriendFalko[] = [];
      for (const fId of friendIds) {
        const [hRes, cRes] = await Promise.all([
          supabase.from('habits').select('id').eq('user_id', fId).eq('is_active', true),
          supabase.from('habit_completions').select('habit_id').eq('user_id', fId).eq('completed_date', today),
        ]);
        const total = hRes.data?.length || 0;
        const done = cRes.data?.length || 0;
        const pct = total > 0 ? done / total : 0;
        const prof = profiles?.find(p => p.user_id === fId);
        result.push({
          userId: fId,
          displayName: prof?.display_name || prof?.username || 'Freund',
          mood: getMood(pct, prof?.streak_days || 0),
          pct,
        });
      }
      setFriends(result);
    };

    const fetchHistory = async () => {
      const { data: habits } = await supabase
        .from('habits').select('id').eq('user_id', user.id).eq('is_active', true);
      const totalHabits = habits?.length || 0;
      if (totalHabits === 0) { setHistory([]); return; }

      const days: DayHistory[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = subDays(new Date(), i);
        const dateStr = format(d, 'yyyy-MM-dd');
        const label = i === 0 ? 'Heute' : format(d, 'EEE', { locale: de });
        const { data: comps } = await supabase
          .from('habit_completions').select('habit_id')
          .eq('user_id', user.id).eq('completed_date', dateStr);
        const uniqueDone = new Set(comps?.map(c => c.habit_id) || []).size;
        const pct = totalHabits > 0 ? uniqueDone / totalHabits : 0;
        days.push({ date: dateStr, label, pct, mood: getMood(pct, 0) });
      }
      setHistory(days);
    };

    fetchFriends();
    fetchHistory();
  }, [open, user, today]);

  const pctDisplay = Math.round(currentPct * 100);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle className="text-base font-semibold">Falko</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 pb-4">
          {/* Falko big avatar + status */}
          <div className="flex flex-col items-center gap-2">
            <FalkoAvatar mood={mood} size="lg" />
            <p className="text-sm font-medium">{MOOD_LABELS[mood]}</p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>{pctDisplay}% erledigt</span>
              {streakDays > 0 && (
                <span className="flex items-center gap-1">
                  <Flame className="w-3 h-3 text-orange-500" strokeWidth={1.5} />
                  {streakDays} Tage Streak
                </span>
              )}
            </div>
          </div>

          {/* Active challenges */}
          {challenges.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Heutige Challenges</p>
              <div className="space-y-2">
                {challenges.slice(0, 5).map(ch => (
                  <div key={ch.id} className="flex items-start gap-2 p-2 rounded-lg bg-muted/50">
                    <Target className="w-3.5 h-3.5 mt-0.5 text-primary shrink-0" strokeWidth={1.5} />
                    <p className="text-xs text-foreground">{ch.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 7-day history */}
          {history.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Letzte 7 Tage</p>
              <div className="flex items-end justify-between gap-1">
                {history.map((day) => (
                  <div key={day.date} className="flex flex-col items-center gap-1 flex-1">
                    <FalkoAvatar mood={day.mood} size="sm" />
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

          {/* Friends */}
          {friends.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">Falkos deiner Freunde</p>
              <div className="grid grid-cols-4 gap-3">
                <div className="flex flex-col items-center gap-1">
                  <FalkoAvatar mood={mood} size="md" />
                  <span className="text-[10px] font-medium truncate max-w-full">
                    {profile?.username || 'Du'}
                  </span>
                </div>
                {friends.map((f) => (
                  <div key={f.userId} className="flex flex-col items-center gap-1">
                    <FalkoAvatar mood={f.mood} size="md" />
                    <span className="text-[10px] text-muted-foreground truncate max-w-full">
                      {f.displayName}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {friends.length === 0 && (
            <div className="text-center py-3">
              <p className="text-xs text-muted-foreground">
                Fuege Freunde hinzu, um ihre Falkos zu sehen
              </p>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
