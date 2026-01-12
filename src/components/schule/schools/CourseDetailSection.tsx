import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, BookOpen, Calendar, Users, Plus, Trash2, Award, Clock, CalendarX, Check } from 'lucide-react';
import { toast } from 'sonner';
import { format, isPast, isToday, isTomorrow, addDays } from 'date-fns';
import { de } from 'date-fns/locale';
import { Course, CourseMember, SharedHomework, SharedEvent, CourseTimetableSlot } from './types';
import { useGamification } from '@/contexts/GamificationContext';

interface Grade {
  id: string;
  points: number;
  grade_type: string;
  description: string | null;
  date: string | null;
  course_id: string | null;
}

interface LessonAbsence {
  id: string;
  date: string;
  reason: string;
  excused: boolean;
  timetable_entry_id: string;
}

interface CourseDetailSectionProps {
  course: Course;
  onBack: () => void;
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const DAYS_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const PERIODS = [1, 2, 3, 4, 5, 6, 8, 9];

export function CourseDetailSection({ course, onBack }: CourseDetailSectionProps) {
  const { user } = useAuth();
  const { addXP } = useGamification();
  const [members, setMembers] = useState<CourseMember[]>([]);
  const [homework, setHomework] = useState<SharedHomework[]>([]);
  const [events, setEvents] = useState<SharedEvent[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [sharedSlots, setSharedSlots] = useState<CourseTimetableSlot[]>([]);
  const [absences, setAbsences] = useState<LessonAbsence[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  
  const [homeworkDialogOpen, setHomeworkDialogOpen] = useState(false);
  const [eventDialogOpen, setEventDialogOpen] = useState(false);
  const [gradeDialogOpen, setGradeDialogOpen] = useState(false);
  
  // Homework form
  const [hwTitle, setHwTitle] = useState('');
  const [hwDescription, setHwDescription] = useState('');
  const [hwDueDate, setHwDueDate] = useState('');
  const [hwPriority, setHwPriority] = useState('medium');
  
  // Event form
  const [evTitle, setEvTitle] = useState('');
  const [evDescription, setEvDescription] = useState('');
  const [evDate, setEvDate] = useState('');
  const [evType, setEvType] = useState('klausur');
  
  // Grade form
  const [gradeType, setGradeType] = useState<'oral' | 'written'>('oral');
  const [gradePoints, setGradePoints] = useState('');
  const [gradeDescription, setGradeDescription] = useState('');

  const fetchData = async () => {
    if (!user) return;
    
    const [membersRes, homeworkRes, eventsRes, gradesRes, slotsRes, absencesRes] = await Promise.all([
      supabase
        .from('course_members')
        .select('*, profiles:user_id(username, display_name)')
        .eq('course_id', course.id),
      supabase
        .from('shared_homework')
        .select('*, profiles:shared_by(username, display_name)')
        .eq('course_id', course.id)
        .order('due_date'),
      supabase
        .from('shared_events')
        .select('*, profiles:shared_by(username, display_name)')
        .eq('course_id', course.id)
        .order('event_date'),
      supabase
        .from('grades')
        .select('*')
        .eq('user_id', user.id)
        .eq('course_id', course.id)
        .order('date', { ascending: false }),
      supabase
        .from('course_timetable_slots')
        .select('*')
        .eq('course_id', course.id)
        .order('day_of_week')
        .order('period'),
      supabase
        .from('lesson_absences')
        .select('*')
        .eq('user_id', user.id),
    ]);
    
    if (membersRes.data) {
      const enrichedMembers = membersRes.data.map((m: any) => ({
        ...m,
        profile: m.profiles,
      }));
      setMembers(enrichedMembers);
      
      // Check if current user is admin
      const currentMember = enrichedMembers.find(m => m.user_id === user.id);
      setIsAdmin(currentMember?.role === 'admin');
    }
    
    if (homeworkRes.data) {
      setHomework(homeworkRes.data.map((h: any) => ({
        ...h,
        sharer_profile: h.profiles,
      })));
    }
    
    if (eventsRes.data) {
      setEvents(eventsRes.data.map((e: any) => ({
        ...e,
        sharer_profile: e.profiles,
      })));
    }
    
    if (gradesRes.data) {
      setGrades(gradesRes.data);
    }
    
    if (slotsRes.data) {
      setSharedSlots(slotsRes.data);
    }
    
    if (absencesRes.data) {
      setAbsences(absencesRes.data);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [course.id, user]);

  // Homework handlers
  const handleShareHomework = async () => {
    if (!user || !hwTitle.trim() || !hwDueDate) {
      toast.error('Titel und Datum erforderlich');
      return;
    }
    
    const { error } = await supabase.from('shared_homework').insert({
      course_id: course.id,
      title: hwTitle.trim(),
      description: hwDescription.trim() || null,
      due_date: hwDueDate,
      priority: hwPriority,
      shared_by: user.id,
    });
    
    if (error) {
      toast.error('Fehler beim Teilen');
    } else {
      toast.success('Hausaufgabe geteilt');
      setHwTitle('');
      setHwDescription('');
      setHwDueDate('');
      setHwPriority('medium');
      setHomeworkDialogOpen(false);
      fetchData();
    }
  };

  const deleteHomework = async (id: string) => {
    const { error } = await supabase.from('shared_homework').delete().eq('id', id);
    if (!error) {
      toast.success('Geloescht');
      fetchData();
    }
  };

  // Event handlers
  const handleShareEvent = async () => {
    if (!user || !evTitle.trim() || !evDate) {
      toast.error('Titel und Datum erforderlich');
      return;
    }
    
    const { error } = await supabase.from('shared_events').insert({
      course_id: course.id,
      title: evTitle.trim(),
      description: evDescription.trim() || null,
      event_date: evDate,
      event_type: evType,
      shared_by: user.id,
    });
    
    if (error) {
      toast.error('Fehler beim Teilen');
    } else {
      toast.success('Termin geteilt');
      setEvTitle('');
      setEvDescription('');
      setEvDate('');
      setEvType('klausur');
      setEventDialogOpen(false);
      fetchData();
    }
  };

  const deleteEvent = async (id: string) => {
    const { error } = await supabase.from('shared_events').delete().eq('id', id);
    if (!error) {
      toast.success('Geloescht');
      fetchData();
    }
  };

  // Grade handlers (private)
  const handleAddGrade = async () => {
    if (!user || !gradePoints) {
      toast.error('Punkte erforderlich');
      return;
    }
    
    const pointsNum = parseInt(gradePoints);
    if (isNaN(pointsNum) || pointsNum < 0 || pointsNum > 15) {
      toast.error('Punkte muessen zwischen 0 und 15 liegen');
      return;
    }
    
    const { error } = await supabase.from('grades').insert({
      user_id: user.id,
      subject_id: course.id,
      course_id: course.id,
      grade_type: gradeType,
      points: pointsNum,
      description: gradeDescription.trim() || (gradeType === 'oral' ? 'Muendlich' : 'Klausur'),
    });
    
    if (error) {
      toast.error('Fehler beim Speichern');
    } else {
      toast.success('Note hinzugefuegt');
      addXP(5);
      setGradePoints('');
      setGradeDescription('');
      setGradeDialogOpen(false);
      fetchData();
    }
  };

  const deleteGrade = async (id: string) => {
    const { error } = await supabase.from('grades').delete().eq('id', id);
    if (!error) {
      toast.success('Geloescht');
      fetchData();
    }
  };

  // Timetable slot handlers (shared - only admin)
  const toggleSlot = async (day: number, period: number) => {
    if (!isAdmin) return;
    
    const existingSlot = sharedSlots.find(s => s.day_of_week === day && s.period === period);
    
    if (existingSlot) {
      const { error } = await supabase
        .from('course_timetable_slots')
        .delete()
        .eq('id', existingSlot.id);
      
      if (!error) {
        toast.success('Stunde entfernt');
        fetchData();
      }
    } else {
      const { error } = await supabase.from('course_timetable_slots').insert({
        course_id: course.id,
        day_of_week: day,
        period: period,
        room: course.room || null,
      });
      
      if (!error) {
        toast.success('Stunde hinzugefuegt');
        fetchData();
      }
    }
  };

  const isSlotSelected = (day: number, period: number) => {
    return sharedSlots.some(s => s.day_of_week === day && s.period === period);
  };

  // Apply shared slots to personal timetable
  const applyToMyTimetable = async () => {
    if (!user || sharedSlots.length === 0) return;
    
    for (const slot of sharedSlots) {
      // Check if slot already exists
      const { data: existing } = await supabase
        .from('timetable_entries')
        .select('id')
        .eq('user_id', user.id)
        .eq('day_of_week', slot.day_of_week)
        .eq('period', slot.period)
        .maybeSingle();
      
      if (existing) {
        await supabase
          .from('timetable_entries')
          .update({
            course_id: course.id,
            teacher_short: course.teacher_name || '',
            room: slot.room || null,
          })
          .eq('id', existing.id);
      } else {
        await supabase.from('timetable_entries').insert({
          user_id: user.id,
          day_of_week: slot.day_of_week,
          period: slot.period,
          course_id: course.id,
          teacher_short: course.teacher_name || '',
          room: slot.room || null,
          week_type: 'both',
        });
      }
    }
    
    toast.success('Stundenplan aktualisiert');
  };

  // Calculations
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

  const getDueDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return { label: 'Heute', color: 'text-amber-500' };
    if (isTomorrow(date)) return { label: 'Morgen', color: 'text-blue-500' };
    if (isPast(date)) return { label: 'Ueberfaellig', color: 'text-rose-500' };
    return { label: format(date, 'EEE, d. MMM', { locale: de }), color: 'text-muted-foreground' };
  };

  const getEventTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      klausur: 'Klausur',
      test: 'Test',
      praesentation: 'Praesentation',
      abgabe: 'Abgabe',
      sonstiges: 'Sonstiges',
    };
    return labels[type] || type;
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={onBack} className="h-8 w-8">
          <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
        </Button>
        <div className="flex items-center gap-2">
          <div 
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ 
              borderWidth: 2, 
              borderColor: course.color || 'hsl(var(--primary))',
              borderStyle: 'solid'
            }}
          >
            <span 
              className="text-xs font-bold"
              style={{ color: course.color || 'hsl(var(--primary))' }}
            >
              {(course.short_name || course.name).slice(0, 2).toUpperCase()}
            </span>
          </div>
          <div>
            <h2 className="font-bold">{course.name}</h2>
            {course.teacher_name && (
              <p className="text-[10px] text-muted-foreground">{course.teacher_name}</p>
            )}
          </div>
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="p-2.5 rounded-xl bg-card border border-border/50 text-center">
          <div className="text-lg font-bold">{members.length}</div>
          <div className="text-[9px] text-muted-foreground">Mitglieder</div>
        </div>
        <div className={`p-2.5 rounded-xl border text-center ${finalGrade !== null && finalGrade >= 10 ? 'bg-emerald-500/10 border-emerald-500/30' : finalGrade !== null ? 'bg-amber-500/10 border-amber-500/30' : 'bg-card border-border/50'}`}>
          <div className={`text-lg font-bold ${finalGrade !== null && finalGrade >= 13 ? 'text-emerald-500' : finalGrade !== null && finalGrade >= 10 ? 'text-amber-500' : finalGrade !== null ? 'text-rose-500' : ''}`}>
            {finalGrade ?? '-'}
          </div>
          <div className="text-[9px] text-muted-foreground">Schnitt</div>
        </div>
        <div className="p-2.5 rounded-xl bg-card border border-border/50 text-center">
          <div className="text-lg font-bold">{sharedSlots.length}</div>
          <div className="text-[9px] text-muted-foreground">Stunden</div>
        </div>
        <div className="p-2.5 rounded-xl bg-card border border-border/50 text-center">
          <div className="text-lg font-bold">{homework.filter(h => !isPast(new Date(h.due_date))).length}</div>
          <div className="text-[9px] text-muted-foreground">Aufgaben</div>
        </div>
      </div>
      
