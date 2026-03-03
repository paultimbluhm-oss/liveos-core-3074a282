import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Flame, Trash2 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

interface FriendProfile {
  user_id: string;
  username: string | null;
  display_name?: string | null;
  streak_days: number | null;
}

interface SharedHabitInfo {
  habit_name: string;
  my_streak: number;
  friend_streak: number;
}

interface OpenLoan {
  id: string;
  loan_type: string;
  person_name: string;
  amount: number;
  currency: string;
  date: string;
}

interface Props {
  friend: FriendProfile | null;
  friendshipId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemove: (friendshipId: string) => void;
}

export function FriendDetailSheet({ friend, friendshipId, open, onOpenChange, onRemove }: Props) {
  const { user } = useAuth();
  const [sharedHabits, setSharedHabits] = useState<SharedHabitInfo[]>([]);
  const [openLoans, setOpenLoans] = useState<OpenLoan[]>([]);

  useEffect(() => {
    if (!open || !friend || !user) return;

    const fetchDetails = async () => {
      // Fetch shared habits
      const { data: shared } = await supabase
        .from('shared_habits')
        .select('*')
        .eq('status', 'accepted')
        .or(`and(owner_id.eq.${user.id},friend_id.eq.${friend.user_id}),and(owner_id.eq.${friend.user_id},friend_id.eq.${user.id})`);

      if (shared && shared.length > 0) {
        const enriched = await Promise.all(shared.map(async (sh) => {
          const { data: ownerHabit } = await supabase.from('habits').select('name').eq('id', sh.habit_id).maybeSingle();
          
          // Calculate streaks
          const calcStreak = async (habitId: string, userId: string) => {
            const today = format(new Date(), 'yyyy-MM-dd');
            const { data } = await supabase
              .from('habit_completions')
              .select('completed_date')
              .eq('habit_id', habitId)
              .eq('user_id', userId)
              .gte('completed_date', format(subDays(new Date(), 60), 'yyyy-MM-dd'))
              .lte('completed_date', today)
              .order('completed_date', { ascending: false });
            
            if (!data?.length) return 0;
            let streak = 0;
            const dateSet = new Set(data.map(d => d.completed_date));
            let checkDate = new Date();
            if (!dateSet.has(format(checkDate, 'yyyy-MM-dd'))) checkDate = subDays(checkDate, 1);
            while (dateSet.has(format(checkDate, 'yyyy-MM-dd'))) { streak++; checkDate = subDays(checkDate, 1); }
            return streak;
          };

          const isOwner = sh.owner_id === user.id;
          const myHabitId = isOwner ? sh.habit_id : sh.friend_habit_id;
          const friendHabitId = isOwner ? sh.friend_habit_id : sh.habit_id;
          
          return {
            habit_name: ownerHabit?.name || 'Unbekannt',
            my_streak: myHabitId ? await calcStreak(myHabitId, user.id) : 0,
            friend_streak: friendHabitId ? await calcStreak(friendHabitId, friend.user_id) : 0,
          };
        }));
        setSharedHabits(enriched);
      } else {
        setSharedHabits([]);
      }

      // Fetch loans linked to this friend
      const { data: loans } = await supabase
        .from('v2_loans')
        .select('id, loan_type, person_name, amount, currency, date')
        .eq('user_id', user.id)
        .eq('friend_user_id', friend.user_id)
        .eq('is_settled', false);
      
      setOpenLoans((loans as OpenLoan[]) || []);
    };

    fetchDetails();
  }, [open, friend, user]);

  if (!friend) return null;

  const initial = (friend.display_name || friend.username || '?')[0].toUpperCase();

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl max-h-[85vh] overflow-y-auto">
        <SheetHeader className="text-left pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg">
              {initial}
            </div>
            <div>
              <SheetTitle>{friend.display_name || friend.username || 'Unbekannt'}</SheetTitle>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Flame className="w-3 h-3 text-orange-500" />
                <span>{friend.streak_days || 0} Tage Streak</span>
              </div>
            </div>
          </div>
        </SheetHeader>

        <div className="space-y-4">
          {/* Shared Habits */}
          {sharedHabits.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gemeinsame Habits</p>
              {sharedHabits.map((sh, i) => (
                <div key={i} className="rounded-xl bg-secondary/30 p-3">
                  <p className="text-sm font-medium mb-2">{sh.habit_name}</p>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <Flame className={`w-3.5 h-3.5 ${sh.my_streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                        <span className="font-bold">{sh.my_streak}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Du</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1">
                        <Flame className={`w-3.5 h-3.5 ${sh.friend_streak > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                        <span className="font-bold">{sh.friend_streak}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">{friend.display_name || friend.username}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Open Loans */}
          {openLoans.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Offene Betraege</p>
              {openLoans.map(loan => (
                <div key={loan.id} className="rounded-xl bg-secondary/30 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {loan.loan_type === 'lent' ? 'Verliehen' : 'Geliehen'}
                    </p>
                    <p className="text-[10px] text-muted-foreground">{loan.date}</p>
                  </div>
                  <span className={`font-semibold text-sm ${loan.loan_type === 'lent' ? 'text-amber-500' : 'text-violet-500'}`}>
                    {loan.amount.toLocaleString('de-DE', { style: 'currency', currency: loan.currency })}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Remove Friend */}
          {friendshipId && (
            <Button
              variant="ghost"
              className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-2"
              onClick={() => {
                onRemove(friendshipId);
                onOpenChange(false);
              }}
            >
              <Trash2 className="w-4 h-4" />
              Freund entfernen
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
