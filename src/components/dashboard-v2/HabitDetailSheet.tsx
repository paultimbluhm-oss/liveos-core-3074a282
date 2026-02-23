import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Flame, Eye, EyeOff, Pencil } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';

interface HabitDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habitId: string | null;
}

interface HabitDetail {
  id: string;
  name: string;
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

export function HabitDetailSheet({ open, onOpenChange, habitId }: HabitDetailSheetProps) {
  const { user } = useAuth();
  const [habit, setHabit] = useState<HabitDetail | null>(null);
  const [lifetimeCount, setLifetimeCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [showMotivation, setShowMotivation] = useState(false);

  useEffect(() => {
    if (!open || !habitId || !user) return;
    setShowMotivation(false);

    const fetchHabit = async () => {
      const { data } = await supabase.from('habits').select('*').eq('id', habitId).single();
      if (data) setHabit(data as any);

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

  if (!habit) return null;

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
          <SheetTitle className="text-left">{habit.name}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-6 overflow-y-auto max-h-[calc(85vh-100px)] pb-8">
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

          {/* C) Motivation (nur auf Klick) */}
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

          {/* Fallback for old habits without data */}
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
