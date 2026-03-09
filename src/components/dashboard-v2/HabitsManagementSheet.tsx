import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Slider } from '@/components/ui/slider';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, Edit, Check, RotateCcw, GripVertical, Lock, Settings2 } from 'lucide-react';
import { icons } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { HabitCreationWizard } from './HabitCreationWizard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { format, subDays } from 'date-fns';

interface Habit {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  is_active: boolean;
  habit_type: string;
  lifetime_count?: number;
  priority_order: number;
  is_queued: boolean;
  consecutive_days?: number;
}

interface HabitsManagementSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SortableHabitItem({ habit, onEdit, onDelete }: { habit: Habit; onEdit: (h: Habit) => void; onDelete: (id: string) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: habit.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const count = habit.lifetime_count || 0;
  const progressPct = Math.min(count, 100);
  const adopted = count >= 100;
  const HabitIcon = icons[(habit.icon || 'Check') as keyof typeof icons] || icons.Check;

  return (
    <div ref={setNodeRef} style={style} className={`p-3 rounded-xl border ${habit.is_queued ? 'border-border/30 bg-muted/10 opacity-60' : adopted ? 'border-border/50 bg-success/5' : 'border-border/50 bg-muted/30'}`}>
      <div className="flex items-center gap-2">
        <button {...attributes} {...listeners} className="touch-none p-1 -ml-1 text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
          <GripVertical className="w-4 h-4" />
        </button>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${adopted ? 'bg-success/20' : habit.is_queued ? 'bg-muted/40' : 'bg-primary/10'}`}>
          <HabitIcon className={`w-3.5 h-3.5 ${adopted ? 'text-success' : habit.is_queued ? 'text-muted-foreground' : 'text-primary'}`} strokeWidth={1.5} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium truncate">{habit.name}</p>
            {habit.is_queued && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
          </div>
          {habit.description && (
            <p className="text-xs text-muted-foreground truncate">{habit.description}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => onEdit(habit)}>
          <Edit className="w-3.5 h-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={() => onDelete(habit.id)}>
          <Trash2 className="w-3.5 h-3.5" />
        </Button>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Progress value={progressPct} variant={adopted ? 'success' : 'default'} className="h-1.5 flex-1" />
        <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
          {count}/100 {adopted ? 'Angenommen' : habit.is_queued ? 'Warteschlange' : 'Tage'}
        </span>
      </div>
    </div>
  );
}

async function computeConsecutiveDays(userId: string, habitId: string): Promise<number> {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { data } = await supabase
    .from('habit_completions')
    .select('completed_date')
    .eq('user_id', userId)
    .eq('habit_id', habitId)
    .order('completed_date', { ascending: false })
    .limit(60);
  if (!data || data.length === 0) return 0;
  const dates = new Set(data.map(c => c.completed_date));
  let streak = 0;
  let startDay = dates.has(today) ? 0 : 1;
  for (let i = startDay; i < 60; i++) {
    const d = format(subDays(new Date(), i), 'yyyy-MM-dd');
    if (dates.has(d)) streak++;
    else break;
  }
  return streak;
}

export function HabitsManagementSheet({ open, onOpenChange }: HabitsManagementSheetProps) {
  const { user } = useAuth();
  const [habits, setHabits] = useState<Habit[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [createChoiceOpen, setCreateChoiceOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [habitType, setHabitType] = useState<'check' | 'count'>('check');
  const [manualDays, setManualDays] = useState<number | ''>('');
  const [maxActive, setMaxActive] = useState<number>(3);
  const [tempMaxActive, setTempMaxActive] = useState<number>(3);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchHabits = async () => {
    if (!user) return;
    const { data: rawData } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('priority_order')
      .order('created_at');
    const habitsData = (rawData as any[])?.map(h => ({
      ...h,
      habit_type: h.habit_type || 'check',
      priority_order: h.priority_order || 0,
      is_queued: h.is_queued || false,
    })) as Habit[] | null;

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

    // Compute consecutive days for active (non-queued) habits
    const withCounts = habitsData.map(h => ({ ...h, lifetime_count: counts[h.id] || 0 }));
    const activeHabits = withCounts.filter(h => !h.is_queued);
    const consecutivePromises = activeHabits.map(h => computeConsecutiveDays(user.id, h.id));
    const consecutiveResults = await Promise.all(consecutivePromises);
    const consecutiveMap: Record<string, number> = {};
    activeHabits.forEach((h, i) => { consecutiveMap[h.id] = consecutiveResults[i]; });

    const final = withCounts.map(h => ({ ...h, consecutive_days: consecutiveMap[h.id] || 0 }));
    setHabits(final);

    // Auto-promote: if any active habit has 14+ consecutive days, unlock next queued
    await autoPromote(final);
  };

  const autoPromote = async (habitsList: Habit[]) => {
    if (!user) return;
    const active = habitsList.filter(h => !h.is_queued);
    const queued = habitsList.filter(h => h.is_queued).sort((a, b) => a.priority_order - b.priority_order);
    
    if (queued.length === 0) return;

    const habitsReady = active.filter(h => (h.consecutive_days || 0) >= 14);
    if (habitsReady.length === 0) return;

    // Promote the first queued habit
    const toPromote = queued[0];
    await supabase.from('habits').update({ is_queued: false } as any).eq('id', toPromote.id);
    toast.success(`"${toPromote.name}" wurde freigeschaltet!`);
  };

  const loadSettings = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('dashboard_v2_config')
      .select('settings')
      .eq('user_id', user.id)
      .maybeSingle();
    if (data?.settings && typeof data.settings === 'object') {
      const s = data.settings as Record<string, any>;
      if (s.maxActiveHabits) {
        setMaxActive(s.maxActiveHabits);
        setTempMaxActive(s.maxActiveHabits);
      }
    }
  };

  const saveMaxActive = async () => {
    if (!user) return;
    setMaxActive(tempMaxActive);
    
    const { data: existing } = await supabase
      .from('dashboard_v2_config')
      .select('id, settings')
      .eq('user_id', user.id)
      .maybeSingle();

    const currentSettings = (existing?.settings && typeof existing.settings === 'object') ? existing.settings as Record<string, any> : {};
    const newSettings = { ...currentSettings, maxActiveHabits: tempMaxActive };

    if (existing) {
      await supabase.from('dashboard_v2_config').update({ settings: newSettings }).eq('id', existing.id);
    } else {
      await supabase.from('dashboard_v2_config').insert({ user_id: user.id, settings: newSettings } as any);
    }

    // Apply queue: top N by priority_order are active, rest queued
    await applyQueue(tempMaxActive);
    setSettingsOpen(false);
    toast.success('Einstellung gespeichert');
  };

  const applyQueue = async (max: number) => {
    if (!user || habits.length === 0) return;
    const sorted = [...habits].sort((a, b) => a.priority_order - b.priority_order);
    const updates = sorted.map((h, i) => ({
      id: h.id,
      shouldQueue: i >= max,
    }));

    for (const u of updates) {
      const habit = habits.find(h => h.id === u.id);
      if (habit && habit.is_queued !== u.shouldQueue) {
        await supabase.from('habits').update({ is_queued: u.shouldQueue } as any).eq('id', u.id);
      }
    }
    fetchHabits();
  };

  useEffect(() => {
    if (open && user) {
      loadSettings();
      fetchHabits();
    }
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
      // Simple creation
      const nextOrder = habits.length > 0 ? Math.max(...habits.map(h => h.priority_order)) + 1 : 0;
      const shouldQueue = habits.filter(h => !h.is_queued).length >= maxActive;
      await supabase.from('habits').insert({
        user_id: user.id,
        name,
        description: description || null,
        habit_type: habitType,
        priority_order: nextOrder,
        is_queued: shouldQueue,
      } as any);
      toast.success(shouldQueue ? 'Habit in Warteschlange' : 'Habit erstellt');
    }
    resetForm();
    fetchHabits();
  };

  const handleWizardCreated = async () => {
    if (!user) return;
    // After wizard creates, set priority_order and is_queued for the new habit
    const { data: latest } = await supabase
      .from('habits')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    if (latest && latest.length > 0) {
      const h = latest[0] as any;
      const nextOrder = habits.length > 0 ? Math.max(...habits.map(hb => hb.priority_order)) + 1 : 0;
      const activeCount = habits.filter(hb => !hb.is_queued).length;
      const shouldQueue = activeCount >= maxActive;
      await supabase.from('habits').update({
        priority_order: nextOrder,
        is_queued: shouldQueue,
      } as any).eq('id', h.id);
      if (shouldQueue) toast.info(`"${h.name}" in Warteschlange eingereiht`);
    }
    fetchHabits();
  };

  const deleteHabit = async (id: string) => {
    await supabase.from('habits').update({ is_active: false }).eq('id', id);
    toast.success('Habit entfernt');
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

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !user) return;

    const oldIndex = habits.findIndex(h => h.id === active.id);
    const newIndex = habits.findIndex(h => h.id === over.id);
    const reordered = arrayMove(habits, oldIndex, newIndex);

    // Update local state immediately
    setHabits(reordered);

    // Update priority_order and is_queued in DB
    for (let i = 0; i < reordered.length; i++) {
      const h = reordered[i];
      const shouldQueue = i >= maxActive;
      if (h.priority_order !== i || h.is_queued !== shouldQueue) {
        await supabase.from('habits').update({
          priority_order: i,
          is_queued: shouldQueue,
        } as any).eq('id', h.id);
      }
    }
    fetchHabits();
  };

  const activeHabits = habits.filter(h => !h.is_queued);
  const queuedHabits = habits.filter(h => h.is_queued);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader className="flex flex-row items-center justify-between pr-8">
          <SheetTitle>Habits verwalten</SheetTitle>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={() => { setTempMaxActive(maxActive); setSettingsOpen(true); }}>
              <Settings2 className="w-3.5 h-3.5" />
            </Button>
            <Button size="sm" onClick={() => setCreateChoiceOpen(true)}>
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Neu
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(85vh-120px)] pb-4">
          {habits.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              Noch keine Habits erstellt
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={habits.map(h => h.id)} strategy={verticalListSortingStrategy}>
                {/* Active habits */}
                {activeHabits.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                      Aktiv ({activeHabits.length}/{maxActive})
                    </p>
                    {activeHabits.map(habit => (
                      <SortableHabitItem key={habit.id} habit={habit} onEdit={openEdit} onDelete={deleteHabit} />
                    ))}
                  </div>
                )}

                {/* Queued habits */}
                {queuedHabits.length > 0 && (
                  <div className="space-y-2 mt-4">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
                      Warteschlange ({queuedHabits.length})
                    </p>
                    <p className="text-[10px] text-muted-foreground px-1">
                      Wird freigeschaltet, wenn ein aktives Habit 14 Tage am Stueck geschafft wurde
                    </p>
                    {queuedHabits.map(habit => (
                      <SortableHabitItem key={habit.id} habit={habit} onEdit={openEdit} onDelete={deleteHabit} />
                    ))}
                  </div>
                )}
              </SortableContext>
            </DndContext>
          )}
        </div>

        {/* Create choice dialog */}
        <Dialog open={createChoiceOpen} onOpenChange={setCreateChoiceOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Neues Habit erstellen</DialogTitle>
            </DialogHeader>
            <div className="space-y-2 mt-2">
              <button
                onClick={() => { setCreateChoiceOpen(false); setDialogOpen(true); }}
                className="w-full p-4 rounded-xl border border-border/50 text-left hover:bg-muted/30 transition-colors"
              >
                <p className="text-sm font-medium">Schnell</p>
                <p className="text-xs text-muted-foreground mt-0.5">Nur Name und Typ angeben</p>
              </button>
              <button
                onClick={() => { setCreateChoiceOpen(false); setWizardOpen(true); }}
                className="w-full p-4 rounded-xl border border-border/50 text-left hover:bg-muted/30 transition-colors"
              >
                <p className="text-sm font-medium">Ausfuehrlich</p>
                <p className="text-xs text-muted-foreground mt-0.5">5 Schritte mit Strategie & Planung</p>
              </button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Settings dialog */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Habit-Einstellungen</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div>
                <Label>Wie viele Habits gleichzeitig aktiv?</Label>
                <p className="text-xs text-muted-foreground mt-0.5 mb-2">
                  Uebrige Habits kommen in die Warteschlange
                </p>
              <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Slider
                      value={[tempMaxActive === 99 ? 10 : tempMaxActive]}
                      onValueChange={([v]) => setTempMaxActive(v)}
                      min={1}
                      max={10}
                      step={1}
                      className="flex-1"
                      disabled={tempMaxActive === 99}
                    />
                    <span className="text-sm font-semibold w-6 text-center tabular-nums">
                      {tempMaxActive === 99 ? '-' : tempMaxActive}
                    </span>
                  </div>
                  <button
                    onClick={() => setTempMaxActive(tempMaxActive === 99 ? 3 : 99)}
                    className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${
                      tempMaxActive === 99 ? 'bg-primary text-primary-foreground' : 'bg-muted/50 hover:bg-muted'
                    }`}
                  >
                    Alle
                  </button>
                </div>
              </div>
              <Button onClick={saveMaxActive} className="w-full">Speichern</Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Edit / Simple create dialog */}
        <Dialog open={dialogOpen} onOpenChange={(o) => { if (!o) resetForm(); setDialogOpen(o); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingHabit ? 'Habit bearbeiten' : 'Neues Habit'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {!editingHabit && (
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
              )}
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
        <HabitCreationWizard open={wizardOpen} onOpenChange={setWizardOpen} onCreated={handleWizardCreated} />
      </SheetContent>
    </Sheet>
  );
}
