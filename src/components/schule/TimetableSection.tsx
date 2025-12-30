import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ArrowLeft, Plus, Trash2, ChevronLeft, ChevronRight, BookOpen, Coffee, UtensilsCrossed, CheckCircle2, XCircle, LayoutGrid, Columns3 } from 'lucide-react';
import { toast } from 'sonner';
import { format, addWeeks, subWeeks, startOfWeek, addDays, getISOWeek } from 'date-fns';
import { de } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

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

interface LessonAbsence {
  id: string;
  date: string;
  reason: string;
  excused: boolean;
  timetable_entry_id: string;
}

interface Homework {
  id: string;
  title: string;
  due_date: string;
  completed: boolean;
  subject_id: string;
}

interface TimetableSectionProps {
  onBack: () => void;
}

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const DAYS_SHORT = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
// Periods with break info: period 7 is lunch
const PERIOD_STRUCTURE = [
  { period: 1, showBreakAfter: false },
  { period: 2, showBreakAfter: true, breakDuration: '20 Min' },
  { period: 3, showBreakAfter: false },
  { period: 4, showBreakAfter: true, breakDuration: '20 Min' },
  { period: 5, showBreakAfter: false },
  { period: 6, showBreakAfter: false },
  { period: 7, isLunch: true, lunchDuration: '65 Min' },
  { period: 8, showBreakAfter: false },
  { period: 9, showBreakAfter: false },
];

