import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BookOpen, Award, Settings, Calendar, Plus, Coffee } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format, addDays, getISOWeek, startOfWeek } from 'date-fns';

interface Subject {
  id: string;
  name: string;
  short_name: string | null;
  teacher_short: string | null;
  room: string | null;
}

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period: number;
  subject_id: string | null;
  teacher_short: string;
  room: string | null;
  week_type: string;
  subjects?: Subject | null;
}

interface SubjectActionSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entry: TimetableEntry | null;
  onDataChanged: () => void;
  onEditEntry: () => void;
  currentDate?: Date;
}

export function SubjectActionSheet({ 
  open, 
  onOpenChange, 
  entry, 
  onDataChanged,
  onEditEntry,
  currentDate
}: SubjectActionSheetProps) {
  const { user } = useAuth();
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);

  // Grade form state
  const [gradeType, setGradeType] = useState<'oral' | 'written'>('oral');
  const [points, setPoints] = useState('');
  const [gradeDescription, setGradeDescription] = useState('');
  const [gradeLoading, setGradeLoading] = useState(false);

  // Homework form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('medium');
  const [xpReward, setXpReward] = useState('10');
  const [homeworkLoading, setHomeworkLoading] = useState(false);
  const [evaLoading, setEvaLoading] = useState(false);

  const subject = entry?.subjects;
  const isFree = entry?.teacher_short === 'FREI' && !entry?.subject_id;

  const quickDates = [
    { label: 'Morgen', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: '2 Tage', value: format(addDays(new Date(), 2), 'yyyy-MM-dd') },
    { label: '1 Woche', value: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
  ];

  const handleAddGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !entry?.subject_id || !points) return;

    const pointsNum = parseInt(points);
    if (isNaN(pointsNum) || pointsNum < 0 || pointsNum > 15) {
      toast.error('Punkte müssen zwischen 0 und 15 liegen');
      return;
    }

    setGradeLoading(true);
    const { error } = await supabase.from('grades').insert({
      user_id: user.id,
      subject_id: entry.subject_id,
      grade_type: gradeType,
      points: pointsNum,
      description: gradeDescription.trim() || (gradeType === 'oral' ? 'Mündliche Note' : 'Klausur'),
    });

    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      toast.success('Note hinzugefügt');
      setPoints('');
      setGradeDescription('');
      setGradeDialogOpen(false);
      onDataChanged();
    }
    setGradeLoading(false);
  };

  const handleAddHomework = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !entry?.subject_id || !title.trim() || !dueDate) return;

    setHomeworkLoading(true);
    const { error } = await supabase.from('homework').insert({
      user_id: user.id,
      subject_id: entry.subject_id,
      title: title.trim(),
      description: description.trim() || null,
      due_date: dueDate,
      priority,
      xp_reward: parseInt(xpReward) || 10,
    });

    if (error) {
      toast.error('Fehler beim Hinzufügen');
    } else {
      toast.success('Hausaufgabe hinzugefügt');
      setTitle('');
      setDescription('');
      setDueDate('');
      setHomeworkDialogOpen(false);
      onDataChanged();
    }
    setHomeworkLoading(false);
  };

  const handleMarkEVA = async () => {
    if (!user || !entry) return;
    
    const dateToUse = currentDate || new Date();
    const dateStr = format(dateToUse, 'yyyy-MM-dd');
    
    setEvaLoading(true);
    const { error } = await supabase.from('lesson_absences').insert({
      user_id: user.id,
      date: dateStr,
      timetable_entry_id: entry.id,
      reason: 'efa',
      excused: true,
    });

    if (error) {
      if (error.code === '23505') {
        toast.error('EVA bereits eingetragen');
      } else {
        toast.error('Fehler beim Speichern');
      }
    } else {
      toast.success('Als EVA markiert');
      onDataChanged();
      onOpenChange(false);
    }
    setEvaLoading(false);
  };

  if (!entry) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-auto max-h-[50vh]">
          <SheetHeader className="pb-4">
            <SheetTitle className="flex items-center gap-2">
              {isFree ? 'Freistunde' : (subject?.short_name || subject?.name || entry.teacher_short)}
              {!isFree && entry.room && (
                <span className="text-sm font-normal text-muted-foreground">({entry.room})</span>
              )}
            </SheetTitle>
          </SheetHeader>
          
          <div className="grid grid-cols-3 gap-2">
            {!isFree && entry.subject_id && (
              <>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1.5 h-auto py-4"
                  onClick={() => {
                    setGradeDialogOpen(true);
                    onOpenChange(false);
                  }}
                >
                  <Award className="w-5 h-5 text-amber-500" />
                  <span className="text-xs">Note</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1.5 h-auto py-4"
                  onClick={() => {
                    setHomeworkDialogOpen(true);
                    onOpenChange(false);
                  }}
                >
                  <BookOpen className="w-5 h-5 text-green-500" />
                  <span className="text-xs">Hausaufgabe</span>
                </Button>
                <Button
                  variant="outline"
                  className="flex flex-col items-center gap-1.5 h-auto py-4"
                  onClick={handleMarkEVA}
                  disabled={evaLoading}
                >
                  <Coffee className="w-5 h-5 text-purple-500" />
                  <span className="text-xs">EVA</span>
                </Button>
              </>
            )}
            {isFree && (
              <Button
                variant="outline"
                className="flex flex-col items-center gap-1.5 h-auto py-4"
                onClick={handleMarkEVA}
                disabled={evaLoading}
              >
                <Coffee className="w-5 h-5 text-purple-500" />
                <span className="text-xs">EVA</span>
              </Button>
            )}
            <Button
              variant="outline"
              className="flex flex-col items-center gap-1.5 h-auto py-4"
              onClick={() => {
                onEditEntry();
                onOpenChange(false);
              }}
            >
              <Settings className="w-5 h-5 text-muted-foreground" />
              <span className="text-xs">Bearbeiten</span>
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Grade Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Note für {subject?.short_name || subject?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddGrade} className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Art</Label>
              <Select value={gradeType} onValueChange={(v) => setGradeType(v as 'oral' | 'written')}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="oral">Mündlich</SelectItem>
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
                value={gradeDescription}
                onChange={(e) => setGradeDescription(e.target.value)}
                placeholder="Optional"
                className="h-9"
              />
            </div>
            <Button type="submit" className="w-full" disabled={gradeLoading}>
              {gradeLoading ? 'Wird hinzugefügt...' : 'Note hinzufügen'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Homework Dialog */}
      <Dialog open={homeworkDialogOpen} onOpenChange={setHomeworkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Hausaufgabe für {subject?.short_name || subject?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddHomework} className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Titel</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Aufgaben S. 42"
                className="h-9"
                required
              />
            </div>
            <div>
              <Label className="text-xs">Beschreibung</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
                rows={2}
              />
            </div>
            <div>
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Fällig am
              </Label>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {quickDates.map((qd) => (
                  <Button
                    key={qd.label}
                    type="button"
                    variant={dueDate === qd.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setDueDate(qd.value)}
                  >
                    {qd.label}
                  </Button>
                ))}
                <div className="relative">
                  <Button
                    type="button"
                    variant={dueDate && !quickDates.find(q => q.value === dueDate) ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                  >
                    Datum
                  </Button>
                  <Input
                    type="date"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Priorität</Label>
                <Select value={priority} onValueChange={setPriority}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="high">Hoch</SelectItem>
                    <SelectItem value="medium">Mittel</SelectItem>
                    <SelectItem value="low">Niedrig</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">XP</Label>
                <Select value={xpReward} onValueChange={setXpReward}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 XP</SelectItem>
                    <SelectItem value="10">10 XP</SelectItem>
                    <SelectItem value="25">25 XP</SelectItem>
                    <SelectItem value="50">50 XP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={homeworkLoading || !dueDate}>
              {homeworkLoading ? 'Wird hinzugefügt...' : 'Hausaufgabe hinzufügen'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
