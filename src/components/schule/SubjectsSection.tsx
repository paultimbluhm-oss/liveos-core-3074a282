import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ArrowLeft, GraduationCap, BookOpen, Calendar, TrendingUp, ChevronDown, ChevronRight, Edit2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { AddSubjectDialog } from './AddSubjectDialog';
import { EditSubjectDialog } from './EditSubjectDialog';
import { SubjectCard } from './SubjectCard';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Subject {
  id: string;
  name: string;
  short_name?: string | null;
  grade_year: number;
  written_weight: number;
  oral_weight: number;
}

interface Homework {
  id: string;
  title: string;
  due_date: string;
  completed: boolean;
  subjects: { name: string } | null;
}

interface SchoolEvent {
  id: string;
  title: string;
  event_date: string;
  event_type: string;
  subjects: { name: string } | null;
}

interface SubjectGradeData {
  subjectId: string;
  finalGrade: number | null;
  oralAvg: number | null;
  writtenAvg: number | null;
}

interface SubjectsSectionProps {
  onBack: () => void;
}

export function SubjectsSection({ onBack }: SubjectsSectionProps) {
  const { user } = useAuth();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectGrades, setSubjectGrades] = useState<Record<string, SubjectGradeData>>({});
  const [upcomingHomework, setUpcomingHomework] = useState<Homework[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<SchoolEvent[]>([]);
  const [averageGrade, setAverageGrade] = useState<number | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [homeworkOpen, setHomeworkOpen] = useState(false);
  const [eventsOpen, setEventsOpen] = useState(false);

  const fetchData = async () => {
    if (!user) return;

    const { data: subjectsData } = await supabase
      .from('subjects')
      .select('*')
      .eq('user_id', user.id)
      .order('name');
    
    if (subjectsData) setSubjects(subjectsData);

    const today = new Date().toISOString().split('T')[0];
    const { data: homeworkData } = await supabase
      .from('homework')
      .select('id, title, due_date, completed, subjects(name)')
      .eq('user_id', user.id)
      .eq('completed', false)
      .gte('due_date', today)
      .order('due_date')
      .limit(5);
    
    if (homeworkData) setUpcomingHomework(homeworkData as Homework[]);

    const { data: eventsData } = await supabase
      .from('school_events')
      .select('id, title, event_date, event_type, subjects(name)')
      .eq('user_id', user.id)
      .gte('event_date', today)
      .order('event_date')
      .limit(5);
    
    if (eventsData) setUpcomingEvents(eventsData as SchoolEvent[]);

    const { data: gradesData } = await supabase
      .from('grades')
      .select('points, grade_type, subject_id')
      .eq('user_id', user.id);
    
    if (gradesData && subjectsData) {
      const subjectGradeMap: Record<string, { oral: number[], written: number[], weights: { oral: number, written: number } }> = {};
      const gradeDataResult: Record<string, SubjectGradeData> = {};
      
      subjectsData.forEach(subject => {
        subjectGradeMap[subject.id] = { 
          oral: [], 
          written: [], 
          weights: { oral: subject.oral_weight, written: subject.written_weight } 
        };
      });

      gradesData.forEach(grade => {
        if (subjectGradeMap[grade.subject_id]) {
          if (grade.grade_type === 'oral') {
            subjectGradeMap[grade.subject_id].oral.push(grade.points);
          } else {
            subjectGradeMap[grade.subject_id].written.push(grade.points);
          }
        }
      });

      const finalGrades: number[] = [];
      Object.entries(subjectGradeMap).forEach(([subjectId, { oral, written, weights }]) => {
        const oralAvg = oral.length > 0 ? oral.reduce((a, b) => a + b, 0) / oral.length : null;
        const writtenAvg = written.length > 0 ? written.reduce((a, b) => a + b, 0) / written.length : null;

        let finalGrade: number | null = null;
        if (oralAvg !== null && writtenAvg !== null) {
          finalGrade = Math.round((writtenAvg * weights.written + oralAvg * weights.oral) / 100);
          finalGrades.push(finalGrade);
        } else if (oralAvg !== null) {
          finalGrade = Math.round(oralAvg);
          finalGrades.push(finalGrade);
        } else if (writtenAvg !== null) {
          finalGrade = Math.round(writtenAvg);
          finalGrades.push(finalGrade);
        }

        gradeDataResult[subjectId] = {
          subjectId,
          finalGrade,
          oralAvg,
          writtenAvg
        };
      });

      setSubjectGrades(gradeDataResult);

      if (finalGrades.length > 0) {
        setAverageGrade(Math.round((finalGrades.reduce((a, b) => a + b, 0) / finalGrades.length) * 10) / 10);
      }
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'text-muted-foreground';
    if (grade >= 13) return 'text-green-400';
    if (grade >= 10) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (selectedSubject) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setSelectedSubject(null)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10">
            <GraduationCap className="w-5 h-5 text-blue-400" />
          </div>
          <h2 className="text-xl font-bold flex-1">
            {selectedSubject.name}
            {selectedSubject.short_name && (
              <span className="text-muted-foreground font-normal ml-2">({selectedSubject.short_name})</span>
            )}
          </h2>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setEditingSubject(selectedSubject)}
            className="shrink-0"
          >
            <Edit2 className="w-4 h-4" />
          </Button>
        </div>
        <SubjectCard 
          subject={selectedSubject} 
          onDeleted={() => { setSelectedSubject(null); fetchData(); }}
          onDataChanged={fetchData}
        />
        
        {editingSubject && (
          <EditSubjectDialog
            subject={editingSubject}
            open={!!editingSubject}
            onOpenChange={(open) => !open && setEditingSubject(null)}
            onSubjectUpdated={() => {
              fetchData();
              // Update selected subject with new data
              supabase
                .from('subjects')
                .select('*')
                .eq('id', editingSubject.id)
                .single()
                .then(({ data }) => {
                  if (data) setSelectedSubject(data);
                });
            }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-card via-card to-blue-500/5 border border-border/50 p-6">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/20">
              <GraduationCap className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Fächer</h1>
              <p className="text-muted-foreground text-sm">Deine Schulfächer im Überblick</p>
            </div>
          </div>
          <div className="hidden sm:block">
            <AddSubjectDialog onSubjectAdded={fetchData} />
          </div>
        </div>

        {/* Quick Stats */}
        <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
          <div className="p-3 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <GraduationCap className="h-3.5 w-3.5" />
              Fächer
            </div>
            <div className="text-xl font-bold">{subjects.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <TrendingUp className="h-3.5 w-3.5" />
              Durchschnitt
            </div>
            <div className={`text-xl font-bold ${getGradeColor(averageGrade)}`}>
              {averageGrade !== null ? `${averageGrade} P` : '-'}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <BookOpen className="h-3.5 w-3.5" />
              Hausaufgaben
            </div>
            <div className="text-xl font-bold">{upcomingHomework.length}</div>
          </div>
          <div className="p-3 rounded-xl bg-background/50 border border-border/50 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
              <Calendar className="h-3.5 w-3.5" />
              Termine
            </div>
            <div className="text-xl font-bold">{upcomingEvents.length}</div>
          </div>
        </div>
      </div>

      {/* Collapsible Sections */}
      <div className="space-y-3">
        {/* Upcoming Homework */}
        <Collapsible open={homeworkOpen} onOpenChange={setHomeworkOpen}>
          <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500/20 to-amber-500/10">
                    <BookOpen className="h-4 w-4 text-orange-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Nächste Hausaufgaben</h3>
                    <p className="text-xs text-muted-foreground">{upcomingHomework.length} offen</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${homeworkOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-2">
                {upcomingHomework.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-2">Keine offenen Hausaufgaben</p>
                ) : (
                  upcomingHomework.map((hw) => (
                    <div key={hw.id} className="flex justify-between items-center gap-2 p-3 rounded-xl bg-secondary/30">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{hw.title}</div>
                        <div className="text-xs text-muted-foreground">{hw.subjects?.name}</div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {format(new Date(hw.due_date), 'dd.MM.', { locale: de })}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* Upcoming Events */}
        <Collapsible open={eventsOpen} onOpenChange={setEventsOpen}>
          <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between p-4 cursor-pointer hover:bg-secondary/30 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500/20 to-violet-500/10">
                    <Calendar className="h-4 w-4 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Nächste Termine</h3>
                    <p className="text-xs text-muted-foreground">{upcomingEvents.length} anstehend</p>
                  </div>
                </div>
                <ChevronDown className={`h-5 w-5 text-muted-foreground transition-transform ${eventsOpen ? 'rotate-180' : ''}`} />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="px-4 pb-4 space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-2">Keine anstehenden Termine</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <div key={event.id} className="flex justify-between items-center gap-2 p-3 rounded-xl bg-secondary/30">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{event.title}</div>
                        <div className="text-xs text-muted-foreground">{event.subjects?.name} • {event.event_type}</div>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {format(new Date(event.event_date), 'dd.MM.', { locale: de })}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Subject Tiles Grid */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Deine Fächer</h3>
        {subjects.length === 0 ? (
          <Card className="border-border/50 bg-card/80">
            <CardContent className="py-12 text-center">
              <div className="p-4 rounded-2xl bg-secondary/30 w-fit mx-auto mb-4">
                <GraduationCap className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground">Noch keine Fächer vorhanden</p>
              <p className="text-sm text-muted-foreground mb-4">Füge dein erstes Fach hinzu.</p>
              <AddSubjectDialog onSubjectAdded={fetchData} />
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {subjects.map((subject) => {
              const gradeData = subjectGrades[subject.id] || null;
              const finalGrade = gradeData?.finalGrade;
              const oralAvg = gradeData?.oralAvg;
              const writtenAvg = gradeData?.writtenAvg;
              return (
                <Card 
                  key={subject.id}
                  onClick={() => setSelectedSubject(subject)}
                  className="group cursor-pointer overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500/20 to-indigo-500/10 group-hover:from-blue-500/30 group-hover:to-indigo-500/20 transition-colors">
                        <GraduationCap className="h-4 w-4 text-blue-400" />
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h4 className="font-semibold text-sm truncate mb-1 group-hover:text-blue-400 transition-colors">
                      {subject.name}
                    </h4>
                    <div className="flex items-center justify-between">
                      <Badge variant="secondary" className="text-xs">
                        Kl. {subject.grade_year}
                      </Badge>
                      {finalGrade !== null && finalGrade !== undefined && (
                        <span className={`text-lg font-bold ${getGradeColor(finalGrade)}`}>
                          {finalGrade}P
                        </span>
                      )}
                    </div>
                    {(oralAvg != null || writtenAvg != null) && (
                      <div className="mt-2 pt-2 border-t border-border/50 flex gap-2 text-xs text-muted-foreground">
                        {oralAvg != null && (
                          <span>M: {oralAvg.toFixed(0)}</span>
                        )}
                        {writtenAvg != null && (
                          <span>S: {writtenAvg.toFixed(0)}</span>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Mobile Add Button */}
      <div className="sm:hidden">
        <AddSubjectDialog onSubjectAdded={fetchData} />
      </div>
    </div>
  );
}