export function TimetableSection({ onBack }: TimetableSectionProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [entries, setEntries] = useState<TimetableEntry[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [absences, setAbsences] = useState<LessonAbsence[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null);
  
  // Mobile view mode: 3 days at a time
  const [mobileViewStart, setMobileViewStart] = useState(0); // 0 = Mo-Mi, 2 = Mi-Fr (overlapping)
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');
  
  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  // Form state for timetable entry
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [period, setPeriod] = useState('1');
  const [subjectId, setSubjectId] = useState<string>('');
  const [teacherShort, setTeacherShort] = useState('');
  const [room, setRoom] = useState('');
  const [isDoubleLesson, setIsDoubleLesson] = useState(false);
  const [weekType, setWeekType] = useState<string>('both');

  // Auto-switch to compact mode on mobile
  useEffect(() => {
    if (isMobile) {
      setViewMode('compact');
    }
  }, [isMobile]);
  const fetchData = async () => {
    if (!user) return;

    const weekEnd = addDays(currentWeekStart, 6);
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const [entriesRes, subjectsRes, absencesRes, homeworkRes] = await Promise.all([
      supabase
        .from('timetable_entries')
        .select('*, subjects(id, name, short_name, teacher_short, room)')
        .eq('user_id', user.id)
        .order('day_of_week')
        .order('period'),
      supabase
        .from('subjects')
        .select('id, name, short_name, teacher_short, room')
        .eq('user_id', user.id)
        .order('name'),
      supabase
        .from('lesson_absences')
        .select('id, date, reason, excused, timetable_entry_id')
        .eq('user_id', user.id)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr),
      supabase
        .from('homework')
        .select('id, title, due_date, completed, subject_id')
        .eq('user_id', user.id)
        .gte('due_date', weekStartStr)
        .lte('due_date', weekEndStr),
    ]);

    if (entriesRes.error) console.error(entriesRes.error);
    if (subjectsRes.error) console.error(subjectsRes.error);
    if (absencesRes.error) console.error(absencesRes.error);
    if (homeworkRes.error) console.error(homeworkRes.error);

    setEntries(entriesRes.data || []);
    setSubjects(subjectsRes.data || []);
    setAbsences(absencesRes.data || []);
    setHomework(homeworkRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user, currentWeekStart]);

  const resetForm = () => {
    setDayOfWeek('1');
    setPeriod('1');
    setSubjectId('');
    setTeacherShort('');
    setRoom('');
    setIsDoubleLesson(false);
    setWeekType('both');
    setEditingEntry(null);
  };

  const openEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry);
    setDayOfWeek(entry.day_of_week.toString());
    setPeriod(entry.period.toString());
    setSubjectId(entry.subject_id || '');
    setTeacherShort(entry.teacher_short);
    setRoom(entry.room || '');
    setWeekType(entry.week_type || 'both');
    setIsDoubleLesson(false);
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!teacherShort.trim()) {
      toast.error('Bitte gib ein Lehrerkürzel ein');
      return;
    }

    const periodNum = parseInt(period);
    const dayNum = parseInt(dayOfWeek);

    // Check if it's lunch period
    if (periodNum === 7) {
      toast.error('Die 7. Stunde ist Mittagspause');
      return;
    }

    // For double lessons, check if next period is valid
    if (isDoubleLesson) {
      const nextPeriod = periodNum + 1;
      if (nextPeriod > 9 || nextPeriod === 7) {
        toast.error('Doppelstunde kann hier nicht eingetragen werden');
        return;
      }
    }

    const baseData = {
      user_id: user.id,
      day_of_week: dayNum,
      subject_id: subjectId || null,
      teacher_short: teacherShort.trim(),
      room: room.trim() || null,
      week_type: weekType,
    };

    if (editingEntry) {
      const { error } = await supabase
        .from('timetable_entries')
        .update({ ...baseData, period: periodNum, week_type: weekType })
        .eq('id', editingEntry.id);

      if (error) {
        toast.error('Fehler beim Speichern');
        console.error(error);
      } else {
        toast.success('Stunde aktualisiert');
        setDialogOpen(false);
        resetForm();
        fetchData();
      }
    } else {
      // Insert first period
      const { error: error1 } = await supabase
        .from('timetable_entries')
        .upsert({ ...baseData, period: periodNum }, { onConflict: 'user_id,day_of_week,period' });

      if (error1) {
        toast.error('Fehler beim Speichern');
        console.error(error1);
        return;
      }

      // Insert second period if double lesson
      if (isDoubleLesson) {
        const nextPeriod = periodNum + 1;
        const { error: error2 } = await supabase
          .from('timetable_entries')
          .upsert({ ...baseData, period: nextPeriod }, { onConflict: 'user_id,day_of_week,period' });

        if (error2) {
          toast.error('Fehler beim Speichern der zweiten Stunde');
          console.error(error2);
          return;
        }
      }

      toast.success(isDoubleLesson ? 'Doppelstunde hinzugefügt' : 'Stunde hinzugefügt');
      setDialogOpen(false);
      resetForm();
      fetchData();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('timetable_entries')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Stunde gelöscht');
      fetchData();
    }
  };

  const getEntryForSlot = (day: number, periodNum: number) => {
    const currentWeekNum = getISOWeek(currentWeekStart);
    const isOddWeek = currentWeekNum % 2 === 1;
    
    return entries.find(e => {
      if (e.day_of_week !== day || e.period !== periodNum) return false;
      if (e.week_type === 'both') return true;
      if (e.week_type === 'odd' && isOddWeek) return true;
      if (e.week_type === 'even' && !isOddWeek) return true;
      return false;
    });
  };

  const getAbsenceForSlot = (date: Date, entry: TimetableEntry | undefined) => {
    if (!entry) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return absences.find(a => a.date === dateStr && a.timetable_entry_id === entry.id);
  };

  const getHomeworkForDay = (date: Date, subjectId: string | null) => {
    if (!subjectId) return [];
    const dateStr = format(date, 'yyyy-MM-dd');
    return homework.filter(h => h.due_date === dateStr && h.subject_id === subjectId);
  };

  const getSlotColor = (absence: LessonAbsence | null) => {
    if (!absence) return 'bg-green-500/20 border-green-500/30 text-green-700 dark:text-green-300';
    if (absence.reason === 'school_project') {
      return 'bg-yellow-500/20 border-yellow-500/30 text-yellow-700 dark:text-yellow-300';
    }
    return 'bg-red-500/20 border-red-500/30 text-red-700 dark:text-red-300';
  };

  // Check if current entry is the START of a double lesson (same subject/teacher as next period)
  const isStartOfDouble = (day: number, periodNum: number) => {
    const current = getEntryForSlot(day, periodNum);
    const next = getEntryForSlot(day, periodNum + 1);
    if (!current || !next) return false;
    return current.subject_id === next.subject_id && 
           current.teacher_short === next.teacher_short &&
           current.week_type === next.week_type &&
           periodNum !== 6 && periodNum + 1 !== 7; // Can't span lunch
  };

  // Check if current entry is the SECOND part of a double lesson
  const isSecondOfDouble = (day: number, periodNum: number) => {
    const current = getEntryForSlot(day, periodNum);
    const prev = getEntryForSlot(day, periodNum - 1);
    if (!current || !prev) return false;
    return current.subject_id === prev.subject_id && 
           current.teacher_short === prev.teacher_short &&
           current.week_type === prev.week_type &&
           periodNum !== 7 && periodNum - 1 !== 7;
  };

  const weekDates = DAYS.map((_, i) => addDays(currentWeekStart, i));

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  // Mobile day navigation
  const goToPreviousDays = () => setMobileViewStart(Math.max(0, mobileViewStart - 2));
  const goToNextDays = () => setMobileViewStart(Math.min(2, mobileViewStart + 2));

  // Get visible days based on view mode
  const getVisibleDays = () => {
    if (viewMode === 'full') {
      return [0, 1, 2, 3, 4]; // All 5 days
    }
    // Compact mode: 3 days at a time
    const start = mobileViewStart;
    return [start, start + 1, start + 2].filter(i => i < 5);
  };

  const visibleDayIndices = getVisibleDays();

  // Get available periods for selection (exclude lunch)
  const availablePeriods = PERIOD_STRUCTURE.filter(p => !p.isLunch).map(p => p.period);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h2 className="text-xl md:text-2xl font-bold">Stundenplan</h2>
            <p className="text-sm text-muted-foreground">Kalenderansicht mit Fehltagen</p>
          </div>
        </div>

        <div className="flex gap-2">
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Stunde</span>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingEntry ? 'Stunde bearbeiten' : 'Stunde hinzufügen'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Tag</Label>
                    <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((day, i) => (
                          <SelectItem key={i + 1} value={(i + 1).toString()}>{day}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Stunde</Label>
                    <Select value={period} onValueChange={setPeriod}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePeriods.map(p => (
                          <SelectItem key={p} value={p.toString()}>{p}. Stunde</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {!editingEntry && (
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="doubleLesson"
                      checked={isDoubleLesson}
                      onCheckedChange={(checked) => setIsDoubleLesson(checked as boolean)}
                    />
                    <label
                      htmlFor="doubleLesson"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Doppelstunde (belegt auch die nächste Stunde)
                    </label>
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Wochenrhythmus</Label>
                  <Select value={weekType} onValueChange={setWeekType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="both">Jede Woche</SelectItem>
                      <SelectItem value="odd">Nur A-Woche (ungerade KW)</SelectItem>
                      <SelectItem value="even">Nur B-Woche (gerade KW)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Fach</Label>
                  <Select 
                    value={subjectId} 
                    onValueChange={(value) => {
                      setSubjectId(value);
                      // Auto-fill teacher and room from subject if not already set
                      const selectedSubject = subjects.find(s => s.id === value);
                      if (selectedSubject) {
                        if (!teacherShort && selectedSubject.teacher_short) {
                          setTeacherShort(selectedSubject.teacher_short);
                        }
                        if (!room && selectedSubject.room) {
                          setRoom(selectedSubject.room);
                        }
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Fach auswählen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.short_name ? ` (${s.short_name})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {subjects.length === 0 && (
                    <p className="text-xs text-muted-foreground">Lege zuerst Fächer unter "Fächer" an.</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Lehrerkürzel *</Label>
                    <Input
                      value={teacherShort}
                      onChange={(e) => setTeacherShort(e.target.value)}
                      placeholder="z.B. Mü, Sch"
                      maxLength={10}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Raum</Label>
                    <Input
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="z.B. A201"
                    />
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button onClick={handleSubmit} className="flex-1">
                    Speichern
                  </Button>
                  {editingEntry && (
                    <Button 
                      variant="destructive" 
                      onClick={() => {
                        handleDelete(editingEntry.id);
                        setDialogOpen(false);
                        resetForm();
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between gap-2 md:gap-4">
        <Button variant="outline" size="icon" onClick={goToPreviousWeek} className="shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center flex-1">
          <p className="font-medium text-sm md:text-base">
            {format(currentWeekStart, 'dd. MMM', { locale: de })} - {format(addDays(currentWeekStart, 4), 'dd. MMM yyyy', { locale: de })}
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${getISOWeek(currentWeekStart) % 2 === 1 ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {getISOWeek(currentWeekStart) % 2 === 1 ? 'A-Woche' : 'B-Woche'}
            </span>
            <span className="text-xs text-muted-foreground">
              (KW {getISOWeek(currentWeekStart)})
            </span>
          </div>
          <Button variant="link" size="sm" onClick={goToCurrentWeek} className="text-muted-foreground text-xs md:text-sm">
            Zur aktuellen Woche
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={goToNextWeek} className="shrink-0">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* View Mode Toggle & Mobile Day Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* View Mode Toggle */}
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Button 
            variant={viewMode === 'full' ? 'default' : 'ghost'} 
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setViewMode('full')}
          >
            <LayoutGrid className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Vollansicht</span>
            <span className="sm:hidden">5 Tage</span>
          </Button>
          <Button 
            variant={viewMode === 'compact' ? 'default' : 'ghost'} 
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setViewMode('compact')}
          >
            <Columns3 className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Kompakt</span>
            <span className="sm:hidden">3 Tage</span>
          </Button>
        </div>

        {/* Mobile Day Navigation (only in compact mode) */}
        {viewMode === 'compact' && (
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2"
              onClick={goToPreviousDays}
              disabled={mobileViewStart === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium min-w-[60px] text-center">
              {DAYS_SHORT[visibleDayIndices[0]]} - {DAYS_SHORT[visibleDayIndices[visibleDayIndices.length - 1]]}
            </span>
            <Button 
              variant="ghost" 
              size="sm"
              className="h-7 px-2"
              onClick={goToNextDays}
              disabled={mobileViewStart >= 2}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Legend - more compact on mobile */}
      <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-green-500/20 border border-green-500/30" />
          <span>Anwesend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-yellow-500/20 border border-yellow-500/30" />
          <span>Schulprojekt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 md:w-4 md:h-4 rounded bg-red-500/20 border border-red-500/30" />
          <span>Abwesend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <BookOpen className="w-3 h-3 md:w-4 md:h-4 text-blue-500" />
          <span>HA</span>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className={viewMode === 'full' ? 'overflow-x-auto' : ''}>
        <div className={viewMode === 'full' ? 'min-w-[700px]' : ''}>
          <div className={`grid gap-1 ${viewMode === 'full' ? 'grid-cols-6' : 'grid-cols-4'}`}>
            {/* Header row */}
            <div className="p-1 md:p-2 font-medium text-center text-muted-foreground text-xs md:text-sm">Std.</div>
            {visibleDayIndices.map((i) => (
              <div key={i} className="p-1 md:p-2 font-medium text-center text-xs md:text-sm bg-muted/50 rounded-t-lg">
                <div>{DAYS_SHORT[i]}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">{format(weekDates[i], 'dd.MM')}</div>
              </div>
            ))}

            {/* Period rows with breaks */}
            {PERIOD_STRUCTURE.map((periodInfo, idx) => (
              <>
                {/* Lunch break row */}
                {periodInfo.isLunch ? (
                  <div key={`lunch-${idx}`} className={viewMode === 'full' ? 'col-span-6' : 'col-span-4'} style={{ gridColumn: viewMode === 'full' ? 'span 6' : 'span 4' }}>
                    <div className="flex items-center justify-center gap-1 md:gap-2 py-2 md:py-3 bg-amber-500/10 rounded-lg border border-amber-500/20 my-1">
                      <UtensilsCrossed className="w-3 h-3 md:w-4 md:h-4 text-amber-600" />
                      <span className="text-xs md:text-sm font-medium text-amber-700 dark:text-amber-400">
                        Mittag
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Period label */}
                    <div key={`period-${periodInfo.period}`} className="p-1 md:p-2 text-center text-muted-foreground text-xs md:text-sm flex items-center justify-center">
                      {periodInfo.period}.
                    </div>
                    {/* Day cells - only visible days */}
                    {visibleDayIndices.map((dayIndex) => {
                      const date = weekDates[dayIndex];
                      const entry = getEntryForSlot(dayIndex + 1, periodInfo.period);
                      const absence = getAbsenceForSlot(date, entry);
                      const dayHomework = entry ? getHomeworkForDay(date, entry.subject_id) : [];
                      const isDoubleStart = isStartOfDouble(dayIndex + 1, periodInfo.period);
                      const isDoubleSecond = isSecondOfDouble(dayIndex + 1, periodInfo.period);
                      
                      // Skip rendering the second period of a double lesson
                      if (isDoubleSecond) {
                        return null;
                      }
                      
                      if (!entry) {
                        return (
                          <Card
                            key={`${dayIndex}-${periodInfo.period}`}
                            className="p-1 md:p-2 min-h-[45px] md:min-h-[60px] flex flex-col justify-center items-center text-center bg-card/30 border-dashed cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => {
                              setDayOfWeek((dayIndex + 1).toString());
                              setPeriod(periodInfo.period.toString());
                              setDialogOpen(true);
                            }}
                          >
                            <Plus className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground/30" />
                          </Card>
                        );
                      }

                      // Double lesson - merged cell with rowspan effect
                      if (isDoubleStart) {
                        const nextAbsence = getAbsenceForSlot(date, getEntryForSlot(dayIndex + 1, periodInfo.period + 1));
                        const nextHomework = getHomeworkForDay(date, entry.subject_id);
                        const totalHomework = [...dayHomework, ...nextHomework.filter(h => !dayHomework.some(d => d.id === h.id))];
                        const worstAbsence = absence || nextAbsence;
                        const isExcused = worstAbsence?.excused;
                        
                        return (
                          <Card
                            key={`${dayIndex}-${periodInfo.period}`}
                            className={`p-1 md:p-2 min-h-[90px] md:min-h-[120px] flex flex-col justify-center text-center cursor-pointer transition-all hover:scale-[1.02] border row-span-2 relative ${getSlotColor(worstAbsence)}`}
                            style={{ gridRow: 'span 2' }}
                            onClick={() => openEdit(entry)}
                          >
                            {/* Excused/Not excused indicator */}
                            {worstAbsence && (
                              <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1">
                                {isExcused ? (
                                  <CheckCircle2 className="w-3 h-3 md:w-4 md:h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-3 h-3 md:w-4 md:h-4 text-orange-500" />
                                )}
                              </div>
                            )}
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="font-semibold text-[10px] md:text-sm truncate block max-w-full">
                                {entry.subjects?.short_name || entry.subjects?.name?.slice(0, 4) || '-'}
                              </span>
                              <span className="text-[9px] md:text-xs opacity-70">{entry.teacher_short}</span>
                              {viewMode === 'full' && entry.room && <span className="text-[9px] md:text-xs opacity-50">{entry.room}</span>}
                              {entry.week_type !== 'both' && (
                                <span className="text-[8px] md:text-[10px] px-1 py-0.5 rounded bg-primary/20 text-primary">
                                  {entry.week_type === 'odd' ? 'A' : 'B'}
                                </span>
                              )}
                            </div>
                            {totalHomework.length > 0 && (
                              <div className="flex items-center justify-center gap-0.5 mt-1">
                                <BookOpen className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-blue-500" />
                                <span className="text-[9px] md:text-xs text-blue-500">{totalHomework.length}</span>
                              </div>
                            )}
                          </Card>
                        );
                      }

                      // Single lesson
                      return (
                        <Card
                          key={`${dayIndex}-${periodInfo.period}`}
                          className={`p-1 md:p-2 min-h-[45px] md:min-h-[60px] flex flex-col justify-between text-center cursor-pointer transition-all hover:scale-[1.02] border relative ${getSlotColor(absence)}`}
                          onClick={() => openEdit(entry)}
                        >
                          {/* Excused/Not excused indicator */}
                          {absence && (
                            <div className="absolute top-0.5 right-0.5 md:top-1 md:right-1">
                              {absence.excused ? (
                                <CheckCircle2 className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-green-500" />
                              ) : (
                                <XCircle className="w-2.5 h-2.5 md:w-3.5 md:h-3.5 text-orange-500" />
                              )}
                            </div>
                          )}
                          <div>
                            <span className="font-medium text-[10px] md:text-xs truncate block">
                              {entry.subjects?.short_name || entry.subjects?.name?.slice(0, 4) || '-'}
                            </span>
                            <span className="text-[9px] md:text-xs opacity-70">{entry.teacher_short}</span>
                            {entry.week_type !== 'both' && (
                              <span className="text-[8px] md:text-[10px] ml-0.5 px-0.5 py-0.5 rounded bg-primary/20 text-primary">
                                {entry.week_type === 'odd' ? 'A' : 'B'}
                              </span>
                            )}
                          </div>
                          {dayHomework.length > 0 && (
                            <div className="flex items-center justify-center gap-0.5 mt-0.5">
                              <BookOpen className="w-2.5 h-2.5 md:w-3 md:h-3 text-blue-500" />
                              <span className="text-[9px] md:text-xs text-blue-500">{dayHomework.length}</span>
                            </div>
                          )}
                        </Card>
                      );
                    })}

                    {/* Break row after certain periods */}
                    {periodInfo.showBreakAfter && (
                      <div key={`break-${periodInfo.period}`} className={viewMode === 'full' ? 'col-span-6' : 'col-span-4'} style={{ gridColumn: viewMode === 'full' ? 'span 6' : 'span 4' }}>
                        <div className="flex items-center justify-center gap-1 py-1 bg-muted/50 rounded border border-border/30 my-0.5">
                          <Coffee className="w-2.5 h-2.5 md:w-3 md:h-3 text-muted-foreground" />
                          <span className="text-[9px] md:text-xs text-muted-foreground">
                            Pause
                          </span>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
