import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGradeColors } from '@/hooks/useGradeColors';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Award, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Grade {
  id: string;
  points: number;
  grade_type: string;
  description: string | null;
  date: string | null;
  subject_id: string;
  subjects?: {
    id: string;
    name: string;
    short_name: string | null;
  } | null;
}

interface Subject {
  id: string;
  name: string;
  short_name: string | null;
  oral_weight: number;
  written_weight: number;
}

interface GradesSectionProps {
  onBack: () => void;
}

export function GradesSection({ onBack }: GradesSectionProps) {
  const { user } = useAuth();
  const { getGradeColor, getGradeTextColor } = useGradeColors();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  // Form state
  const [subjectId, setSubjectId] = useState('');
  const [gradeType, setGradeType] = useState<'oral' | 'written'>('oral');
  const [points, setPoints] = useState('');
  const [description, setDescription] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    const [gradesRes, subjectsRes] = await Promise.all([
      supabase
        .from('grades')
        .select('*, subjects(id, name, short_name)')
        .eq('user_id', user.id)
        .order('date', { ascending: false }),
      supabase
        .from('subjects')
        .select('id, name, short_name, oral_weight, written_weight')
        .eq('user_id', user.id)
        .order('name'),
    ]);

    setGrades(gradesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('grades').delete().eq('id', id);
    if (error) {
      toast.error('Fehler beim Entfernen');
    } else {
      toast.success('Entfernt');
      fetchData();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !subjectId || !points) return;

    const pointsNum = parseInt(points);
    if (isNaN(pointsNum) || pointsNum < 0 || pointsNum > 15) {
      toast.error('Punkte muessen zwischen 0 und 15 liegen');
      return;
    }

    setFormLoading(true);
    const { error } = await supabase.from('grades').insert({
      user_id: user.id,
      subject_id: subjectId,
      grade_type: gradeType,
      points: pointsNum,
      description: description.trim() || (gradeType === 'oral' ? 'Muendliche Note' : 'Klausur'),
    });

    if (error) {
      toast.error('Fehler beim Eintragen');
    } else {
      toast.success('Note hinzugefügt');
      setSubjectId('');
      setPoints('');
      setDescription('');
      setDialogOpen(false);
      fetchData();
    }
    setFormLoading(false);
  };

  // Calculate subject averages
  const subjectAverages = subjects.map(subject => {
    const subjectGrades = grades.filter(g => g.subject_id === subject.id);
    const oral = subjectGrades.filter(g => g.grade_type === 'oral').map(g => g.points);
    const written = subjectGrades.filter(g => g.grade_type === 'written').map(g => g.points);
    
    const oralAvg = oral.length > 0 ? oral.reduce((a, b) => a + b, 0) / oral.length : null;
    const writtenAvg = written.length > 0 ? written.reduce((a, b) => a + b, 0) / written.length : null;

    let finalGrade: number | null = null;
    if (oralAvg !== null && writtenAvg !== null) {
      finalGrade = Math.round((writtenAvg * subject.written_weight + oralAvg * subject.oral_weight) / 100);
    } else if (oralAvg !== null) {
      finalGrade = Math.round(oralAvg);
    } else if (writtenAvg !== null) {
      finalGrade = Math.round(writtenAvg);
    }

    return {
      subject,
      oralAvg,
      writtenAvg,
      finalGrade,
      totalGrades: subjectGrades.length,
    };
  }).filter(s => s.totalGrades > 0);

  const overallAverage = subjectAverages.length > 0 && subjectAverages.every(s => s.finalGrade !== null)
    ? Math.round((subjectAverages.reduce((a, b) => a + (b.finalGrade || 0), 0) / subjectAverages.length) * 10) / 10
    : null;

  // getGradeColor and getGradeTextColor now come from useGradeColors hook

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg border-2 border-amber-500 bg-transparent">
              <Award className="w-4 h-4 text-amber-500" />
            </div>
            <h2 className="text-lg font-bold">Noten</h2>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 px-2.5">
              <Plus className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Note eintragen</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-3 pt-2">
              <div>
                <Label className="text-xs">Fach</Label>
                <Select value={subjectId} onValueChange={setSubjectId}>
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Fach waehlen" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.short_name || s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Art</Label>
                <Select value={gradeType} onValueChange={(v) => setGradeType(v as 'oral' | 'written')}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oral">Muendlich</SelectItem>
                    <SelectItem value="written">Schriftlich</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Punkte (0-15)</Label>
                <Input
                  type="number"
                  min="0"
                  max="15"
                  value={points}
                  onChange={(e) => setPoints(e.target.value)}
                  placeholder="0-15"
                  className="h-9"
                  required
                />
              </div>
              <div>
                <Label className="text-xs">Beschreibung</Label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional"
                  className="h-9"
                />
              </div>
              <Button type="submit" className="w-full" disabled={formLoading || !subjectId}>
                {formLoading ? 'Wird gespeichert...' : 'Eintragen'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Overall Average */}
      {overallAverage !== null && (
        <div className="p-4 rounded-xl bg-card border border-border/50 text-center">
          <div className={`text-3xl font-bold ${getGradeTextColor(overallAverage)}`}>
            {overallAverage}
          </div>
          <div className="text-xs text-muted-foreground">Gesamtschnitt</div>
        </div>
      )}

      {/* Subject Averages */}
      <div className="space-y-1.5">
        {subjectAverages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Award className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Noch keine Noten eingetragen</p>
          </div>
        ) : (
          subjectAverages.map(({ subject, oralAvg, writtenAvg, finalGrade, totalGrades }) => (
            <div 
              key={subject.id}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold ${getGradeColor(finalGrade)}`}>
                {finalGrade ?? '-'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">
                  {subject.short_name || subject.name}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  {oralAvg !== null && <span>M: {Math.round(oralAvg * 10) / 10}</span>}
                  {writtenAvg !== null && <span>S: {Math.round(writtenAvg * 10) / 10}</span>}
                  <span>{totalGrades} Note{totalGrades !== 1 ? 'n' : ''}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Grades */}
      {grades.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground px-1">Letzte Noten</h3>
          <div className="space-y-1.5">
            {grades.slice(0, 10).map((grade) => (
              <div 
                key={grade.id}
                className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30"
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${getGradeColor(grade.points)}`}>
                  {grade.points}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate">
                      {grade.subjects?.short_name || grade.subjects?.name}
                    </span>
                    <span className="text-[10px] px-1 py-0.5 rounded bg-muted text-muted-foreground">
                      {grade.grade_type === 'oral' ? 'M' : 'S'}
                    </span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {grade.description}
                    {grade.date && ` - ${format(new Date(grade.date), 'd. MMM', { locale: de })}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => handleDelete(grade.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
