import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getSupabase, useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  short_name?: string | null;
  teacher_short?: string | null;
  room?: string | null;
  grade_year: number;
  written_weight: number;
  oral_weight: number;
}

interface EditSubjectDialogProps {
  subject: Subject;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubjectUpdated: () => void;
}

export function EditSubjectDialog({ subject, open, onOpenChange, onSubjectUpdated }: EditSubjectDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState(subject.name);
  const [shortName, setShortName] = useState(subject.short_name || '');
  const [teacherShort, setTeacherShort] = useState(subject.teacher_short || '');
  const [room, setRoom] = useState(subject.room || '');
  const [gradeYear, setGradeYear] = useState(subject.grade_year.toString());
  const [writtenWeight, setWrittenWeight] = useState(subject.written_weight.toString());
  const [oralWeight, setOralWeight] = useState(subject.oral_weight.toString());
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setName(subject.name);
    setShortName(subject.short_name || '');
    setTeacherShort(subject.teacher_short || '');
    setRoom(subject.room || '');
    setGradeYear(subject.grade_year.toString());
    setWrittenWeight(subject.written_weight.toString());
    setOralWeight(subject.oral_weight.toString());
  }, [subject]);

  const handleWrittenWeightChange = (value: string) => {
    const num = parseInt(value) || 0;
    setWrittenWeight(value);
    setOralWeight(String(100 - num));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !name.trim()) return;

    setLoading(true);
    const supabase = getSupabase();
    if (!supabase) {
      toast.error('Verbindungsfehler');
      setLoading(false);
      return;
    }
    
    const { error } = await supabase
      .from('subjects')
      .update({
        name: name.trim(),
        short_name: shortName.trim() || null,
        teacher_short: teacherShort.trim() || null,
        room: room.trim() || null,
        grade_year: parseInt(gradeYear),
        written_weight: parseInt(writtenWeight),
        oral_weight: parseInt(oralWeight),
      })
      .eq('id', subject.id);

    if (error) {
      toast.error('Fehler beim Speichern');
    } else {
      toast.success('Fach aktualisiert');
      onOpenChange(false);
      onSubjectUpdated();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border/50">
        <DialogHeader>
          <DialogTitle>Fach bearbeiten</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Fachname</Label>
              <Input
                id="edit-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Mathematik"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-shortName">Kürzel</Label>
              <Input
                id="edit-shortName"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="z.B. M"
                maxLength={5}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-teacherShort">Lehrerkürzel</Label>
              <Input
                id="edit-teacherShort"
                value={teacherShort}
                onChange={(e) => setTeacherShort(e.target.value)}
                placeholder="z.B. Mü"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-room">Raum</Label>
              <Input
                id="edit-room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="z.B. A201"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-gradeYear">Jahrgangsstufe</Label>
            <Input
              id="edit-gradeYear"
              type="number"
              min="1"
              max="13"
              value={gradeYear}
              onChange={(e) => setGradeYear(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-writtenWeight">Schriftlich (%)</Label>
              <Input
                id="edit-writtenWeight"
                type="number"
                min="0"
                max="100"
                value={writtenWeight}
                onChange={(e) => handleWrittenWeightChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-oralWeight">Mündlich (%)</Label>
              <Input
                id="edit-oralWeight"
                type="number"
                min="0"
                max="100"
                value={oralWeight}
                disabled
                className="opacity-70"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Wird gespeichert...' : 'Speichern'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