      {/* Tabs */}
      <Tabs defaultValue="schedule">
        <TabsList className="grid w-full grid-cols-5 h-9">
          <TabsTrigger value="schedule" className="text-[9px] gap-0.5 px-1">
            <Clock className="w-3 h-3" strokeWidth={1.5} />
            Plan
          </TabsTrigger>
          <TabsTrigger value="homework" className="text-[9px] gap-0.5 px-1">
            <BookOpen className="w-3 h-3" strokeWidth={1.5} />
            Aufgaben
          </TabsTrigger>
          <TabsTrigger value="events" className="text-[9px] gap-0.5 px-1">
            <Calendar className="w-3 h-3" strokeWidth={1.5} />
            Termine
          </TabsTrigger>
          <TabsTrigger value="grades" className="text-[9px] gap-0.5 px-1">
            <Award className="w-3 h-3" strokeWidth={1.5} />
            Noten
          </TabsTrigger>
          <TabsTrigger value="members" className="text-[9px] gap-0.5 px-1">
            <Users className="w-3 h-3" strokeWidth={1.5} />
            Team
          </TabsTrigger>
        </TabsList>
        
        {/* Schedule Tab - Grid for selecting slots */}
        <TabsContent value="schedule" className="mt-3 space-y-3">
          {isAdmin && (
            <p className="text-[10px] text-muted-foreground text-center">
              Klicke auf die Felder um Stunden hinzuzufuegen
            </p>
          )}
          
