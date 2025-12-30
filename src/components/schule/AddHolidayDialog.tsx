import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palmtree } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface AddHolidayDialogProps {
  onHolidayAdded: () => void;
}

const HOLIDAY_PRESETS = [
  { name: 'Zeugnisferien', days: 1 },
  { name: 'Winterferien', days: 2 },
  { name: 'Osterferien', days: 14 },
  { name: 'Pfingstferien', days: 1 },
  { name: 'Sommerferien', days: 42 },
  { name: 'Herbstferien', days: 14 },
  { name: 'Weihnachtsferien', days: 14 },
  { name: 'Brückentag', days: 1 },
  { name: 'Studientag', days: 1 },
  { name: 'Feiertag', days: 1 },
];

export function AddHolidayDialog({ onHolidayAdded }: AddHolidayDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePresetSelect = (presetName: string) => {
    const preset = HOLIDAY_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setName(preset.name);
      // If start date is set, calculate end date
      if (startDate) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setDate(end.getDate() + preset.days - 1);
        setEndDate(format(end, 'yyyy-MM-dd'));
      }
    }
  };

  const handleStartDateChange = (newStartDate: string) => {
    setStartDate(newStartDate);
    // If no end date set, default to same day
    if (!endDate) {
      setEndDate(newStartDate);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!name.trim()) {
      toast.error('Bitte gib einen Namen ein');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Bitte wähle Start- und Enddatum');
      return;
    }
    if (new Date(endDate) < new Date(startDate)) {
      toast.error('Enddatum muss nach dem Startdatum liegen');
      return;
    }

    setIsSubmitting(true);
    
    const { error } = await supabase
      .from('custom_holidays')
      .insert({
        user_id: user.id,
        name: name.trim(),
        start_date: startDate,
        end_date: endDate,
      });

    if (error) {
      toast.error('Fehler beim Speichern');
      console.error(error);
    } else {
      toast.success('Ferien hinzugefügt');
      setOpen(false);
      setName('');
      setStartDate('');
      setEndDate('');
      onHolidayAdded();
    }
    
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palmtree className="w-4 h-4" />
          <span className="hidden sm:inline">Ferien</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ferien hinzufügen</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Vorlage (optional)</Label>
            <Select onValueChange={handlePresetSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Vorlage wählen..." />
              </SelectTrigger>
              <SelectContent>
                {HOLIDAY_PRESETS.map(preset => (
                  <SelectItem key={preset.name} value={preset.name}>
                    {preset.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="z.B. Zeugnisferien 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Startdatum</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => handleStartDateChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Enddatum</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Speichern...' : 'Ferien hinzufügen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}