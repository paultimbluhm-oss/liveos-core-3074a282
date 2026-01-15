import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Clock, BookOpen, Calendar, Award, Users, Plus, Trash2, CalendarX, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { useGamification } from '@/contexts/GamificationContext';
import { Course } from './schools/types';
import { DeleteCourseDialog } from './schools/DeleteCourseDialog';

interface SchoolTabsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: 'timetable' | 'course';
  course?: Course | null;
}

interface Grade {
  id: string;
  points: number;
  grade_type: string;
  description: string | null;
  date: string | null;
  course_id: string | null;
}

interface SharedHomework {
  id: string;
  title: string;
  description: string | null;
  due_date: string;
  priority: string | null;
  shared_by: string;
}

interface SharedEvent {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_type: string | null;
}

interface CourseMember {
  id: string;
  user_id: string;
  role: string;
  profile?: { username: string; display_name: string };
}

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period: number;
  course_id: string | null;
  teacher_short: string | null;
  room: string | null;
  week_type: string;
}

interface LessonAbsence {
  id: string;
  date: string;
  reason: string | null;
  excused: boolean | null;
  period: number | null;
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const PERIODS = [1, 2, 3, 4, 5, 6, 8, 9];

export function SchoolTabsDrawer({ open, onOpenChange, context, course }: SchoolTabsDrawerProps) {
  const { user } = useAuth();
  const { addXP } = useGamification();
  const [loading, setLoading] = useState(true);
  const [showAbsences, setShowAbsences] = useState(false);
  
  // Personal timetable data
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [absences, setAbsences] = useState<LessonAbsence[]>([]);
  
  // Course-specific data
  const [homework, setHomework] = useState<SharedHomework[]>([]);
  const [events, setEvents] = useState<SharedEvent[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [members, setMembers] = useState<CourseMember[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  
  // Dialogs
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  const [deleteCourseDialogOpen, setDeleteCourseDialogOpen] = useState(false);
  
  // Form states
  const [hwTitle, setHwTitle] = useState('');
  const [hwDescription, setHwDescription] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [hwPriority, setHwPriority] = useState('medium');
  
  const [evTitle, setEvTitle] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evType, setEvType] = useState('klausur');
  
  const [gradeType, setGradeType] = useState<'oral' | 'written'>('oral');
  const [gradePoints, setGradePoints] = useState('');
  const [gradeDescription, setGradeDescription] = useState('');

  const title = context === 'timetable' ? 'Stundenplan' : course?.name || 'Kurs';

  useEffect(() => {
    if (open && user) {
      fetchData();
    }
  }, [open, user, context, course?.id]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    
    if (context === 'timetable') {
      // Fetch personal timetable
      const [entriesRes, absencesRes] = await Promise.all([
        supabase
          .from('timetable_entries')
          .select('*')
          .eq('user_id', user.id)
          .order('day_of_week')
          .order('period'),
        supabase
          .from('lesson_absences')
          .select('*')
          .eq('user_id', user.id)
          .order('date', { ascending: false }),
      ]);
      
      if (entriesRes.data) setTimetableEntries(entriesRes.data);
      if (absencesRes.data) setAbsences(absencesRes.data);
    } else if (course) {
      // Fetch course-specific data
      const [membersRes, homeworkRes, eventsRes, gradesRes] = await Promise.all([
        supabase
          .from('course_members')
          .select('*, profiles:user_id(username, display_name)')
          .eq('course_id', course.id),
        supabase
          .from('shared_homework')
          .select('*')
          .eq('course_id', course.id)
          .order('due_date'),
        supabase
          .from('shared_events')
          .select('*')
          .eq('course_id', course.id)
          .order('event_date'),
        supabase
          .from('grades')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', course.id)
          .order('date', { ascending: false }),
      ]);
      
      if (membersRes.data) {
        const enrichedMembers = membersRes.data.map((m: any) => ({
          ...m,
          profile: m.profiles,
        }));
        setMembers(enrichedMembers);
        const currentMember = enrichedMembers.find(m => m.user_id === user.id);
        setIsAdmin(currentMember?.role === 'admin');
      }
      if (homeworkRes.data) setHomework(homeworkRes.data);
      if (eventsRes.data) setEvents(eventsRes.data);
      if (gradesRes.data) setGrades(gradesRes.data);
    }
    
    setLoading(false);
  };

  // Homework handlers
  const [savingHomework, setSavingHomework] = useState(false);
  const handleShareHomework = async () => {
    if (!user || !course) {
      toast.error('Nicht angemeldet oder kein Kurs');
      return;
    }
    if (!hwTitle.trim()) {
      toast.error('Titel erforderlich');
      return;
    }
    if (!hwDueDate) {
      toast.error('Datum erforderlich');
      return;
    }
    
    setSavingHomework(true);
    try {
      const { data, error } = await supabase.from('shared_homework').insert({
        course_id: course.id,
        title: hwTitle.trim(),
        description: hwDescription.trim() || null,
        due_date: hwDueDate,
        priority: hwPriority,
        shared_by: user.id,
      }).select().single();
      
      if (error) {
        console.error('Homework save error:', error);
        toast.error(`Fehler: ${error.message}`);
        return;
      }
      
      if (data) {
        toast.success('Aufgabe gespeichert');
        setHwTitle('');
        setHwDescription('');
        setHwDueDate('');
        setHomeworkDialogOpen(false);
        // Optimistic update
        setHomework(prev => [...prev, data as SharedHomework].sort((a, b) => 
          new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
        ));
      }
    } catch (err) {
      console.error('Homework save exception:', err);
      toast.error('Unerwarteter Fehler beim Speichern');
    } finally {
      setSavingHomework(false);
    }
  };

  const deleteHomework = async (id: string) => {
    const { error } = await supabase.from('shared_homework').delete().eq('id', id);
    if (error) {
      toast.error(`Fehler: ${error.message}`);
      return;
    }
    toast.success('Geloescht');
    setHomework(prev => prev.filter(h => h.id !== id));
  };

  // Event handlers
  const [savingEvent, setSavingEvent] = useState(false);
  const handleShareEvent = async () => {
    if (!user || !course) {
      toast.error('Nicht angemeldet oder kein Kurs');
      return;
    }
    if (!evTitle.trim()) {
      toast.error('Titel erforderlich');
      return;
    }
    if (!evDate) {
      toast.error('Datum erforderlich');
      return;
    }
    
    setSavingEvent(true);
    try {
      const { data, error } = await supabase.from('shared_events').insert({
        course_id: course.id,
        title: evTitle.trim(),
        description: evDescription.trim() || null,
        event_date: evDate,
        event_type: evType,
        shared_by: user.id,
      }).select().single();
      
      if (error) {
        console.error('Event save error:', error);
        toast.error(`Fehler: ${error.message}`);
        return;
      }
      
      if (data) {
        toast.success('Termin gespeichert');
        setEvTitle('');
        setEvDescription('');
        setEvDate('');
        setEventDialogOpen(false);
        setEvents(prev => [...prev, data as SharedEvent].sort((a, b) => 
          new Date(a.event_date).getTime() - new Date(b.event_date).getTime()
        ));
      }
    } catch (err) {
      console.error('Event save exception:', err);
      toast.error('Unerwarteter Fehler beim Speichern');
    } finally {
      setSavingEvent(false);
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from('shared_events').delete().eq('id', id);
    if (error) {
      toast.error(`Fehler: ${error.message}`);
      return;
    }
    toast.success('Geloescht');
    setEvents(prev => prev.filter(e => e.id !== id));
  };

  // Grade handlers
  const [savingGrade, setSavingGrade] = useState(false);
  const handleAddGrade = async () => {
    if (!user || !course) {
      toast.error('Nicht angemeldet oder kein Kurs');
      return;
    }
    if (!gradePoints) {
      toast.error('Punkte erforderlich');
      return;
    }
    
    const pointsNum = parseInt(gradePoints);
    if (isNaN(pointsNum) || pointsNum < 0 || pointsNum > 15) {
      toast.error('Punkte muessen zwischen 0 und 15 liegen');
      return;
    }
    
    setSavingGrade(true);
    try {
      const gradeData = {
        user_id: user.id,
        subject_id: course.id,
        course_id: course.id,
        grade_type: gradeType,
        points: pointsNum,
        description: gradeDescription.trim() || (gradeType === 'oral' ? 'Muendlich' : 'Klausur'),
        date: new Date().toISOString().split('T')[0],
      };
      
      const { data, error } = await supabase.from('grades').insert(gradeData).select().single();
      
      if (error) {
        console.error('Grade save error:', error);
        toast.error(`Fehler: ${error.message}`);
        return;
      }
      
      if (data) {
        toast.success('Note gespeichert');
        addXP(5);
        setGradePoints('');
        setGradeDescription('');
        setGradeDialogOpen(false);
        setGrades(prev => [data as Grade, ...prev]);
      }
    } catch (err) {
      console.error('Grade save exception:', err);
      toast.error('Unerwarteter Fehler beim Speichern');
    } finally {
      setSavingGrade(false);
    }
  };

  const deleteGrade = async (id: string) => {
    const { error } = await supabase.from('grades').delete().eq('id', id);
    if (error) {
      toast.error(`Fehler: ${error.message}`);
      return;
    }
    toast.success('Geloescht');
    setGrades(prev => prev.filter(g => g.id !== id));
  };

  // Helper functions
  const getDueDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return { label: 'Heute', color: 'text-amber-500' };
    if (isTomorrow(date)) return { label: 'Morgen', color: 'text-blue-500' };
    if (isPast(date)) return { label: 'Ueberfaellig', color: 'text-rose-500' };
    return { label: format(date, 'EEE, d. MMM', { locale: de }), color: 'text-muted-foreground' };
  };

  const getEventTypeLabel = (type: string | null) => {
    const labels: Record<string, string> = {
      klausur: 'Klausur',
      test: 'Test',
      praesentation: 'Praesentation',
      abgabe: 'Abgabe',
      sonstiges: 'Sonstiges',
    };
    return labels[type || ''] || type || '';
  };

  const getGradeColor = (grade: number | null) => {
    if (grade === null) return 'bg-muted text-muted-foreground';
    if (grade >= 13) return 'bg-emerald-500 text-white';
    if (grade >= 10) return 'bg-amber-500 text-white';
    return 'bg-rose-500 text-white';
  };

  const quickDates = [
    { label: 'Morgen', value: format(addDays(new Date(), 1), 'yyyy-MM-dd') },
    { label: 'In 2 Tagen', value: format(addDays(new Date(), 2), 'yyyy-MM-dd') },
    { label: '1 Woche', value: format(addDays(new Date(), 7), 'yyyy-MM-dd') },
  ];

  // Calculate grades
  const oralGrades = grades.filter(g => g.grade_type === 'oral').map(g => g.points);
  const writtenGrades = grades.filter(g => g.grade_type === 'written').map(g => g.points);
  const oralAvg = oralGrades.length > 0 ? oralGrades.reduce((a, b) => a + b, 0) / oralGrades.length : null;
  const writtenAvg = writtenGrades.length > 0 ? writtenGrades.reduce((a, b) => a + b, 0) / writtenGrades.length : null;
  
  let finalGrade: number | null = null;
  if (oralAvg !== null && writtenAvg !== null) {
    finalGrade = Math.round((writtenAvg * 50 + oralAvg * 50) / 100);
  } else if (oralAvg !== null) {
    finalGrade = Math.round(oralAvg);
  } else if (writtenAvg !== null) {
    finalGrade = Math.round(writtenAvg);
  }

  // Render timetable grid
  const renderTimetableGrid = () => (
    <div className="overflow-x-auto">
      <div className="grid grid-cols-6 gap-0.5 min-w-[320px]">
        <div className="h-6" />
        {DAYS.map(day => (
          <div key={day} className="h-6 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
            {day}
          </div>
        ))}
        
        {PERIODS.map(period => (
          <>
            <div key={`p-${period}`} className="h-9 flex items-center justify-center text-[10px] text-muted-foreground">
              {period}
            </div>
            {DAYS.map((_, dayIndex) => {
              const entry = timetableEntries.find(e => e.day_of_week === dayIndex && e.period === period);
              return (
                <div
                  key={`${dayIndex}-${period}`}
                  className={`h-9 rounded-md flex items-center justify-center text-[9px] font-medium ${
                    entry?.course_id ? 'bg-primary/20 text-primary border border-primary/30' : 'bg-muted/30'
                  }`}
                >
                  {entry?.teacher_short?.slice(0, 3) || ''}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );

  // Render absences view
  const renderAbsences = () => (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => setShowAbsences(false)} className="h-7 text-xs">
          Zurueck
        </Button>
        <span className="text-xs text-muted-foreground">{absences.length} Eintraege</span>
      </div>
      
      {absences.length === 0 ? (
        <div className="py-8 text-center">
          <CalendarX className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
          <p className="text-sm text-muted-foreground">Keine Fehlzeiten</p>
        </div>
      ) : (
        <div className="space-y-2">
          {absences.map(absence => (
            <Card key={absence.id}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {format(new Date(absence.date), 'EEE, d. MMM', { locale: de })}
                    </p>
                    <p className="text-[10px] text-muted-foreground">
                      {absence.period ? `Stunde ${absence.period}` : 'Ganzer Tag'}
                      {absence.reason && ` - ${absence.reason}`}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    absence.excused ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'
                  }`}>
                    {absence.excused ? 'Entschuldigt' : 'Unentschuldigt'}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-xl p-0">
        <SheetHeader className="px-4 pt-4 pb-2">
          <div className="flex items-center justify-between">
            <SheetTitle className="flex items-center gap-2">
              {context === 'course' && course && (
                <div 
                  className="w-8 h-8 rounded-lg flex items-center justify-center border-2"
                  style={{ borderColor: course.color || 'hsl(var(--primary))' }}
                >
                  <span className="text-xs font-bold" style={{ color: course.color || 'hsl(var(--primary))' }}>
                    {(course.short_name || course.name).slice(0, 2).toUpperCase()}
                  </span>
                </div>
              )}
              {title}
            </SheetTitle>
            
            {context === 'timetable' && !showAbsences && (
              <Button 
                variant="outline" 
                size="sm" 
                className="h-7 text-[10px] gap-1"
                onClick={() => setShowAbsences(true)}
              >
                <CalendarX className="w-3 h-3" strokeWidth={1.5} />
                Fehltage
              </Button>
            )}
          </div>
        </SheetHeader>
        
        <div className="px-4 pb-4 pt-2 overflow-auto h-[calc(85vh-80px)]">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : showAbsences ? (
            renderAbsences()
          ) : (
            <Tabs defaultValue="plan">
              <TabsList className="grid w-full grid-cols-5 h-9">
                <TabsTrigger value="plan" className="text-[9px] gap-0.5 px-1">
                  <Clock className="w-3 h-3" strokeWidth={1.5} />
                  Plan
                </TabsTrigger>
                <TabsTrigger value="aufgaben" className="text-[9px] gap-0.5 px-1">
                  <BookOpen className="w-3 h-3" strokeWidth={1.5} />
                  Aufgaben
                </TabsTrigger>
                <TabsTrigger value="termine" className="text-[9px] gap-0.5 px-1">
                  <Calendar className="w-3 h-3" strokeWidth={1.5} />
                  Termine
                </TabsTrigger>
                <TabsTrigger value="noten" className="text-[9px] gap-0.5 px-1">
                  <Award className="w-3 h-3" strokeWidth={1.5} />
                  Noten
                </TabsTrigger>
                <TabsTrigger value="team" className="text-[9px] gap-0.5 px-1">
                  <Users className="w-3 h-3" strokeWidth={1.5} />
                  Team
                </TabsTrigger>
              </TabsList>
              
              {/* Plan Tab */}
              <TabsContent value="plan" className="mt-3">
                {context === 'timetable' ? (
                  renderTimetableGrid()
                ) : (
                  <div className="py-8 text-center">
                    <Clock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Kurs-Stunden im persoenlichen Stundenplan</p>
                  </div>
                )}
              </TabsContent>
              
              {/* Aufgaben Tab */}
              <TabsContent value="aufgaben" className="mt-3 space-y-3">
                {context === 'course' && (
                  <Button size="sm" className="w-full h-8 gap-1" onClick={() => setHomeworkDialogOpen(true)}>
                    <Plus className="w-3 h-3" strokeWidth={1.5} />
                    Aufgabe hinzufuegen
                  </Button>
                )}
                
                {homework.length === 0 ? (
                  <div className="py-8 text-center">
                    <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Keine Aufgaben</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {homework.map(hw => {
                      const dateInfo = getDueDateLabel(hw.due_date);
                      return (
                        <Card key={hw.id}>
                          <CardContent className="p-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-sm truncate">{hw.title}</p>
                                {hw.description && (
                                  <p className="text-[10px] text-muted-foreground truncate">{hw.description}</p>
                                )}
                                <p className={`text-[10px] ${dateInfo.color}`}>{dateInfo.label}</p>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-6 w-6"
                                onClick={() => deleteHomework(hw.id)}
                              >
                                <Trash2 className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>
              
              {/* Termine Tab */}
              <TabsContent value="termine" className="mt-3 space-y-3">
                {context === 'course' && (
                  <Button size="sm" className="w-full h-8 gap-1" onClick={() => setEventDialogOpen(true)}>
                    <Plus className="w-3 h-3" strokeWidth={1.5} />
                    Termin hinzufuegen
                  </Button>
                )}
                
                {events.length === 0 ? (
                  <div className="py-8 text-center">
                    <Calendar className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Keine Termine</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {events.map(event => (
                      <Card key={event.id}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-primary/20 text-primary">
                                  {getEventTypeLabel(event.event_type)}
                                </span>
                                <span className="font-medium text-sm truncate">{event.title}</span>
                              </div>
                              <p className="text-[10px] text-muted-foreground">
                                {format(new Date(event.event_date), 'EEE, d. MMM', { locale: de })}
                              </p>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6"
                              onClick={() => deleteEvent(event.id)}
                            >
                              <Trash2 className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
              
              {/* Noten Tab */}
              <TabsContent value="noten" className="mt-3 space-y-3">
                {context === 'course' && (
                  <>
                    {/* Grade summary */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className={`p-2 rounded-lg text-center ${getGradeColor(oralAvg !== null ? Math.round(oralAvg) : null)}`}>
                        <div className="text-lg font-bold">{oralAvg !== null ? oralAvg.toFixed(1) : '-'}</div>
                        <div className="text-[9px] opacity-80">Muendlich</div>
                      </div>
                      <div className={`p-2 rounded-lg text-center ${getGradeColor(writtenAvg !== null ? Math.round(writtenAvg) : null)}`}>
                        <div className="text-lg font-bold">{writtenAvg !== null ? writtenAvg.toFixed(1) : '-'}</div>
                        <div className="text-[9px] opacity-80">Schriftlich</div>
                      </div>
                      <div className={`p-2 rounded-lg text-center ${getGradeColor(finalGrade)}`}>
                        <div className="text-lg font-bold">{finalGrade ?? '-'}</div>
                        <div className="text-[9px] opacity-80">Gesamt</div>
                      </div>
                    </div>
                    
                    <Button size="sm" className="w-full h-8 gap-1" onClick={() => setGradeDialogOpen(true)}>
                      <Plus className="w-3 h-3" strokeWidth={1.5} />
                      Note hinzufuegen
                    </Button>
                    
                    {grades.length === 0 ? (
                      <div className="py-6 text-center">
                        <Award className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
                        <p className="text-sm text-muted-foreground">Keine Noten</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {grades.map(grade => (
                          <Card key={grade.id}>
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${getGradeColor(grade.points)}`}>
                                    <span className="text-sm font-bold">{grade.points}</span>
                                  </div>
                                  <div>
                                    <p className="text-sm font-medium">{grade.description}</p>
                                    <p className="text-[10px] text-muted-foreground">
                                      {grade.grade_type === 'oral' ? 'Muendlich' : 'Schriftlich'}
                                    </p>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-6 w-6"
                                  onClick={() => deleteGrade(grade.id)}
                                >
                                  <Trash2 className="w-3 h-3 text-muted-foreground" strokeWidth={1.5} />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </>
                )}
                
                {context === 'timetable' && (
                  <div className="py-8 text-center">
                    <Award className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">Waehle einen Kurs fuer Noten</p>
                  </div>
                )}
              </TabsContent>
              
              {/* Team Tab */}
              <TabsContent value="team" className="mt-3 space-y-3">
                {context === 'course' && members.length > 0 ? (
                  <>
                    <div className="space-y-2">
                      {members.map(member => (
                        <Card key={member.id}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                                  <span className="text-xs font-medium text-primary">
                                    {(member.profile?.display_name || member.profile?.username || '?').slice(0, 2).toUpperCase()}
                                  </span>
                                </div>
                                <span className="text-sm font-medium">
                                  {member.profile?.display_name || member.profile?.username || 'Unbekannt'}
                                </span>
                              </div>
                              {member.role === 'admin' && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                                  Admin
                                </span>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {/* Admin Delete Button */}
                    {isAdmin && course && (
                      <div className="pt-4 border-t border-border/50">
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full h-8 text-xs"
                          onClick={() => setDeleteCourseDialogOpen(true)}
                        >
                          <Trash2 className="w-3 h-3 mr-1" strokeWidth={1.5} />
                          Kurs loeschen
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <Users className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
                    <p className="text-sm text-muted-foreground">
                      {context === 'timetable' ? 'Waehle einen Kurs' : 'Keine Mitglieder'}
                    </p>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
        
        {/* Homework Dialog */}
        <Dialog open={homeworkDialogOpen} onOpenChange={setHomeworkDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Aufgabe hinzufuegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Titel</Label>
                <Input 
                  value={hwTitle} 
                  onChange={e => setHwTitle(e.target.value)} 
                  placeholder="Was ist zu tun?"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Beschreibung</Label>
                <Textarea 
                  value={hwDescription} 
                  onChange={e => setHwDescription(e.target.value)} 
                  placeholder="Details..."
                  className="min-h-[60px]"
                />
              </div>
              <div>
                <Label className="text-xs">Faellig am</Label>
                <Input 
                  type="date" 
                  value={hwDueDate} 
                  onChange={e => setHwDueDate(e.target.value)}
                  className="h-9"
                />
                <div className="flex gap-1 mt-1">
                  {quickDates.map(d => (
                    <Button 
                      key={d.label} 
                      variant="outline" 
                      size="sm" 
                      className="h-6 text-[10px] flex-1"
                      onClick={() => setHwDueDate(d.value)}
                    >
                      {d.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Button className="w-full" onClick={handleShareHomework}>Teilen</Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Event Dialog */}
        <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Termin hinzufuegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Titel</Label>
                <Input 
                  value={evTitle} 
                  onChange={e => setEvTitle(e.target.value)} 
                  placeholder="z.B. Klausur Kapitel 3"
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Typ</Label>
                <Select value={evType} onValueChange={setEvType}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="klausur">Klausur</SelectItem>
                    <SelectItem value="test">Test</SelectItem>
                    <SelectItem value="praesentation">Praesentation</SelectItem>
                    <SelectItem value="abgabe">Abgabe</SelectItem>
                    <SelectItem value="sonstiges">Sonstiges</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Datum</Label>
                <Input 
                  type="date" 
                  value={evDate} 
                  onChange={e => setEvDate(e.target.value)}
                  className="h-9"
                />
              </div>
              <Button className="w-full" onClick={handleShareEvent}>Teilen</Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Grade Dialog */}
        <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Note hinzufuegen</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <Button 
                  variant={gradeType === 'oral' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGradeType('oral')}
                >
                  Muendlich
                </Button>
                <Button 
                  variant={gradeType === 'written' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setGradeType('written')}
                >
                  Schriftlich
                </Button>
              </div>
              <div>
                <Label className="text-xs">Punkte (0-15)</Label>
                <Input 
                  type="number" 
                  min="0" 
                  max="15"
                  value={gradePoints} 
                  onChange={e => setGradePoints(e.target.value)}
                  className="h-9"
                />
              </div>
              <div>
                <Label className="text-xs">Beschreibung</Label>
                <Input 
                  value={gradeDescription} 
                  onChange={e => setGradeDescription(e.target.value)}
                  placeholder="z.B. Praesentation, Klausur..."
                  className="h-9"
                />
              </div>
              <Button className="w-full" onClick={handleAddGrade} disabled={savingGrade}>
                {savingGrade ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Delete Course Dialog */}
        {course && (
          <DeleteCourseDialog
            open={deleteCourseDialogOpen}
            onOpenChange={setDeleteCourseDialogOpen}
            courseId={course.id}
            courseName={course.name}
            onDeleted={() => {
              onOpenChange(false);
            }}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}
