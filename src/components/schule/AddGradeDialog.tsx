import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { getSupabase, useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface AddGradeDialogProps {
  subjectId: string;
  subjectName: string;
  onGradeAdded: () => void;
}

export function AddGradeDialog({ subjectId, subjectName, onGradeAdded }: AddGradeDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [gradeType, setGradeType] = useState<'oral' | 'written'>('oral');
  const [points, setPoints] = useState('');
  const [points2, setPoints2] = useState('');
  const [hasTwoExams, setHasTwoExams] = useState(false);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const supabase = getSupabase();
    if (!supabase) {
      toast.error('Verbindungsfehler');
      return;
    }

    const pointsNum = parseInt(points);
    if (isNaN(pointsNum) || pointsNum < 0 || pointsNum > 15) {
      toast.error('Punkte muessen zwischen 0 und 15 liegen');
      return;
    }

    setLoading(true);

    if (gradeType === 'written' && hasTwoExams) {
      const points2Num = parseInt(points2);
      if (isNaN(points2Num) || points2Num < 0 || points2Num > 15) {
        toast.error('Punkte muessen zwischen 0 und 15 liegen');
        setLoading(false);
        return;
      }
      
      const { error: error1 } = await supabase.from('grades').insert({
        user_id: user.id,
        subject_id: subjectId,
        grade_type: 'written',
        points: pointsNum,
        description: description ? `${description} (Klausur 1)` : 'Klausur 1',
      });

      const { error: error2 } = await supabase.from('grades').insert({
        user_id: user.id,
        subject_id: subjectId,
        grade_type: 'written',
        points: points2Num,
        description: description ? `${description} (Klausur 2)` : 'Klausur 2',
      });

      if (error1 || error2) {
        toast.error('Fehler beim Eintragen');
      } else {
        toast.success('Klausuren eingetragen');
        resetForm();
        onGradeAdded();
      }
    } else {
      const { error } = await supabase.from('grades').insert({
        user_id: user.id,
        subject_id: subjectId,
        grade_type: gradeType,
        points: pointsNum,
        description: description || (gradeType === 'oral' ? 'Muendliche Note' : 'Klausur'),
      });

      if (error) {
        toast.error('Fehler beim Eintragen');
      } else {
        toast.success('Note eingetragen');
        resetForm();
        onGradeAdded();
      }
    }
    setLoading(false);
  };

  const resetForm = () => {
    setPoints('');
    setPoints2('');
    setDescription('');
    setHasTwoExams(false);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Plus className="h-3 w-3" />
          Note
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-card border-border/50">
        <DialogHeader>
          <DialogTitle>Note eintragen</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Art der Note</Label>
            <Select value={gradeType} onValueChange={(v) => setGradeType(v as 'oral' | 'written')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="oral">Muendlich</SelectItem>
                <SelectItem value="written">Schriftlich</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {gradeType === 'written' && (
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="twoExams"
                checked={hasTwoExams}
                onChange={(e) => setHasTwoExams(e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="twoExams" className="cursor-pointer">Zwei Klausuren</Label>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="points">{hasTwoExams ? 'Punkte Klausur 1' : 'Punkte'} (0-15)</Label>
            <Input
              id="points"
              type="number"
              min="0"
              max="15"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              placeholder="0-15"
              required
            />
          </div>

          {hasTwoExams && (
            <div className="space-y-2">
              <Label htmlFor="points2">Punkte Klausur 2 (0-15)</Label>
              <Input
                id="points2"
                type="number"
                min="0"
                max="15"
                value={points2}
                onChange={(e) => setPoints2(e.target.value)}
                placeholder="0-15"
                required
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Beschreibung (optional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Halbjahresklausur"
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Wird gespeichert...' : 'Note eintragen'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
