import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface JournalEntry {
  // PERMA Model + additional science-backed factors
  mood_rating?: number | null;
  energy_level?: number | null;
  stress_level?: number | null;
  flow_experiences?: number | null;
  social_interactions?: number | null;
  quality_time_minutes?: number | null;
  connection_quality?: number | null;
  purpose_feeling?: number | null;
  helped_others?: boolean | null;
  accomplishment_feeling?: number | null;
  progress_made?: number | null;
  autonomy_feeling?: number | null;
  exercise_minutes?: number | null;
  gratitude_1?: string | null;
  gratitude_2?: string | null;
  gratitude_3?: string | null;
  best_moment?: string | null;
  notes?: string | null;
}

interface JournalEntryFormProps {
  initialData?: JournalEntry;
  onSave: (entry: JournalEntry) => void;
}

const ratingOptions = [
  { value: '1', label: 'Sehr niedrig' },
  { value: '2', label: 'Niedrig' },
  { value: '3', label: 'Mittel' },
  { value: '4', label: 'Hoch' },
  { value: '5', label: 'Sehr hoch' },
];

const stressOptions = [
  { value: '1', label: 'Minimal' },
  { value: '2', label: 'Wenig' },
  { value: '3', label: 'Moderat' },
  { value: '4', label: 'Hoch' },
  { value: '5', label: 'Sehr hoch' },
];

const flowOptions = [
  { value: '0', label: 'Keine' },
  { value: '1', label: '1x' },
  { value: '2', label: '2x' },
  { value: '3', label: '3+' },
];

const socialOptions = [
  { value: '0', label: '0' },
  { value: '1', label: '1' },
  { value: '2', label: '2' },
  { value: '3', label: '3' },
  { value: '5', label: '4-5' },
  { value: '10', label: '6+' },
];

const exerciseOptions = [
  { value: '0', label: '0 min' },
  { value: '15', label: '15 min' },
  { value: '30', label: '30 min' },
  { value: '45', label: '45 min' },
  { value: '60', label: '60 min' },
  { value: '90', label: '90+ min' },
];

const yesNoOptions = [
  { value: 'true', label: 'Ja' },
  { value: 'false', label: 'Nein' },
];