          {/* Timetable Grid */}
          <div className="overflow-x-auto">
            <div className="grid grid-cols-6 gap-0.5 min-w-[320px]">
              {/* Header */}
              <div className="h-7" />
              {DAYS.map(day => (
                <div key={day} className="h-7 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              
              {/* Periods */}
              {PERIODS.map(period => (
                <>
                  <div key={`period-${period}`} className="h-8 flex items-center justify-center text-[10px] font-medium text-muted-foreground">
                    {period}.
                  </div>
                  {DAYS.map((_, dayIndex) => {
                    const day = dayIndex + 1;
                    const selected = isSlotSelected(day, period);
                    return (
                      <button
                        key={`${day}-${period}`}
                        onClick={() => toggleSlot(day, period)}
                        disabled={!isAdmin}
                        className={`h-8 rounded transition-colors border ${
                          selected 
                            ? 'bg-primary text-primary-foreground border-primary' 
                            : isAdmin
                              ? 'bg-muted/30 border-border/50 hover:bg-muted/50'
                              : 'bg-muted/20 border-border/30'
                        } ${isAdmin ? 'cursor-pointer' : 'cursor-default'}`}
                      >
                        {selected && <Check className="w-3 h-3 mx-auto" strokeWidth={2} />}
                      </button>
                    );
                  })}
                </>
              ))}
            </div>
          </div>
          
          {/* Apply to personal timetable button */}
          {sharedSlots.length > 0 && (
            <Button 
              onClick={applyToMyTimetable}
              variant="outline"
              size="sm"
              className="w-full h-8 text-xs"
            >
              In meinen Stundenplan uebernehmen
            </Button>
          )}
          
          {/* Slots summary */}
          {sharedSlots.length > 0 && (
            <div className="space-y-1.5">
              {sharedSlots.map(slot => (
                <div 
                  key={slot.id}
                  className="flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border/50"
                >
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                    {slot.period}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">
                      {DAYS_FULL[slot.day_of_week - 1]}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {slot.period}. Stunde {slot.room && `- ${slot.room}`}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {sharedSlots.length === 0 && (
            <div className="py-6 text-center">
              <Clock className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
              <p className="text-xs text-muted-foreground">Keine Stunden eingetragen</p>
              {isAdmin && (
                <p className="text-[10px] text-muted-foreground/70">Klicke im Grid oben auf die Felder</p>
              )}
            </div>
          )}
        </TabsContent>
        
        {/* Homework Tab */}
        <TabsContent value="homework" className="mt-3 space-y-3">
          <Button 
            size="sm" 
            className="w-full h-8 text-xs gap-1"
            onClick={() => setHomeworkDialogOpen(true)}
          >
            <Plus className="w-3 h-3" strokeWidth={1.5} />
            Hausaufgabe teilen
          </Button>
          
          {homework.length === 0 ? (
            <div className="py-6 text-center">
              <BookOpen className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
              <p className="text-xs text-muted-foreground">Keine Hausaufgaben</p>
            </div>
          ) : (
            <div className="space-y-2">
              {homework.map(hw => {
                const due = getDueDateLabel(hw.due_date);
                return (
                  <Card key={hw.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-sm">{hw.title}</p>
                          {hw.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2">{hw.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className={due.color}>{due.label}</span>
                            <span className="text-muted-foreground">
                              von {hw.sharer_profile?.display_name || hw.sharer_profile?.username || 'Unbekannt'}
                            </span>
                          </div>
                        </div>
                        {hw.shared_by === user?.id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => deleteHomework(hw.id)}
                          >
                            <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        {/* Events Tab */}
        <TabsContent value="events" className="mt-3 space-y-3">
          <Button 
            size="sm" 
            className="w-full h-8 text-xs gap-1"
            onClick={() => setEventDialogOpen(true)}
          >
            <Plus className="w-3 h-3" strokeWidth={1.5} />
            Termin teilen
          </Button>
          
          {events.length === 0 ? (
            <div className="py-6 text-center">
              <Calendar className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
              <p className="text-xs text-muted-foreground">Keine Termine</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(ev => {
                const eventDate = getDueDateLabel(ev.event_date);
                return (
                  <Card key={ev.id}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{ev.title}</p>
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary">
                              {getEventTypeLabel(ev.event_type)}
                            </span>
                          </div>
                          {ev.description && (
                            <p className="text-[10px] text-muted-foreground line-clamp-2">{ev.description}</p>
                          )}
                          <div className="flex items-center gap-2 mt-1 text-[10px]">
                            <span className={eventDate.color}>{eventDate.label}</span>
                            <span className="text-muted-foreground">
                              von {ev.sharer_profile?.display_name || ev.sharer_profile?.username || 'Unbekannt'}
                            </span>
                          </div>
                        </div>
                        {ev.shared_by === user?.id && (
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6"
                            onClick={() => deleteEvent(ev.id)}
                          >
                            <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
        
        {/* Grades Tab (Private) */}
        <TabsContent value="grades" className="mt-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {oralAvg !== null && (
                <div className="text-center">
                  <div className="text-lg font-bold">{Math.round(oralAvg * 10) / 10}</div>
                  <div className="text-[10px] text-muted-foreground">Muendlich</div>
                </div>
              )}
              {writtenAvg !== null && (
                <div className="text-center">
                  <div className="text-lg font-bold">{Math.round(writtenAvg * 10) / 10}</div>
                  <div className="text-[10px] text-muted-foreground">Schriftlich</div>
                </div>
              )}
            </div>
            <Button 
              size="sm" 
              className="h-8 text-xs gap-1"
              onClick={() => setGradeDialogOpen(true)}
            >
              <Plus className="w-3 h-3" strokeWidth={1.5} />
              Note
            </Button>
          </div>
          
          {grades.length === 0 ? (
            <div className="py-6 text-center">
              <Award className="w-8 h-8 mx-auto text-muted-foreground/30 mb-2" strokeWidth={1.5} />
              <p className="text-xs text-muted-foreground">Keine Noten eingetragen</p>
              <p className="text-[10px] text-muted-foreground/70">Deine Noten sind nur fuer dich sichtbar</p>
            </div>
          ) : (
            <div className="space-y-1.5">
              {grades.map(grade => (
                <div 
                  key={grade.id}
                  className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border/50"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${getGradeColor(grade.points)}`}>
                    {grade.points}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {grade.grade_type === 'oral' ? 'Muendlich' : 'Schriftlich'}
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
                    onClick={() => deleteGrade(grade.id)}
                  >
                    <Trash2 className="w-3 h-3" strokeWidth={1.5} />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
        
        {/* Members Tab */}
        <TabsContent value="members" className="mt-3">
          <div className="space-y-2">
            {members.map(member => (
              <Card key={member.id}>
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-medium">
                    {(member.profile?.display_name || member.profile?.username || '?')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
                      {member.profile?.display_name || member.profile?.username || 'Unbekannt'}
                    </p>
                    <p className="text-[10px] text-muted-foreground capitalize">{member.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
      
      {/* Homework Dialog */}
      <Dialog open={homeworkDialogOpen} onOpenChange={setHomeworkDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-4 h-4" strokeWidth={1.5} />
              Hausaufgabe teilen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Titel</Label>
              <Input 
                value={hwTitle}
                onChange={(e) => setHwTitle(e.target.value)}
                placeholder="z.B. Aufgaben S. 42"
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Beschreibung</Label>
              <Textarea 
                value={hwDescription}
                onChange={(e) => setHwDescription(e.target.value)}
                placeholder="Optional"
                rows={2}
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Faellig am</Label>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {quickDates.map((qd) => (
                  <Button
                    key={qd.label}
                    type="button"
                    variant={hwDueDate === qd.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setHwDueDate(qd.value)}
                  >
                    {qd.label}
                  </Button>
                ))}
                <Input 
                  type="date"
                  value={hwDueDate}
                  onChange={(e) => setHwDueDate(e.target.value)}
                  className="h-7 w-auto text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Prioritaet</Label>
              <Select value={hwPriority} onValueChange={setHwPriority}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">Hoch</SelectItem>
                  <SelectItem value="medium">Mittel</SelectItem>
                  <SelectItem value="low">Niedrig</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleShareHomework} className="w-full" disabled={!hwTitle.trim() || !hwDueDate}>
              Teilen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Event Dialog */}
      <Dialog open={eventDialogOpen} onOpenChange={setEventDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="w-4 h-4" strokeWidth={1.5} />
              Termin teilen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">Titel</Label>
              <Input 
                value={evTitle}
                onChange={(e) => setEvTitle(e.target.value)}
                placeholder="z.B. Klausur Kapitel 3"
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Art</Label>
              <Select value={evType} onValueChange={setEvType}>
                <SelectTrigger className="h-9 mt-1">
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
              <div className="flex flex-wrap gap-1.5 mt-1">
                {quickDates.map((qd) => (
                  <Button
                    key={qd.label}
                    type="button"
                    variant={evDate === qd.value ? 'default' : 'outline'}
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setEvDate(qd.value)}
                  >
                    {qd.label}
                  </Button>
                ))}
                <Input 
                  type="date"
                  value={evDate}
                  onChange={(e) => setEvDate(e.target.value)}
                  className="h-7 w-auto text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Beschreibung</Label>
              <Textarea 
                value={evDescription}
                onChange={(e) => setEvDescription(e.target.value)}
                placeholder="Optional"
                rows={2}
                className="mt-1"
              />
            </div>
            <Button onClick={handleShareEvent} className="w-full" disabled={!evTitle.trim() || !evDate}>
              Teilen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Grade Dialog */}
      <Dialog open={gradeDialogOpen} onOpenChange={setGradeDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="w-4 h-4" strokeWidth={1.5} />
              Note hinzufuegen
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <p className="text-[10px] text-muted-foreground">Diese Note ist nur fuer dich sichtbar</p>
            <div>
              <Label className="text-xs">Art</Label>
              <Select value={gradeType} onValueChange={(v) => setGradeType(v as 'oral' | 'written')}>
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue />
                </SelectTrigger>
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
                value={gradePoints}
                onChange={(e) => setGradePoints(e.target.value)}
                placeholder="0-15"
                className="h-9 mt-1"
              />
            </div>
            <div>
              <Label className="text-xs">Beschreibung</Label>
              <Input
                value={gradeDescription}
                onChange={(e) => setGradeDescription(e.target.value)}
                placeholder="Optional"
                className="h-9 mt-1"
              />
            </div>
            <Button onClick={handleAddGrade} className="w-full" disabled={!gradePoints}>
              Hinzufuegen
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
