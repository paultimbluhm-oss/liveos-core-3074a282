import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { V2Course, V2TimetableSlot, PERIOD_TIMES, WEEKDAYS } from '../types';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Clock } from 'lucide-react';
import { toast } from 'sonner';

interface TimetableSlotManagerV2Props {
  course: V2Course;
  onSlotsChange?: () => void;
}

export function TimetableSlotManagerV2({ course, onSlotsChange }: TimetableSlotManagerV2Props) {
  const [slots, setSlots] = useState<V2TimetableSlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingSlot, setAddingSlot] = useState(false);

  // Form state for new slot
  const [newDay, setNewDay] = useState<number>(1);
  const [newPeriod, setNewPeriod] = useState<number>(1);
  const [newRoom, setNewRoom] = useState('');
  const [newWeekType, setNewWeekType] = useState<'both' | 'A' | 'B'>('both');
  const [newIsDouble, setNewIsDouble] = useState(false);

  // Load existing slots
  useEffect(() => {
    const loadSlots = async () => {
      const { data } = await supabase
        .from('v2_timetable_slots')
        .select('*')
        .eq('course_id', course.id)
        .order('day_of_week')
        .order('period');

      if (data) {
        setSlots(data.map(s => ({
          ...s,
          week_type: s.week_type as 'both' | 'A' | 'B',
        })));
      }
      setLoading(false);
    };

    loadSlots();
  }, [course.id]);

  const handleAddSlot = async () => {
    setAddingSlot(true);

    const { data, error } = await supabase
      .from('v2_timetable_slots')
      .insert({
        course_id: course.id,
        day_of_week: newDay,
        period: newPeriod,
        room: newRoom.trim() || course.room || null,
        week_type: newWeekType,
        is_double_lesson: newIsDouble,
      })
      .select()
      .single();

    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else if (data) {
      setSlots(prev => [...prev, {
        ...data,
        week_type: data.week_type as 'both' | 'A' | 'B',
      }]);
      toast.success('Stunde hinzugefügt');
      onSlotsChange?.();
      
      // Reset form
      setNewRoom('');
      setNewIsDouble(false);
    }

    setAddingSlot(false);
  };

  const handleDeleteSlot = async (slotId: string) => {
    const { error } = await supabase
      .from('v2_timetable_slots')
      .delete()
      .eq('id', slotId);

    if (!error) {
      setSlots(prev => prev.filter(s => s.id !== slotId));
      toast.success('Stunde entfernt');
      onSlotsChange?.();
    }
  };

  // Available periods (skip 7 = Pause)
  const availablePeriods = [1, 2, 3, 4, 5, 6, 8, 9];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Existing slots */}
      {slots.length === 0 ? (
        <div className="text-center py-6 text-sm text-muted-foreground">
          Noch keine Stunden im Stundenplan
        </div>
      ) : (
        <div className="space-y-2">
          {slots.map(slot => (
            <div 
              key={slot.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-xs font-medium"
                  style={{ backgroundColor: course.color || '#6366f1' }}
                >
                  <Clock className="w-4 h-4" strokeWidth={1.5} />
                </div>
                <div>
                  <div className="font-medium text-sm">
                    {WEEKDAYS[slot.day_of_week - 1]}, {slot.period}. Stunde
                    {slot.is_double_lesson && ` + ${slot.period + 1}. Stunde`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {PERIOD_TIMES[slot.period]?.start} - {slot.is_double_lesson && PERIOD_TIMES[slot.period + 1] ? PERIOD_TIMES[slot.period + 1].end : PERIOD_TIMES[slot.period]?.end}
                    {slot.room && ` · ${slot.room}`}
                    {slot.week_type !== 'both' && ` · Woche ${slot.week_type}`}
                  </div>
                </div>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => handleDeleteSlot(slot.id)}
              >
                <Trash2 className="w-4 h-4" strokeWidth={1.5} />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Add new slot form */}
      <div className="border-t pt-4 space-y-3">
        <div className="text-sm font-medium">Neue Stunde hinzufügen</div>
        
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Tag</Label>
            <Select value={String(newDay)} onValueChange={(v) => setNewDay(parseInt(v))}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WEEKDAYS.map((day, idx) => (
                  <SelectItem key={idx} value={String(idx + 1)}>{day}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Stunde</Label>
            <Select value={String(newPeriod)} onValueChange={(v) => setNewPeriod(parseInt(v))}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availablePeriods.map(p => (
                  <SelectItem key={p} value={String(p)}>
                    {p}. ({PERIOD_TIMES[p]?.start})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Raum (optional)</Label>
            <Input 
              value={newRoom}
              onChange={(e) => setNewRoom(e.target.value)}
              placeholder={course.room || 'z.B. A101'}
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Woche</Label>
            <Select value={newWeekType} onValueChange={(v) => setNewWeekType(v as any)}>
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Jede Woche</SelectItem>
                <SelectItem value="A">Nur A-Woche</SelectItem>
                <SelectItem value="B">Nur B-Woche</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between py-2">
          <Label className="text-xs">Doppelstunde</Label>
          <Switch 
            checked={newIsDouble}
            onCheckedChange={setNewIsDouble}
          />
        </div>

        <Button 
          onClick={handleAddSlot}
          disabled={addingSlot}
          className="w-full"
          size="sm"
        >
          <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} />
          Stunde hinzufügen
        </Button>
      </div>
    </div>
  );
}