interface SectionProps {
  title: string;
  accentColor: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function FormSection({ title, accentColor, defaultOpen = false, children }: SectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-4 rounded-full ${accentColor}`} />
            <span className="text-sm font-medium">{title}</span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="pt-3 pb-1 px-1">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

export function JournalEntryForm({ initialData, onSave }: JournalEntryFormProps) {
  const [formData, setFormData] = useState<JournalEntry>(initialData || {});

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const updateField = (field: keyof JournalEntry, value: string | number | boolean | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const CompactSelect = ({ 
    label, 
    value, 
    onChange, 
    options 
  }: { 
    label: string; 
    value: string; 
    onChange: (v: string) => void; 
    options: { value: string; label: string }[] 
  }) => (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="-" />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {/* Emotionen - Always visible as primary section */}
      <FormSection title="Emotionen" accentColor="bg-cyan-500" defaultOpen={true}>
        <div className="grid grid-cols-3 gap-2">
          <CompactSelect
            label="Stimmung"
            value={formData.mood_rating?.toString() || ''}
            onChange={v => updateField('mood_rating', parseInt(v))}
            options={ratingOptions}
          />
          <CompactSelect
            label="Energie"
            value={formData.energy_level?.toString() || ''}
            onChange={v => updateField('energy_level', parseInt(v))}
            options={ratingOptions}
          />
          <CompactSelect
            label="Stress"
            value={formData.stress_level?.toString() || ''}
            onChange={v => updateField('stress_level', parseInt(v))}
            options={stressOptions}
          />
        </div>
      </FormSection>

      {/* Engagement & Flow */}
      <FormSection title="Engagement" accentColor="bg-amber-500">
        <div className="grid grid-cols-2 gap-2">
          <CompactSelect
            label="Flow-Momente"
            value={formData.flow_experiences?.toString() || ''}
            onChange={v => updateField('flow_experiences', parseInt(v))}
            options={flowOptions}
          />
          <CompactSelect
            label="Bewegung"
            value={formData.exercise_minutes?.toString() || ''}
            onChange={v => updateField('exercise_minutes', parseInt(v))}
            options={exerciseOptions}
          />
        </div>
      </FormSection>

      {/* Beziehungen */}
      <FormSection title="Beziehungen" accentColor="bg-emerald-500">
        <div className="grid grid-cols-2 gap-2">
          <CompactSelect
            label="Interaktionen"
            value={formData.social_interactions?.toString() || ''}
            onChange={v => updateField('social_interactions', parseInt(v))}
            options={socialOptions}
          />
          <CompactSelect
            label="Verbindungsqualität"
            value={formData.connection_quality?.toString() || ''}
            onChange={v => updateField('connection_quality', parseInt(v))}
            options={ratingOptions}
          />
        </div>
      </FormSection>

      {/* Sinn & Bedeutung */}
      <FormSection title="Sinn" accentColor="bg-rose-500">
        <div className="grid grid-cols-2 gap-2">
          <CompactSelect
            label="Sinn-Gefühl"
            value={formData.purpose_feeling?.toString() || ''}
            onChange={v => updateField('purpose_feeling', parseInt(v))}
            options={ratingOptions}
          />
          <CompactSelect
            label="Anderen geholfen?"
            value={formData.helped_others?.toString() || ''}
            onChange={v => updateField('helped_others', v === 'true')}
            options={yesNoOptions}
          />
        </div>
      </FormSection>

      {/* Erfolg & Autonomie */}
      <FormSection title="Erfolg" accentColor="bg-sky-500">
        <div className="grid grid-cols-2 gap-2">
          <CompactSelect
            label="Ziel-Fortschritt"
            value={formData.progress_made?.toString() || ''}
            onChange={v => updateField('progress_made', parseInt(v))}
            options={ratingOptions}
          />
          <CompactSelect
            label="Selbstbestimmtheit"
            value={formData.autonomy_feeling?.toString() || ''}
            onChange={v => updateField('autonomy_feeling', parseInt(v))}
            options={ratingOptions}
          />
        </div>
      </FormSection>

      {/* Dankbarkeit */}
      <FormSection title="Dankbarkeit" accentColor="bg-orange-500">
        <div className="space-y-2">
          <Input
            placeholder="1. Wofür bin ich dankbar?"
            value={formData.gratitude_1 || ''}
            onChange={e => updateField('gratitude_1', e.target.value)}
            className="h-8 text-xs"
          />
          <Input
            placeholder="2. Positiver Moment heute?"
            value={formData.gratitude_2 || ''}
            onChange={e => updateField('gratitude_2', e.target.value)}
            className="h-8 text-xs"
          />
          <Input
            placeholder="3. Worauf freue ich mich?"
            value={formData.gratitude_3 || ''}
            onChange={e => updateField('gratitude_3', e.target.value)}
            className="h-8 text-xs"
          />
        </div>
      </FormSection>

      {/* Best Moment & Notes */}
      <FormSection title="Notizen" accentColor="bg-zinc-500">
        <div className="space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Bester Moment</Label>
            <Input
              placeholder="Höhepunkt des Tages"
              value={formData.best_moment || ''}
              onChange={e => updateField('best_moment', e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Weitere Gedanken</Label>
            <Textarea
              placeholder="Optional..."
              value={formData.notes || ''}
              onChange={e => updateField('notes', e.target.value)}
              className="min-h-[50px] text-xs resize-none"
            />
          </div>
        </div>
      </FormSection>

      <Button type="submit" size="sm" className="w-full">
        Speichern
      </Button>
    </form>
  );
}
