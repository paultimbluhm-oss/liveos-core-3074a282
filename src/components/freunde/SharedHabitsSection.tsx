import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Flame, Plus, Check, X, Link2 } from 'lucide-react';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

interface SharedHabit {
  id: string;
  habit_id: string;
  owner_id: string;
  friend_id: string;
  friend_habit_id: string | null;
  status: string;
  created_at: string;
  owner_habit_name?: string;
  friend_habit_name?: string;
  owner_streak?: number;
  friend_streak?: number;
  owner_display_name?: string;
  friend_display_name?: string;
}

interface Habit {
  id: string;
  name: string;
  icon: string | null;
}

interface Friend {
  user_id: string;
  display_name: string | null;
  username: string | null;
}

export function SharedHabitsSection({ friends }: { friends: Friend[] }) {
  const { user } = useAuth();
  const [sharedHabits, setSharedHabits] = useState<SharedHabit[]>([]);
  const [myHabits, setMyHabits] = useState<Habit[]>([]);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [linkingSharedHabit, setLinkingSharedHabit] = useState<SharedHabit | null>(null);
  const [selectedHabitId, setSelectedHabitId] = useState('');
  const [selectedFriendId, setSelectedFriendId] = useState('');

  const calculateStreak = useCallback(async (habitId: string, userId: string): Promise<number> => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const startDate = format(subDays(new Date(), 60), 'yyyy-MM-dd');
    
    const { data } = await supabase
      .from('habit_completions')
      .select('completed_date')
      .eq('habit_id', habitId)
      .eq('user_id', userId)
      .gte('completed_date', startDate)
      .lte('completed_date', today)
      .order('completed_date', { ascending: false });

    if (!data || data.length === 0) return 0;

    let streak = 0;
    const dateSet = new Set(data.map(d => d.completed_date));
    let checkDate = new Date();
    
    // Check if today is completed, if not start from yesterday
    if (!dateSet.has(format(checkDate, 'yyyy-MM-dd'))) {
      checkDate = subDays(checkDate, 1);
    }
    
    while (dateSet.has(format(checkDate, 'yyyy-MM-dd'))) {
      streak++;
      checkDate = subDays(checkDate, 1);
    }
    
    return streak;
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;

    // Fetch my habits
    const { data: habits } = await supabase
      .from('habits')
      .select('id, name, icon')
      .eq('user_id', user.id)
      .eq('is_active', true);
    if (habits) setMyHabits(habits);

    // Fetch shared habits
    const { data: shared } = await supabase
      .from('shared_habits')
      .select('*')
      .or(`owner_id.eq.${user.id},friend_id.eq.${user.id}`);

    if (shared && shared.length > 0) {
      // Enrich with habit names and streaks
      const enriched = await Promise.all(shared.map(async (sh) => {
        // Get owner habit name
        const { data: ownerHabit } = await supabase
          .from('habits')
          .select('name')
          .eq('id', sh.habit_id)
          .maybeSingle();

        // Get friend habit name if linked
        let friendHabitName: string | undefined;
        if (sh.friend_habit_id) {
          const { data: fh } = await supabase
            .from('habits')
            .select('name')
            .eq('id', sh.friend_habit_id)
            .maybeSingle();
          friendHabitName = fh?.name;
        }

        // Get display names
        const { data: ownerProfile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', sh.owner_id)
          .maybeSingle();
        const { data: friendProfile } = await supabase
          .from('profiles')
          .select('display_name, username')
          .eq('user_id', sh.friend_id)
          .maybeSingle();

        // Calculate streaks
        const ownerStreak = await calculateStreak(sh.habit_id, sh.owner_id);
        const friendStreak = sh.friend_habit_id 
          ? await calculateStreak(sh.friend_habit_id, sh.friend_id)
          : 0;

        return {
          ...sh,
          owner_habit_name: ownerHabit?.name,
          friend_habit_name: friendHabitName,
          owner_streak: ownerStreak,
          friend_streak: friendStreak,
          owner_display_name: ownerProfile?.display_name || ownerProfile?.username || 'Unbekannt',
          friend_display_name: friendProfile?.display_name || friendProfile?.username || 'Unbekannt',
        } as SharedHabit;
      }));
      setSharedHabits(enriched);
    } else {
      setSharedHabits([]);
    }
  }, [user, calculateStreak]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleShare = async () => {
    if (!user || !selectedHabitId || !selectedFriendId) return;

    const { error } = await supabase.from('shared_habits').insert({
      habit_id: selectedHabitId,
      owner_id: user.id,
      friend_id: selectedFriendId,
    });

    if (error) {
      if (error.code === '23505') toast.error('Bereits geteilt');
      else toast.error('Fehler beim Teilen');
      return;
    }

    toast.success('Habit-Einladung gesendet');
    setShowShareDialog(false);
    setSelectedHabitId('');
    setSelectedFriendId('');
    fetchData();
  };

  const handleAccept = async (sh: SharedHabit) => {
    // Open link dialog to select which of their own habits to link
    setLinkingSharedHabit(sh);
    setShowLinkDialog(true);
  };

  const handleLinkAndAccept = async () => {
    if (!linkingSharedHabit || !selectedHabitId) return;

    const { error } = await supabase
      .from('shared_habits')
      .update({ status: 'accepted', friend_habit_id: selectedHabitId })
      .eq('id', linkingSharedHabit.id);

    if (error) {
      toast.error('Fehler');
      return;
    }

    toast.success('Habit verknuepft');
    setShowLinkDialog(false);
    setLinkingSharedHabit(null);
    setSelectedHabitId('');
    fetchData();
  };

  const handleDecline = async (id: string) => {
    await supabase.from('shared_habits').update({ status: 'declined' }).eq('id', id);
    toast.success('Abgelehnt');
    fetchData();
  };

  const pendingInvites = sharedHabits.filter(sh => sh.status === 'pending' && sh.friend_id === user?.id);
  const activeShared = sharedHabits.filter(sh => sh.status === 'accepted');
  const sentPending = sharedHabits.filter(sh => sh.status === 'pending' && sh.owner_id === user?.id);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Gemeinsame Habits</span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1"
          onClick={() => setShowShareDialog(true)}
          disabled={friends.length === 0 || myHabits.length === 0}
        >
          <Plus className="w-3 h-3" />
          Teilen
        </Button>
      </div>

      {/* Pending invites */}
      {pendingInvites.map(sh => (
        <div key={sh.id} className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{sh.owner_display_name} moechte "{sh.owner_habit_name}" teilen</p>
              <p className="text-[10px] text-muted-foreground">Waehle dein eigenes Habit zum Verknuepfen</p>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-8 w-8 text-emerald-500" onClick={() => handleAccept(sh)}>
                <Check className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-400" onClick={() => handleDecline(sh.id)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ))}

      {/* Active shared habits */}
      {activeShared.length === 0 && pendingInvites.length === 0 && sentPending.length === 0 && (
        <div className="py-8 text-center">
          <Link2 className="w-10 h-10 mx-auto text-muted-foreground/20 mb-2" />
          <p className="text-xs text-muted-foreground">Noch keine geteilten Habits</p>
        </div>
      )}

      {activeShared.map(sh => {
        const isOwner = sh.owner_id === user?.id;
        const myName = isOwner ? sh.owner_display_name : sh.friend_display_name;
        const friendName = isOwner ? sh.friend_display_name : sh.owner_display_name;
        const myStreak = isOwner ? sh.owner_streak : sh.friend_streak;
        const friendStreak = isOwner ? sh.friend_streak : sh.owner_streak;
        const habitName = isOwner ? sh.owner_habit_name : sh.friend_habit_name;

        return (
          <div key={sh.id} className="rounded-xl bg-card border border-border p-3 space-y-2">
            <p className="text-sm font-medium">{habitName}</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Flame className={`w-4 h-4 ${(myStreak || 0) > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <span className="text-lg font-bold">{myStreak || 0}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Du</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-secondary/30">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <Flame className={`w-4 h-4 ${(friendStreak || 0) > 0 ? 'text-orange-500' : 'text-muted-foreground'}`} />
                  <span className="text-lg font-bold">{friendStreak || 0}</span>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">{friendName}</p>
              </div>
            </div>
          </div>
        );
      })}

      {/* Sent pending */}
      {sentPending.map(sh => (
        <div key={sh.id} className="rounded-xl bg-card border border-border/30 p-3 opacity-60">
          <p className="text-sm">"{sh.owner_habit_name}" an {sh.friend_display_name}</p>
          <p className="text-[10px] text-muted-foreground">Ausstehend</p>
        </div>
      ))}

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Habit teilen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Welches Habit?</p>
              <Select value={selectedHabitId} onValueChange={setSelectedHabitId}>
                <SelectTrigger><SelectValue placeholder="Habit waehlen" /></SelectTrigger>
                <SelectContent>
                  {myHabits.map(h => (
                    <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Mit wem?</p>
              <Select value={selectedFriendId} onValueChange={setSelectedFriendId}>
                <SelectTrigger><SelectValue placeholder="Freund waehlen" /></SelectTrigger>
                <SelectContent>
                  {friends.map(f => (
                    <SelectItem key={f.user_id} value={f.user_id}>
                      {f.display_name || f.username || 'Unbekannt'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleShare} disabled={!selectedHabitId || !selectedFriendId}>
              Einladung senden
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Link Habit Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eigenes Habit verknuepfen</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Waehle dein Habit, das mit "{linkingSharedHabit?.owner_habit_name}" verglichen werden soll.
            </p>
            <Select value={selectedHabitId} onValueChange={setSelectedHabitId}>
              <SelectTrigger><SelectValue placeholder="Dein Habit waehlen" /></SelectTrigger>
              <SelectContent>
                {myHabits.map(h => (
                  <SelectItem key={h.id} value={h.id}>{h.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={handleLinkAndAccept} disabled={!selectedHabitId}>
              Verknuepfen & annehmen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
