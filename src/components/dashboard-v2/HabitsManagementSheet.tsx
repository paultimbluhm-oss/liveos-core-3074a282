import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Habit {
  id: string;
  name: string;
  description: string | null;
  xp_reward: number;
  is_active: boolean;
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
  const [xpReward, setXpReward] = useState(5);

  const fetchHabits = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('habits')
      .select('id, name, description, xp_reward, is_active')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at');
    if (data) setHabits(data);
  };

  useEffect(() => {
    if (open && user) fetchHabits();
  }, [open, user]);

  const resetForm = () => {
    setName('');
    setDescription('');
    setXpReward(5);
    setEditingHabit(null);
    setDialogOpen(false);
  };

  const saveHabit = async () => {
    if (!name.trim() || !user) return;
    if (editingHabit) {
      await supabase.from('habits').update({ name, description: description || null, xp_reward: xpReward }).eq('id', editingHabit.id);
      toast.success('Habit aktualisiert');
    } else {
      await supabase.from('habits').insert({ user_id: user.id, name, description: description || null, xp_reward: xpReward });
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
    setXpReward(habit.xp_reward);
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
            habits.map(habit => (
              <div key={habit.id} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/50">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Check className="w-4 h-4 text-primary" strokeWidth={1.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{habit.name}</p>
                  {habit.description && (
                    <p className="text-xs text-muted-foreground truncate">{habit.description}</p>
                  )}
                </div>
                <span className="text-xs text-primary font-mono">+{habit.xp_reward} XP</span>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(habit)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteHabit(habit.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHabit ? 'Habit bearbeiten' : 'Neuer Habit'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z.B. Wasser trinken" />
              </div>
              <div>
                <Label>Beschreibung (optional)</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="z.B. 2L pro Tag" />
              </div>
              <div>
                <Label>XP Belohnung</Label>
                <Input type="number" value={xpReward} onChange={(e) => setXpReward(Number(e.target.value))} min={1} />
              </div>
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
