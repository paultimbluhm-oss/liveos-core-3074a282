import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { IconPicker } from './IconPicker';

interface HabitCreationWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}

interface HabitFormData {
  name: string;
  icon: string;
  habit_type: 'check' | 'count';
  identity_statement: string;
  when_trigger: string;
  where_location: string;
  habit_stacking: string;
  temptation_bundling: string;
  cue_creation: string;
  obstacles: string;
  obstacle_removal: string;
  environment_prep: string;
  fun_activity: string;
  positive_benefits: string;
  negative_consequences: string;
  reward: string;
}

const INITIAL_DATA: HabitFormData = {
  name: '',
  habit_type: 'check',
  identity_statement: '',
  when_trigger: '',
  where_location: '',
  habit_stacking: '',
  temptation_bundling: '',
  cue_creation: '',
  obstacles: '',
  obstacle_removal: '',
  environment_prep: '',
  fun_activity: '',
  positive_benefits: '',
  negative_consequences: '',
  reward: '',
};

const STEPS = [
  {
    title: 'Grundlagen',
    subtitle: 'Was moechtest du zur Gewohnheit machen?',
    fields: ['name', 'habit_type', 'identity_statement'] as const,
  },
  {
    title: 'Wann & Wo',
    subtitle: 'Mach es offensichtlich.',
    fields: ['when_trigger', 'where_location', 'habit_stacking'] as const,
  },
  {
    title: 'Attraktiv machen',
    subtitle: 'Verknuepfe es mit etwas, das du willst.',
    fields: ['temptation_bundling', 'cue_creation', 'fun_activity'] as const,
  },
  {
    title: 'Einfach machen',
    subtitle: 'Reduziere die Reibung auf unter 2 Minuten.',
    fields: ['obstacles', 'obstacle_removal', 'environment_prep'] as const,
  },
  {
    title: 'Belohnend machen',
    subtitle: 'Mach das Ergebnis befriedigend.',
    fields: ['positive_benefits', 'negative_consequences', 'reward'] as const,
  },
];

const FIELD_CONFIG: Record<string, { label: string; placeholder: string; type: 'input' | 'textarea' }> = {
  name: { label: 'Name des Habits', placeholder: 'z.B. Meditation, Lesen, Liegestuetze', type: 'input' },
  identity_statement: { label: 'Ich bin ein Mensch, der ...', placeholder: 'z.B. ...taeglich meditiert', type: 'input' },
  when_trigger: { label: 'Wann fuehre ich es aus?', placeholder: 'z.B. Nach dem Fruehstueck, um 7:00 Uhr', type: 'input' },
  where_location: { label: 'Wo fuehre ich es aus?', placeholder: 'z.B. Im Wohnzimmer, am Schreibtisch', type: 'input' },
  habit_stacking: { label: 'An welche bestehende Gewohnheit koppeln?', placeholder: 'z.B. Nachdem ich Kaffee gemacht habe, meditiere ich', type: 'textarea' },
  temptation_bundling: { label: 'Womit verknuepfe ich es, das mir Spass macht?', placeholder: 'z.B. Ich darf meinen Podcast nur beim Sport hoeren', type: 'textarea' },
  cue_creation: { label: 'Welche konkreten Reize schaffe ich?', placeholder: 'z.B. Yogamatte abends neben das Bett legen', type: 'textarea' },
  obstacles: { label: 'Was haelt mich davon ab?', placeholder: 'z.B. Muedigkeit, Zeitmangel, Ablenkung durch Handy', type: 'textarea' },
  obstacle_removal: { label: 'Wie entferne ich diese Hindernisse?', placeholder: 'z.B. Handy in anderen Raum legen, frueh ins Bett gehen', type: 'textarea' },
  environment_prep: { label: 'Wie bereite ich mein Umfeld vor?', placeholder: 'z.B. Sportkleidung abends bereitlegen, App oeffnen', type: 'textarea' },
  fun_activity: { label: 'Was mache ich davor oder danach, das mir Spass macht?', placeholder: 'z.B. Danach eine Folge meiner Lieblingsserie', type: 'textarea' },
  positive_benefits: { label: 'Welche Vorteile bringt mir das Habit?', placeholder: 'z.B. Mehr Energie, besserer Schlaf, klarerer Kopf', type: 'textarea' },
  negative_consequences: { label: 'Was passiert, wenn ich es nicht mache?', placeholder: 'z.B. Stress steigt, Gesundheit leidet', type: 'textarea' },
  reward: { label: 'Wie belohne ich mich danach?', placeholder: 'z.B. 5 Min Social Media, Lieblingssnack', type: 'input' },
};

