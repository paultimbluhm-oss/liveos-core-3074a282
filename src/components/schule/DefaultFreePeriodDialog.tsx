import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Coffee, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];

interface DefaultFreePeriodDialogProps {
  onFreePeriodAdded: () => void;
}

export function DefaultFreePeriodDialog({ onFreePeriodAdded }: DefaultFreePeriodDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [period, setPeriod] = useState('1');
  const [isDouble, setIsDouble] = useState(false);
  const [weekType, setWeekType] = useState('both');
  const [loading, setLoading] = useState(false);

  const availablePeriods = [1, 2, 3, 4, 5, 6, 8, 9];

  const handleSubmit = async () => {
    if (!user) return;
    
    setLoading(true);
    
    const periodNum = parseInt(period);
    const dayNum = parseInt(dayOfWeek);
    
    const baseData = {
      user_id: user.id,
      day_of_week: dayNum,
      subject_id: null,
      teacher_short: 'FREI',
      room: null,
      week_type: weekType,
    };

    // Check if entry exists
    const { data: existing } = await supabase
      .from('timetable_entries')
      .select('id')
      .eq('user_id', user.id)
      .eq('day_of_week', dayNum)
      .eq('period', periodNum)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('timetable_entries')
        .update(baseData)
        .eq('id', existing.id);

      if (error) {
        toast.error('Fehler beim Speichern');
        console.error(error);
        setLoading(false);
        return;
      }
    } else {
      const { error } = await supabase
        .from('timetable_entries')
        .insert({ ...baseData, period: periodNum });

      if (error) {
        toast.error('Fehler beim Speichern');
        console.error(error);
        setLoading(false);
        return;
      }
    }

    // Handle double period
    if (isDouble) {
      const nextPeriod = periodNum + 1;
      if (nextPeriod <= 9 && nextPeriod !== 7) {
        const { data: existingNext } = await supabase
          .from('timetable_entries')
          .select('id')
          .eq('user_id', user.id)
          .eq('day_of_week', dayNum)
          .eq('period', nextPeriod)
          .maybeSingle();

        if (existingNext) {
          await supabase
            .from('timetable_entries')
            .update(baseData)
            .eq('id', existingNext.id);
        } else {
          await supabase
            .from('timetable_entries')
            .insert({ ...baseData, period: nextPeriod });
        }
      }
    }

    toast.success('Freistunde eingetragen');
    setOpen(false);
    resetForm();
    onFreePeriodAdded();
    setLoading(false);
  };

  const resetForm = () => {
    setDayOfWeek('1');
    setPeriod('1');
    setIsDouble(false);
    setWeekType('both');
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Coffee className="w-4 h-4" />
          <span className="hidden sm:inline">Freistunde</span>
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Standard-Freistunde eintragen
          </DialogTitle>
          <DialogDescription>
            Freistunden werden nicht als Fehltage gezählt und im Stundenplan als frei markiert.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tag</Label>
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day, i) => (
                    <SelectItem key={i + 1} value={(i + 1).toString()}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Stunde</Label>
              <Select value={period} onValueChange={setPeriod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availablePeriods.map(p => (
                    <SelectItem key={p} value={p.toString()}>{p}. Stunde</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="freePeriodDouble"
              checked={isDouble}
              onCheckedChange={(checked) => setIsDouble(checked as boolean)}
            />
            <label htmlFor="freePeriodDouble" className="text-sm font-medium leading-none">
              Doppelstunde
            </label>
          </div>

          <div className="space-y-2">
            <Label>Wochenrhythmus</Label>
            <Select value={weekType} onValueChange={setWeekType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Jede Woche</SelectItem>
                <SelectItem value="odd">Nur A-Woche</SelectItem>
                <SelectItem value="even">Nur B-Woche</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Wird gespeichert...' : 'Eintragen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
