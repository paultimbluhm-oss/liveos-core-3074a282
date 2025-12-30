import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { getSupabase, useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AddSubjectDialogProps {
  onSubjectAdded: () => void;
}

export function AddSubjectDialog({ onSubjectAdded }: AddSubjectDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [teacherShort, setTeacherShort] = useState('');
  const [room, setRoom] = useState('');
  const [gradeYear, setGradeYear] = useState('11');
  const [writtenWeight, setWrittenWeight] = useState('50');
  const [oralWeight, setOralWeight] = useState('50');
  const [loading, setLoading] = useState(false);

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
    const { error } = await supabase.from('subjects').insert({
      user_id: user.id,
      name: name.trim(),
      short_name: shortName.trim() || null,
      teacher_short: teacherShort.trim() || null,
      room: room.trim() || null,
      grade_year: parseInt(gradeYear),
      written_weight: parseInt(writtenWeight),
      oral_weight: parseInt(oralWeight),
    });

    if (error) {
      toast.error('Fehler beim Hinzufügen des Fachs');
    } else {
      toast.success('Fach hinzugefügt');
      setName('');
      setShortName('');
      setTeacherShort('');
      setRoom('');
      setGradeYear('11');
      setWrittenWeight('50');
      setOralWeight('50');
      setOpen(false);
      onSubjectAdded();
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Fach hinzufügen
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border/50">
        <DialogHeader>
          <DialogTitle>Neues Fach hinzufügen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Fachname</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z.B. Mathematik"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shortName">Kürzel</Label>
              <Input
                id="shortName"
                value={shortName}
                onChange={(e) => setShortName(e.target.value)}
                placeholder="z.B. M"
                maxLength={5}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="teacherShort">Lehrerkürzel</Label>
              <Input
                id="teacherShort"
                value={teacherShort}
                onChange={(e) => setTeacherShort(e.target.value)}
                placeholder="z.B. Mü"
                maxLength={10}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="room">Raum</Label>
              <Input
                id="room"
                value={room}
                onChange={(e) => setRoom(e.target.value)}
                placeholder="z.B. A201"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="gradeYear">Jahrgangsstufe</Label>
            <Input
              id="gradeYear"
              type="number"
              min="1"
              max="13"
              value={gradeYear}
              onChange={(e) => setGradeYear(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="writtenWeight">Schriftlich (%)</Label>
              <Input
                id="writtenWeight"
                type="number"
                min="0"
                max="100"
                value={writtenWeight}
                onChange={(e) => handleWrittenWeightChange(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="oralWeight">Mündlich (%)</Label>
              <Input
                id="oralWeight"
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
            {loading ? 'Wird hinzugefügt...' : 'Fach hinzufügen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
