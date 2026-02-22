import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Check, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Habit {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  habit_type: string;
  lifetime_count?: number;
}

interface HabitsManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HabitsManagementSheet({ open, onOpenChange }: HabitsManagementSheetProps) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [habitType, setHabitType] = useState<'check' | 'count'>('check');
  const [manualDays, setManualDays] = useState<number | ''>('');

  const fetchHabits = async () => {
    if (!user) return;
    const { data: habitsData } = await supabase
      .from('habits')
      .select('id, name, description, is_active, habit_type')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at') as { data: Habit[] | null };

    if (!habitsData) return;

    const habitIds = habitsData.map(h => h.id);
    const counts: Record<string, number> = {};

    if (habitIds.length > 0) {
      const { data: completions } = await supabase
        .from('habit_completions')
        .select('habit_id')
        .eq('user_id', user.id)
        .in('habit_id', habitIds);

      if (completions) {
        completions.forEach(c => { counts[c.habit_id] = (counts[c.habit_id] || 0) + 1; });
      }
    }

    setHabits(habitsData.map(h => ({ ...h, lifetime_count: counts[h.id] || 0 })));
  };

  useEffect(() => {
    if (open && user) fetchHabits();
  }, [open, user]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setHabitType('check');
    setManualDays('');
    setEditingHabit(null);
    setDialogOpen(false);
  };

  const saveHabit = async () => {
    if (!name.trim() || !user) return;

    if (editingHabit) {
      await supabase.from('habits').update({ name, description: description || null }).eq('id', editingHabit.id);

      if (manualDays !== '' && manualDays !== editingHabit.lifetime_count) {
        const targetDays = Number(manualDays);
        const currentDays = editingHabit.lifetime_count || 0;

        if (targetDays === 0) {
          await supabase.from('habit_completions').delete().eq('habit_id', editingHabit.id).eq('user_id', user.id);
        } else if (targetDays < currentDays) {
          const { data: allCompletions } = await supabase
            .from('habit_completions')
            .select('id, completed_date')
            .eq('habit_id', editingHabit.id)
            .eq('user_id', user.id)
            .order('completed_date', { ascending: true });

          if (allCompletions) {
            const toDelete = allCompletions.slice(0, currentDays - targetDays);
            if (toDelete.length > 0) {
              await supabase.from('habit_completions').delete().in('id', toDelete.map(c => c.id));
            }
          }
        } else if (targetDays > currentDays) {
          const toAdd = targetDays - currentDays;
          const inserts = [];
          for (let i = 0; i < toAdd; i++) {
            const d = new Date();
            d.setDate(d.getDate() - (currentDays + i + 1));
            inserts.push({
              user_id: user.id,
              habit_id: editingHabit.id,
              completed_date: d.toISOString().split('T')[0],
            });
          }
          await supabase.from('habit_completions').insert(inserts);
        }
      }

      toast.success('Habit aktualisiert');
    } else {
      await supabase.from('habits').insert({ user_id: user.id, name, description: description || null, habit_type: habitType });
      toast.success('Habit erstellt');
    }
    resetForm();
    fetchHabits();
  };

  const deleteHabit = async (id: string) => {
    await supabase.from('habits').update({ is_active: false }).eq('id', id);
    toast.success('Habit geloescht');
    fetchHabits();
  };

  const openEdit = (habit: Habit) => {
    setEditingHabit(habit);
    setName(habit.name);
    setDescription(habit.description || '');
    setHabitType((habit.habit_type || 'check') as 'check' | 'count');
    setManualDays(habit.lifetime_count || 0);
    setDialogOpen(true);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="flex flex-row items-center justify-between pr-8">
          <SheetTitle>Habits verwalten</SheetTitle>
          <Button size="sm" onClick={() => { resetForm(); setDialogOpen(true); }}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Neu
          </Button>
        </SheetHeader>

        <div className="mt-4 space-y-2 overflow-y-auto max-h-[calc(85vh-120px)]">
          {habits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Noch keine Habits erstellt
            </div>
          ) : (
            habits.map(habit => {
              const count = habit.lifetime_count || 0;
              const progressPct = Math.min(count, 100);
              const adopted = count >= 100;

              return (
                <div key={habit.id} className={`p-3 rounded-xl border border-border/50 ${adopted ? 'bg-success/5' : 'bg-muted/30'}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${adopted ? 'bg-success/20' : 'bg-primary/10'}`}>
                      <Check className={`w-4 h-4 ${adopted ? 'text-success' : 'text-primary'}`} strokeWidth={1.5} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{habit.name}</p>
                      {habit.description && (
                        <p className="text-xs text-muted-foreground truncate">{habit.description}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => openEdit(habit)}>
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive shrink-0" onClick={() => deleteHabit(habit.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <Progress value={progressPct} variant={adopted ? 'success' : 'default'} className="h-1.5 flex-1" />
                    <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                      {count}/100 {adopted ? 'Angenommen' : 'Tage'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHabit ? 'Habit bearbeiten' : 'Neuer Habit'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Typ</Label>
                <div className="flex gap-2 mt-1.5">
                  <button
                    type="button"
                    onClick={() => setHabitType('check')}
                    className={`flex-1 p-3 rounded-xl border text-sm text-left transition-all ${habitType === 'check' ? 'border-primary bg-primary/5 font-medium' : 'border-border/50 hover:border-border'}`}
                  >
                    Abhaken
                    <p className="text-[10px] text-muted-foreground mt-0.5">Einmal pro Tag</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitType('count')}
                    className={`flex-1 p-3 rounded-xl border text-sm text-left transition-all ${habitType === 'count' ? 'border-primary bg-primary/5 font-medium' : 'border-border/50 hover:border-border'}`}
                  >
                    Anzahl
                    <p className="text-[10px] text-muted-foreground mt-0.5">z.B. Liegestuetze</p>
                  </button>
                </div>
              </div>
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={habitType === 'count' ? 'z.B. Liegestuetze' : 'z.B. Wasser trinken'} />
              </div>
              <div>
                <Label>Beschreibung (optional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="z.B. 2L pro Tag" />
              </div>
              {editingHabit && (
                <div>
                  <Label>Abgeschlossene Tage</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={manualDays}
                      onChange={(e) => setManualDays(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                      min={0}
                      max={999}
                      className="flex-1"
                    />
                    <Button type="button" variant="outline" size="icon" className="shrink-0" onClick={() => setManualDays(0)} title="Auf Null setzen">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Aktuell: {editingHabit.lifetime_count || 0} Tage
                  </p>
                </div>
              )}
              <Button onClick={saveHabit} className="w-full">
                {editingHabit ? 'Speichern' : 'Erstellen'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </SheetContent>
    </Sheet>
  );
}