export function HabitCreationWizard({ open, onOpenChange, onCreated }: HabitCreationWizardProps) {
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<HabitFormData>(INITIAL_DATA);
  const [saving, setSaving] = useState(false);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const isFirst = step === 0;

  const canProceed = () => {
    if (step === 0) return data.name.trim().length > 0 && data.identity_statement.trim().length > 0;
    return currentStep.fields.every(f => (data[f] as string).trim().length > 0);
  };

  const update = (field: keyof HabitFormData, value: string) => {
    setData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    if (!user || saving) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('habits').insert({
        user_id: user.id,
        name: data.name.trim(),
        habit_type: data.habit_type,
        identity_statement: data.identity_statement.trim(),
        when_trigger: data.when_trigger.trim(),
        where_location: data.where_location.trim(),
        habit_stacking: data.habit_stacking.trim(),
        temptation_bundling: data.temptation_bundling.trim(),
        cue_creation: data.cue_creation.trim(),
        obstacles: data.obstacles.trim(),
        obstacle_removal: data.obstacle_removal.trim(),
        environment_prep: data.environment_prep.trim(),
        fun_activity: data.fun_activity.trim(),
        positive_benefits: data.positive_benefits.trim(),
        negative_consequences: data.negative_consequences.trim(),
        reward: data.reward.trim(),
      } as any);
      if (error) throw error;
      toast.success('Habit erstellt');
      setData(INITIAL_DATA);
      setStep(0);
      onOpenChange(false);
      onCreated();
    } catch (e) {
      toast.error('Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  };

  const handleClose = (o: boolean) => {
    if (!o) { setData(INITIAL_DATA); setStep(0); }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
        {/* Progress bar */}
        <div className="flex gap-1 p-4 pb-0">
          {STEPS.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="p-5 pt-4 space-y-5">
          {/* Header */}
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
              Schritt {step + 1} von {STEPS.length}
            </p>
            <h3 className="text-lg font-semibold mt-1">{currentStep.title}</h3>
            <p className="text-sm text-muted-foreground">{currentStep.subtitle}</p>
          </div>

          {/* Fields */}
          <div className="space-y-4">
            {currentStep.fields.map(field => {
              if (field === 'habit_type') {
                return (
                  <div key={field} className="space-y-1.5">
                    <p className="text-sm font-medium">Typ</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => update('habit_type', 'check')}
                        className={`flex-1 p-3 rounded-xl border text-sm text-left transition-all ${data.habit_type === 'check' ? 'border-primary bg-primary/5 font-medium' : 'border-border/50 hover:border-border'}`}
                      >
                        Abhaken
                        <p className="text-[10px] text-muted-foreground mt-0.5">Einmal pro Tag</p>
                      </button>
                      <button
                        type="button"
                        onClick={() => update('habit_type', 'count')}
                        className={`flex-1 p-3 rounded-xl border text-sm text-left transition-all ${data.habit_type === 'count' ? 'border-primary bg-primary/5 font-medium' : 'border-border/50 hover:border-border'}`}
                      >
                        Anzahl
                        <p className="text-[10px] text-muted-foreground mt-0.5">z.B. Liegestuetze</p>
                      </button>
                    </div>
                  </div>
                );
              }

              const config = FIELD_CONFIG[field];
              if (!config) return null;

              return (
                <div key={field} className="space-y-1.5">
                  <p className="text-sm font-medium">{config.label}</p>
                  {config.type === 'textarea' ? (
                    <Textarea
                      value={data[field] as string}
                      onChange={e => update(field, e.target.value)}
                      placeholder={config.placeholder}
                      className="min-h-[60px] resize-none"
                    />
                  ) : (
                    <Input
                      value={data[field] as string}
                      onChange={e => update(field, e.target.value)}
                      placeholder={config.placeholder}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Navigation */}
          <div className="flex items-center gap-2 pt-1">
            {!isFirst && (
              <Button variant="outline" onClick={() => setStep(s => s - 1)} className="gap-1.5">
                <ChevronLeft className="w-3.5 h-3.5" /> Zurueck
              </Button>
            )}
            <div className="flex-1" />
            {isLast ? (
              <Button onClick={handleSave} disabled={!canProceed() || saving} className="gap-1.5">
                {saving ? 'Speichere...' : 'Habit erstellen'}
              </Button>
            ) : (
              <Button onClick={() => setStep(s => s + 1)} disabled={!canProceed()} className="gap-1.5">
                Weiter <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
