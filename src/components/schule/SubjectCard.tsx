import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trash2, ChevronDown, BookOpen, Calendar, CheckCircle2, FileText, Mic, PenLine } from 'lucide-react';
import { getSupabase, useAuth } from '@/hooks/useAuth';
import { useGamification } from '@/contexts/GamificationContext';
import { toast } from 'sonner';
import { AddGradeDialog } from './AddGradeDialog';
import { AddHomeworkDialog } from './AddHomeworkDialog';
import { AddEventDialog } from './AddEventDialog';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Subject {
  id: string;
  name: string;
  grade_year: number;
  written_weight: number;
  oral_weight: number;
}

interface Grade {
  id: string;
  points: number;
  grade_type: string;
  description: string | null;
  date: string | null;
}

interface Homework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  completed: boolean;
}

interface SchoolEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string;
}

interface SubjectCardProps {
  subject: Subject;
  onDeleted: () => void;
  onDataChanged: () => void;
}

export function SubjectCard({ subject, onDeleted, onDataChanged }: SubjectCardProps) {
  const { user } = useAuth();
  const { addXP } = useGamification();
  const [grades, setGrades] = useState<Grade[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [gradesOpen, setGradesOpen] = useState(true);
  const [homeworkOpen, setHomeworkOpen] = useState(true);
  const [eventsOpen, setEventsOpen] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    const supabase = getSupabase();
    if (!supabase) return;

    const [gradesRes, homeworkRes, eventsRes] = await Promise.all([
      supabase.from('grades').select('*').eq('subject_id', subject.id).order('date', { ascending: false }),
      supabase.from('homework').select('*').eq('subject_id', subject.id).order('due_date', { ascending: true }),
      supabase.from('school_events').select('*').eq('subject_id', subject.id).order('event_date', { ascending: true }),
    ]);

    if (gradesRes.data) setGrades(gradesRes.data);
    if (homeworkRes.data) setHomework(homeworkRes.data);
    if (eventsRes.data) setEvents(eventsRes.data);
  };

  useEffect(() => {
    fetchData();
  }, [user, subject.id]);

  const calculateFinalGrade = () => {
    const oralGrades = grades.filter(g => g.grade_type === 'oral');
    const writtenGrades = grades.filter(g => g.grade_type === 'written');

    if (oralGrades.length === 0 && writtenGrades.length === 0) return null;

    const oralAvg = oralGrades.length > 0
      ? oralGrades.reduce((sum, g) => sum + g.points, 0) / oralGrades.length
      : null;

    const writtenAvg = writtenGrades.length > 0
      ? writtenGrades.reduce((sum, g) => sum + g.points, 0) / writtenGrades.length
      : null;

    if (oralAvg !== null && writtenAvg !== null) {
      return Math.round((writtenAvg * subject.written_weight + oralAvg * subject.oral_weight) / 100);
    } else if (oralAvg !== null) {
      return Math.round(oralAvg);
    } else if (writtenAvg !== null) {
      return Math.round(writtenAvg);
    }
    return null;
  };

  const handleDelete = async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    
    const { error } = await supabase.from('subjects').delete().eq('id', subject.id);
    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Fach gelöscht');
      onDeleted();
    }
  };

  const toggleHomework = async (hw: Homework) => {
    const supabase = getSupabase();
    if (!supabase) return;
    
    const newCompleted = !hw.completed;
    const { error } = await supabase
      .from('homework')
      .update({ completed: newCompleted })
      .eq('id', hw.id);
    
    if (!error) {
      if (newCompleted) {
        await addXP(10, 'Hausaufgabe erledigt');
      }
      fetchData();
    }
  };

  const deleteGrade = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    
    await supabase.from('grades').delete().eq('id', id);
    fetchData();
    onDataChanged();
  };

  const deleteHomework = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    
    await supabase.from('homework').delete().eq('id', id);
    fetchData();
  };

  const deleteEvent = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase) return;
    
    await supabase.from('school_events').delete().eq('id', id);
    fetchData();
  };

  const getGradeColor = (grade: number) => {
    if (grade >= 13) return 'text-green-400';
    if (grade >= 10) return 'text-yellow-400';
    return 'text-red-400';
  };

  const finalGrade = calculateFinalGrade();
  const oralGrades = grades.filter(g => g.grade_type === 'oral');
  const writtenGrades = grades.filter(g => g.grade_type === 'written');
  const oralAvg = oralGrades.length > 0 
    ? (oralGrades.reduce((sum, g) => sum + g.points, 0) / oralGrades.length).toFixed(1) 
    : '-';
  const writtenAvg = writtenGrades.length > 0 
    ? (writtenGrades.reduce((sum, g) => sum + g.points, 0) / writtenGrades.length).toFixed(1) 
    : '-';

  return (
    <div className="space-y-4">
      {/* Overview Card */}
      <Card className="overflow-hidden border-border/50 bg-gradient-to-br from-card via-card to-blue-500/5">
        <CardHeader className="p-4 md:p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Badge variant="secondary">Klasse {subject.grade_year}</Badge>
              <div className="text-sm text-muted-foreground">
                M: {subject.oral_weight}% | S: {subject.written_weight}%
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-4 w-4 mr-1" />
              Löschen
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 md:p-6 md:pt-0">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-background/50 border border-border/50 text-center">
              <div className="text-muted-foreground text-xs mb-1 flex items-center justify-center gap-1">
                <Mic className="h-3 w-3" /> Mündlich
              </div>
              <div className="text-2xl font-bold">{oralAvg}</div>
              <div className="text-xs text-muted-foreground">{oralGrades.length} Noten</div>
            </div>
            <div className="p-4 rounded-xl bg-background/50 border border-border/50 text-center">
              <div className="text-muted-foreground text-xs mb-1 flex items-center justify-center gap-1">
                <PenLine className="h-3 w-3" /> Schriftlich
              </div>
              <div className="text-2xl font-bold">{writtenAvg}</div>
              <div className="text-xs text-muted-foreground">{writtenGrades.length} Noten</div>
            </div>
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/20 text-center">
              <div className="text-muted-foreground text-xs mb-1">Gesamt</div>
              <div className={`text-2xl font-bold ${finalGrade !== null ? getGradeColor(finalGrade) : ''}`}>
                {finalGrade !== null ? `${finalGrade} P` : '-'}
              </div>
              <div className="text-xs text-muted-foreground">Endnote</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-2">
        <AddGradeDialog 
          subjectId={subject.id} 
          subjectName={subject.name} 
          onGradeAdded={() => { fetchData(); onDataChanged(); }} 
        />
        <AddHomeworkDialog 
          subjectId={subject.id} 
          subjectName={subject.name} 
          onHomeworkAdded={fetchData} 
        />
        <AddEventDialog 
          subjectId={subject.id} 
          subjectName={subject.name} 
          onEventAdded={fetchData} 
        />
      </div>

      {/* Grades Section */}
      <Collapsible open={gradesOpen} onOpenChange={setGradesOpen}>
        <Card className="overflow-hidden border-border/50 bg-card/80">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/10">
                  <FileText className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Noten</h3>
                  <p className="text-xs text-muted-foreground">{grades.length} eingetragen</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${gradesOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {grades.length === 0 ? (
                <p className="text-muted-foreground text-sm py-2">Noch keine Noten</p>
              ) : (
                grades.map((grade) => (
                  <div key={grade.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-secondary/30">
                    <div className="flex items-center gap-3 min-w-0">
                      <Badge variant={grade.grade_type === 'oral' ? 'secondary' : 'default'} className="shrink-0">
                        {grade.grade_type === 'oral' ? 'M' : 'S'}
                      </Badge>
                      <span className={`font-bold ${getGradeColor(grade.points)}`}>{grade.points} P</span>
                      {grade.description && (
                        <span className="text-sm text-muted-foreground truncate">{grade.description}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {grade.date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(grade.date), 'dd.MM.', { locale: de })}
                        </span>
                      )}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteGrade(grade.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Homework Section */}
      <Collapsible open={homeworkOpen} onOpenChange={setHomeworkOpen}>
        <Card className="overflow-hidden border-border/50 bg-card/80">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/10">
                  <BookOpen className="h-4 w-4 text-orange-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Hausaufgaben</h3>
                  <p className="text-xs text-muted-foreground">{homework.filter(h => !h.completed).length} offen</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${homeworkOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {homework.length === 0 ? (
                <p className="text-muted-foreground text-sm py-2">Keine Hausaufgaben</p>
              ) : (
                homework.map((hw) => (
                  <div key={hw.id} className={`flex items-center justify-between gap-2 p-3 rounded-xl ${hw.completed ? 'bg-primary/10' : 'bg-secondary/30'}`}>
                    <div className="flex items-center gap-3 min-w-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => toggleHomework(hw)}>
                        <CheckCircle2 className={`h-5 w-5 ${hw.completed ? 'text-primary' : 'text-muted-foreground'}`} />
                      </Button>
                      <div className="min-w-0">
                        <span className={`text-sm block truncate ${hw.completed ? 'line-through text-muted-foreground' : ''}`}>
                          {hw.title}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(hw.due_date), 'dd.MM.yy', { locale: de })}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteHomework(hw.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Events Section */}
      <Collapsible open={eventsOpen} onOpenChange={setEventsOpen}>
        <Card className="overflow-hidden border-border/50 bg-card/80">
          <CollapsibleTrigger asChild>
            <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/10">
                  <Calendar className="h-4 w-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm">Termine</h3>
                  <p className="text-xs text-muted-foreground">{events.length} geplant</p>
                </div>
              </div>
              <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${eventsOpen ? 'rotate-180' : ''}`} />
            </div>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-4 pb-4 space-y-2">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-sm py-2">Keine Termine</p>
              ) : (
                events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between gap-2 p-3 rounded-xl bg-secondary/30">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs shrink-0">{event.event_type}</Badge>
                        <span className="text-sm truncate">{event.title}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(event.event_date), 'dd.MM.yy', { locale: de })}
                      </span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => deleteEvent(event.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
