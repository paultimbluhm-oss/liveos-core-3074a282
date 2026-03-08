import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Flame, Eye, EyeOff, Pencil, X as XIcon } from 'lucide-react';
import { icons } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { IconPicker } from './IconPicker';

interface HabitDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitId: string | null;
  onUpdated?: () => void;
}

interface HabitDetail {
  id: string;
  name: string;
  icon: string | null;
  habit_type: string;
  identity_statement: string | null;
  when_trigger: string | null;
  where_location: string | null;
  habit_stacking: string | null;
  temptation_bundling: string | null;
  cue_creation: string | null;
  obstacles: string | null;
  obstacle_removal: string | null;
  environment_prep: string | null;
  fun_activity: string | null;
  positive_benefits: string | null;
  negative_consequences: string | null;
  reward: string | null;
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

export function HabitDetailSheet({ open, onOpenChange, habitId, onUpdated }: HabitDetailSheetProps) {
  const { user } = useAuth();
  const [habit, setHabit] = useState<HabitDetail | null>(null);
  const [lifetimeCount, setLifetimeCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showMotivation, setShowMotivation] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('Check');

  useEffect(() => {
    if (!open || !habitId || !user) return;
    setShowMotivation(false);
    setEditing(false);

    const fetchHabit = async () => {
      const { data } = await supabase.from('habits').select('*').eq('id', habitId).single();
      if (data) {
        setHabit(data as any);
        setEditName((data as any).name);
        setEditIcon((data as any).icon || 'Check');
      }

      const { data: completions } = await supabase
        .from('habit_completions')
        .select('completed_date')
        .eq('habit_id', habitId)
        .eq('user_id', user.id);

      if (completions) {
        setLifetimeCount(completions.length);

        const dates = new Set(completions.map(c => c.completed_date));
        const today = format(new Date(), 'yyyy-MM-dd');
        let s = 0;
        const startDate = dates.has(today) ? 0 : 1;
        const startCheck = format(subDays(new Date(), startDate), 'yyyy-MM-dd');
        if (dates.has(startCheck)) {
          s = 1;
          let day = startDate + 1;
          while (dates.has(format(subDays(new Date(), day), 'yyyy-MM-dd'))) { s++; day++; }
        }
        setStreak(s);
      }
    };

    fetchHabit();
  }, [open, habitId, user]);

  const saveEdit = async () => {
    if (!habit || !editName.trim()) return;
    const { error } = await supabase.from('habits').update({ 
      name: editName.trim(), 
      icon: editIcon 
    } as any).eq('id', habit.id);
    if (error) {
      toast.error('Fehler beim Speichern');
      return;
    }
    setHabit(prev => prev ? { ...prev, name: editName.trim(), icon: editIcon } : prev);
    setEditing(false);
    onUpdated?.();
    toast.success('Habit aktualisiert');
  };

  if (!habit) return null;

  const HabitIcon = icons[(habit.icon || 'Check') as keyof typeof icons] || icons.Check;
  const pct = Math.min(lifetimeCount, 100);
  const adopted = lifetimeCount >= 100;
  const hasImplementation = habit.when_trigger || habit.where_location || habit.habit_stacking ||
    habit.temptation_bundling || habit.cue_creation || habit.obstacles ||
    habit.obstacle_removal || habit.environment_prep || habit.fun_activity;
  const hasMotivation = habit.positive_benefits || habit.negative_consequences || habit.reward;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
        <SheetHeader>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <HabitIcon className="w-4.5 h-4.5 text-primary" strokeWidth={1.5} />
            </div>
            <SheetTitle className="text-left flex-1">{habit.name}</SheetTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 shrink-0"
              onClick={() => setEditing(!editing)}
            >
              {editing ? <XIcon className="w-4 h-4" /> : <Pencil className="w-4 h-4" />}
            </Button>
          </div>
        </SheetHeader>

        <div className="mt-4 space-y-6 overflow-y-auto max-h-[calc(85vh-100px)] pb-8">
          {/* Edit mode */}
          {editing && (
            <section className="space-y-3 p-4 rounded-xl border border-border bg-muted/30">
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</p>
                <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Icon</p>
                <IconPicker value={editIcon} onChange={setEditIcon} />
              </div>
              <Button size="sm" onClick={saveEdit} disabled={!editName.trim()} className="w-full h-8 text-xs">
                Speichern
              </Button>
            </section>
          )}

          {/* A) Identitaet & Fortschritt */}
          <section className="space-y-3">
            {habit.identity_statement && (
              <p className="text-base italic text-foreground/80">
                &bdquo;Ich bin ein Mensch, der {habit.identity_statement}&ldquo;
              </p>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{pct}%</span>
                <div className="flex items-center gap-1.5">
                  {streak > 0 && (
                    <>
                      <Flame className="w-4 h-4 text-orange-500" />
                      <span className="text-sm font-semibold text-orange-500">{streak} Tage</span>
                    </>
                  )}
                </div>
              </div>
              <Progress value={pct} variant={adopted ? 'success' : 'default'} className="h-2" />
              <p className="text-[11px] text-muted-foreground">
                {adopted ? 'Angenommen' : `${lifetimeCount} von 100 Tagen bis zur festen Gewohnheit`}
              </p>
            </div>
          </section>

          {/* B) Umsetzung */}
          {hasImplementation && (
            <section className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Umsetzung</h4>
              <div className="space-y-3 bg-muted/30 rounded-xl p-4">
                <InfoRow label="Wann" value={habit.when_trigger} />
                <InfoRow label="Wo" value={habit.where_location} />
                <InfoRow label="Gekoppelt an" value={habit.habit_stacking} />
                <InfoRow label="Verknuepft mit" value={habit.temptation_bundling} />
                <InfoRow label="Ausloeser / Reize" value={habit.cue_creation} />
                <InfoRow label="Hindernisse" value={habit.obstacles} />
                <InfoRow label="Hindernisse entfernen" value={habit.obstacle_removal} />
                <InfoRow label="Umfeld vorbereiten" value={habit.environment_prep} />
                <InfoRow label="Spass davor/danach" value={habit.fun_activity} />
              </div>
            </section>
          )}

          {/* C) Motivation */}
          {hasMotivation && (
            <section className="space-y-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowMotivation(!showMotivation)}
                className="gap-2 text-muted-foreground hover:text-foreground -ml-2"
              >
                {showMotivation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                Motivation {showMotivation ? 'ausblenden' : 'anzeigen'}
              </Button>

              {showMotivation && (
                <div className="space-y-3 bg-muted/30 rounded-xl p-4">
                  <InfoRow label="Vorteile" value={habit.positive_benefits} />
                  <InfoRow label="Nachteile bei Nicht-Ausfuehrung" value={habit.negative_consequences} />
                  <InfoRow label="Belohnung" value={habit.reward} />
                </div>
              )}
            </section>
          )}

          {!hasImplementation && !habit.identity_statement && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Dieses Habit wurde ohne Atomic-Habits-Details erstellt.
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
