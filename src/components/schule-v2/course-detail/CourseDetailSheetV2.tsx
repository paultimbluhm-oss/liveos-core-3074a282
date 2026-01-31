import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useSchoolV2 } from '../context/SchoolV2Context';
import { V2Course, V2Grade, V2CourseFeedItem } from '../types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Plus, BookOpen, GraduationCap, Calendar, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { TimetableSlotManagerV2 } from './TimetableSlotManagerV2';

interface CourseDetailSheetV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: V2Course | null;
  onTimetableChange?: () => void;
}

export function CourseDetailSheetV2({ open, onOpenChange, course, onTimetableChange }: CourseDetailSheetV2Props) {
  const { user } = useAuth();
  const { scope } = useSchoolV2();
  
  const [grades, setGrades] = useState<V2Grade[]>([]);
  const [feed, setFeed] = useState<V2CourseFeedItem[]>([]);
  const [addGradeOpen, setAddGradeOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Load grades and feed when course changes
  useEffect(() => {
    const loadData = async () => {
      if (!user || !course) return;

      setLoading(true);

      // Load grades
      const { data: gradesData } = await supabase
        .from('v2_grades')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .order('created_at', { ascending: false });

      setGrades((gradesData || []).map(g => ({
        ...g,
        grade_type: g.grade_type as 'oral' | 'written' | 'practical' | 'semester',
        semester: g.semester as 1 | 2,
      })));

      // Load feed
      const { data: feedData } = await supabase
        .from('v2_course_feed')
        .select('*')
        .eq('course_id', course.id)
        .order('created_at', { ascending: false });

      setFeed((feedData || []).map(f => ({
        ...f,
        type: f.type as 'homework' | 'info' | 'event',
        priority: f.priority as 'low' | 'normal' | 'high',
      })));

      setLoading(false);
    };

    if (open && course) {
      loadData();
    }
  }, [open, course, user]);

  // Calculate average
  const calculateAverage = () => {
    if (!course || grades.length === 0) return null;

    const oralGrades = grades.filter(g => g.grade_type === 'oral');
    const writtenGrades = grades.filter(g => g.grade_type === 'written');
    const practicalGrades = grades.filter(g => g.grade_type === 'practical');

    const oralAvg = oralGrades.length > 0 
      ? oralGrades.reduce((sum, g) => sum + g.points, 0) / oralGrades.length 
      : null;
    const writtenAvg = writtenGrades.length > 0 
      ? writtenGrades.reduce((sum, g) => sum + g.points, 0) / writtenGrades.length 
      : null;
    const practicalAvg = practicalGrades.length > 0 
      ? practicalGrades.reduce((sum, g) => sum + g.points, 0) / practicalGrades.length 
      : null;

    let totalWeight = 0;
    let weightedSum = 0;

    if (oralAvg !== null) {
      weightedSum += oralAvg * course.oral_weight;
      totalWeight += course.oral_weight;
    }
    if (writtenAvg !== null) {
      weightedSum += writtenAvg * course.written_weight;
      totalWeight += course.written_weight;
    }
    if (practicalAvg !== null && course.has_practical) {
      weightedSum += practicalAvg * course.practical_weight;
      totalWeight += course.practical_weight;
    }

    return totalWeight > 0 ? Math.round((weightedSum / totalWeight) * 10) / 10 : null;
  };

  const average = calculateAverage();

  if (!course) return null;

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl">
          <SheetHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div 
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: course.color || '#6366f1' }}
              >
                {course.short_name || course.name.substring(0, 2)}
              </div>
              <div>
                <SheetTitle>{course.name}</SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {course.teacher_name || 'Kein Lehrer'} · {course.room || 'Kein Raum'}
                </p>
              </div>
              {average !== null && (
                <div className="ml-auto text-right">
                  <div className="text-2xl font-bold">{average}</div>
                  <div className="text-xs text-muted-foreground">Punkte</div>
                </div>
              )}
            </div>
          </SheetHeader>

          <Tabs defaultValue="grades" className="flex-1">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="grades" className="gap-1.5 text-xs">
                <GraduationCap className="w-3.5 h-3.5" strokeWidth={1.5} />
                Noten
              </TabsTrigger>
              <TabsTrigger value="timetable" className="gap-1.5 text-xs">
                <Clock className="w-3.5 h-3.5" strokeWidth={1.5} />
                Stunden
              </TabsTrigger>
              <TabsTrigger value="feed" className="gap-1.5 text-xs">
                <BookOpen className="w-3.5 h-3.5" strokeWidth={1.5} />
                Feed
              </TabsTrigger>
            </TabsList>

            <TabsContent value="grades" className="mt-4 space-y-4">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={() => setAddGradeOpen(true)}
              >
                <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} />
                Note hinzufügen
              </Button>

              {grades.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Noch keine Noten eingetragen
                </div>
              ) : (
                <div className="space-y-2">
                  {grades.map(grade => (
                    <div 
                      key={grade.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                    >
                      <div>
                        <div className="font-medium text-sm flex items-center gap-2">
                          {grade.grade_type === 'oral' && 'Mündlich'}
                          {grade.grade_type === 'written' && 'Schriftlich'}
                          {grade.grade_type === 'practical' && 'Praxis'}
                          {grade.grade_type === 'semester' && 'Halbjahresnote'}
                          <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                            HJ {(grade as any).semester || scope.semester}
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {grade.description || 'Keine Beschreibung'}
                          {grade.date && ` · ${format(new Date(grade.date), 'd. MMM', { locale: de })}`}
                        </div>
                      </div>
                      <div className="text-xl font-bold">{grade.points}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Gewichtung anzeigen */}
              <div className="pt-4 border-t">
                <div className="text-xs text-muted-foreground mb-2">Gewichtung</div>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 rounded bg-muted">Mündlich: {course.oral_weight}%</span>
                  <span className="px-2 py-1 rounded bg-muted">Schriftlich: {course.written_weight}%</span>
                  {course.has_practical && (
                    <span className="px-2 py-1 rounded bg-muted">Praxis: {course.practical_weight}%</span>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="timetable" className="mt-4">
              <TimetableSlotManagerV2 course={course} onSlotsChange={onTimetableChange} />
            </TabsContent>

            <TabsContent value="feed" className="mt-4">
              {feed.length === 0 ? (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  Noch keine Einträge
                </div>
              ) : (
                <div className="space-y-2">
                  {feed.map(item => (
                    <div 
                      key={item.id}
                      className="p-3 rounded-lg bg-muted/50"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-medium text-sm">{item.title}</div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                          )}
                        </div>
                        {item.due_date && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="w-3 h-3" strokeWidth={1.5} />
                            {format(new Date(item.due_date), 'd.M.', { locale: de })}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      <AddGradeDialogV2 
        open={addGradeOpen}
        onOpenChange={setAddGradeOpen}
        course={course}
        currentSemester={scope.semester}
        onAdded={(grade) => setGrades(prev => [grade, ...prev])}
      />
    </>
  );
}

// Inline Add Grade Dialog
interface AddGradeDialogV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: V2Course;
  currentSemester: 1 | 2;
  onAdded: (grade: V2Grade) => void;
}

function AddGradeDialogV2({ open, onOpenChange, course, currentSemester, onAdded }: AddGradeDialogV2Props) {
  const { user } = useAuth();
  
  const [gradeType, setGradeType] = useState<'oral' | 'written' | 'practical' | 'semester'>('oral');
  const [semester, setSemester] = useState<1 | 2>(currentSemester);
  const [points, setPoints] = useState<number>(10);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    if (!user) return;

    setLoading(true);

    const { data, error } = await supabase
      .from('v2_grades')
      .insert({
        user_id: user.id,
        course_id: course.id,
        grade_type: gradeType,
        points,
        description: description.trim() || null,
        date: new Date().toISOString().split('T')[0],
        semester,
      })
      .select()
      .single();

    if (!error && data) {
      onAdded({
        ...data,
        grade_type: data.grade_type as 'oral' | 'written' | 'practical' | 'semester',
        semester: data.semester as 1 | 2,
      });
      setGradeType('oral');
      setSemester(currentSemester);
      setPoints(10);
      setDescription('');
      onOpenChange(false);
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Note hinzufügen</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Typ</Label>
              <Select value={gradeType} onValueChange={(v) => setGradeType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="oral">Mündlich</SelectItem>
                  <SelectItem value="written">Schriftlich</SelectItem>
                  {course.has_practical && (
                    <SelectItem value="practical">Praxis</SelectItem>
                  )}
                  <SelectItem value="semester">Halbjahresnote</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Halbjahr</Label>
              <Select value={String(semester)} onValueChange={(v) => setSemester(parseInt(v) as 1 | 2)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1. Halbjahr</SelectItem>
                  <SelectItem value="2">2. Halbjahr</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Punkte</Label>
              <span className="text-2xl font-bold tabular-nums">{points}</span>
            </div>
            <Slider
              value={[points]}
              onValueChange={(v) => setPoints(v[0])}
              min={0}
              max={15}
              step={1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0</span>
              <span>5</span>
              <span>10</span>
              <span>15</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Beschreibung (optional)</Label>
            <Input 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="z.B. Klausur 1"
            />
          </div>

          <Button onClick={handleAdd} disabled={loading} className="w-full">
            Hinzufügen
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
