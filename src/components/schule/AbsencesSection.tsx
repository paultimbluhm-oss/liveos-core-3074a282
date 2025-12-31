import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, Thermometer, Stethoscope, FolderKanban, HelpCircle, Trash2, CheckCircle2, ChevronLeft, ChevronRight, FileDown, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, getISOWeek, addWeeks, subWeeks } from 'date-fns';
import { de } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';
import { generateAbsenceReport } from './generateAbsenceReport';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TimetableEntry {
  id: string;
  day_of_week: number;
  period: number;
  teacher_short: string;
  week_type: string;
  subject_id: string | null;
  subjects: { id: string; name: string; short_name: string | null } | null;
}

interface LessonAbsence {
  id: string;
  date: string;
  reason: string;
  excused: boolean;
  description?: string | null;
  timetable_entry_id: string;
  timetable_entries?: TimetableEntry | null;
}

interface AbsencesSectionProps {
  onBack: () => void;
}

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];

const REASONS = [
  { value: 'sick', label: 'Krank', icon: Thermometer, color: 'bg-rose-500' },
  { value: 'doctor', label: 'Arzt', icon: Stethoscope, color: 'bg-blue-500' },
  { value: 'school_project', label: 'Projekt', icon: FolderKanban, color: 'bg-amber-500' },
  { value: 'other', label: 'Sonstiges', icon: HelpCircle, color: 'bg-muted' },
] as const;

type ReasonType = typeof REASONS[number]['value'];

export function AbsencesSection({ onBack }: AbsencesSectionProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [absences, setAbsences] = useState<LessonAbsence[]>([]);
  const [allAbsences, setAllAbsences] = useState<LessonAbsence[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [currentDay, setCurrentDay] = useState(() => {
    const today = new Date().getDay();
    return today >= 1 && today <= 5 ? today - 1 : 0;
  });
  
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  
  const [selectedReason, setSelectedReason] = useState<ReasonType>('sick');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportName, setReportName] = useState('');

  const currentWeekNum = getISOWeek(currentWeekStart);
  const isOddWeek = currentWeekNum % 2 === 1;
  const weekDates = DAYS.map((_, i) => addDays(currentWeekStart, i));
  const currentDate = weekDates[currentDay];

  const fetchData = async () => {
    if (!user) return;

    const weekEnd = addDays(currentWeekStart, 6);
    const weekStartStr = format(currentWeekStart, 'yyyy-MM-dd');
    const weekEndStr = format(weekEnd, 'yyyy-MM-dd');

    const [absencesRes, allAbsencesRes, timetableRes] = await Promise.all([
      supabase
        .from('lesson_absences')
        .select('*, timetable_entries(id, day_of_week, period, teacher_short, week_type, subject_id, subjects(id, name, short_name))')
        .eq('user_id', user.id)
        .gte('date', weekStartStr)
        .lte('date', weekEndStr),
      supabase
        .from('lesson_absences')
        .select('*, timetable_entries(id, day_of_week, period, teacher_short, week_type, subject_id, subjects(id, name, short_name))')
        .eq('user_id', user.id),
      supabase
        .from('timetable_entries')
        .select('id, day_of_week, period, teacher_short, week_type, subject_id, subjects(id, name, short_name)')
        .eq('user_id', user.id)
        .order('period'),
    ]);

    setAbsences(absencesRes.data || []);
    setAllAbsences(allAbsencesRes.data || []);
    setTimetableEntries(timetableRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    setSelectedSlots(new Set());
  }, [user, currentWeekStart]);

  const stats = useMemo(() => {
    const HOURS_PER_DAY = 8;
    const realAbsences = allAbsences.filter(a => a.reason !== 'efa');
    const efaAbsences = allAbsences.filter(a => a.reason === 'efa');
    
    const total = realAbsences.length;
    const excused = realAbsences.filter(a => a.excused).length;
    const unexcused = realAbsences.filter(a => !a.excused).length;
    const sickCount = realAbsences.filter(a => a.reason === 'sick').length;
    const doctorCount = realAbsences.filter(a => a.reason === 'doctor').length;
    const schoolProjectCount = realAbsences.filter(a => a.reason === 'school_project').length;
    const otherCount = realAbsences.filter(a => a.reason === 'other').length;
    const efaCount = efaAbsences.length;
    
    return {
      total,
      totalDays: (total / HOURS_PER_DAY).toFixed(1),
      excused,
      excusedDays: (excused / HOURS_PER_DAY).toFixed(1),
      unexcused,
      unexcusedDays: (unexcused / HOURS_PER_DAY).toFixed(1),
      sickCount,
      sickDays: (sickCount / HOURS_PER_DAY).toFixed(1),
      doctorCount,
      doctorDays: (doctorCount / HOURS_PER_DAY).toFixed(1),
      schoolProjectCount,
      schoolProjectDays: (schoolProjectCount / HOURS_PER_DAY).toFixed(1),
      otherCount,
      otherDays: (otherCount / HOURS_PER_DAY).toFixed(1),
      efaCount,
      efaDays: (efaCount / HOURS_PER_DAY).toFixed(1),
    };
  }, [allAbsences]);

  const unexcusedAbsences = useMemo(() => {
    return allAbsences.filter(a => !a.excused && a.reason !== 'efa').sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [allAbsences]);

  const getEntryForSlot = (day: number, period: number) => {
    return timetableEntries.find(e => {
      if (e.day_of_week !== day || e.period !== period) return false;
      if (e.week_type === 'both') return true;
      if (e.week_type === 'odd' && isOddWeek) return true;
      if (e.week_type === 'even' && !isOddWeek) return true;
      return false;
    });
  };

  const getAbsenceForSlot = (date: Date, entryId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return absences.find(a => a.date === dateStr && a.timetable_entry_id === entryId);
  };

  const getDayLessons = (dayIndex: number) => {
    const day = dayIndex + 1;
    return timetableEntries
      .filter(e => {
        if (e.day_of_week !== day) return false;
        if (e.teacher_short === 'FREI' && !e.subject_id) return false;
        if (e.week_type === 'both') return true;
        if (e.week_type === 'odd' && isOddWeek) return true;
        if (e.week_type === 'even' && !isOddWeek) return true;
        return false;
      })
      .sort((a, b) => a.period - b.period);
  };

  const toggleSlotSelection = (date: Date, entry: TimetableEntry) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${dateStr}:${entry.id}`;
    const newSelected = new Set(selectedSlots);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
    } else {
      newSelected.add(key);
    }
    
    setSelectedSlots(newSelected);
  };

  const handleSubmitAbsences = async () => {
    if (!user || selectedSlots.size === 0) return;

    const inserts = Array.from(selectedSlots).map(key => {
      const [dateStr, entryId] = key.split(':');
      return {
        user_id: user.id,
        date: dateStr,
        timetable_entry_id: entryId,
        reason: selectedReason,
        excused: false,
      };
    });

    const { error } = await supabase
      .from('lesson_absences')
      .insert(inserts);

    if (error) {
      toast.error('Fehler beim Speichern');
    } else {
      toast.success(`${selectedSlots.size} Fehlstunde(n) eingetragen`);
      setSelectedSlots(new Set());
      fetchData();
    }
  };

  const toggleExcused = async (absence: LessonAbsence) => {
    const { error } = await supabase
      .from('lesson_absences')
      .update({ excused: !absence.excused })
      .eq('id', absence.id);

    if (!error) {
      toast.success(absence.excused ? 'Als offen markiert' : 'Als entschuldigt markiert');
      fetchData();
    }
  };

  const handleDeleteAbsence = async (id: string) => {
    const { error } = await supabase.from('lesson_absences').delete().eq('id', id);
    if (!error) {
      toast.success('Gelöscht');
      fetchData();
    }
  };

  const handleDownloadReport = () => {
    const reportData = allAbsences.map(a => ({
      id: a.id,
      date: a.date,
      reason: a.reason,
      excused: a.excused,
      description: a.description,
      isDoublePeriod: false,
      periodStart: a.timetable_entries?.period || 0,
      periodEnd: a.timetable_entries?.period || 0,
      timetable_entries: {
        period: a.timetable_entries?.period || 0,
        teacher_short: a.timetable_entries?.teacher_short || '',
        subjects: a.timetable_entries?.subjects || null,
      }
    }));
    
    generateAbsenceReport(reportData, stats, reportName || undefined);
    toast.success('PDF heruntergeladen');
    setShowReportDialog(false);
    setReportName('');
  };

  const todayLessons = getDayLessons(currentDay);

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
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-rose-500 to-red-600">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold">Fehltage</h2>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowReportDialog(true)} className="h-8 px-2.5">
          <FileDown className="w-4 h-4" />
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-xl bg-secondary/40 text-center">
          <p className="text-xl font-bold">{stats.total}</p>
          <p className="text-[10px] text-muted-foreground">Stunden</p>
        </div>
        <div className="p-3 rounded-xl bg-emerald-500/10 text-center">
          <p className="text-xl font-bold text-emerald-500">{stats.excused}</p>
          <p className="text-[10px] text-muted-foreground">Entschuldigt</p>
        </div>
        <div className={`p-3 rounded-xl text-center ${stats.unexcused > 0 ? 'bg-rose-500/10' : 'bg-secondary/40'}`}>
          <p className={`text-xl font-bold ${stats.unexcused > 0 ? 'text-rose-500' : ''}`}>{stats.unexcused}</p>
          <p className="text-[10px] text-muted-foreground">Offen</p>
        </div>
      </div>

      {/* Reason Breakdown */}
      <div className="grid grid-cols-4 gap-1.5">
        {REASONS.map(r => {
          const count = r.value === 'sick' ? stats.sickCount : 
                       r.value === 'doctor' ? stats.doctorCount :
                       r.value === 'school_project' ? stats.schoolProjectCount : stats.otherCount;
          const Icon = r.icon;
          return (
            <div key={r.value} className="p-2 rounded-lg bg-secondary/30 text-center">
              <Icon className="w-3.5 h-3.5 mx-auto mb-0.5 text-muted-foreground" />
              <p className="text-sm font-bold">{count}</p>
              <p className="text-[9px] text-muted-foreground truncate">{r.label}</p>
            </div>
          );
        })}
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between gap-2 bg-card rounded-xl p-2 border border-border/50">
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(subWeeks(currentWeekStart, 1))} className="h-8 w-8">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center flex-1">
          <p className="text-sm font-medium">
            {format(currentWeekStart, 'dd.MM.', { locale: de })} - {format(addDays(currentWeekStart, 4), 'dd.MM.yy', { locale: de })}
          </p>
          <span className="text-[10px] text-muted-foreground">KW {currentWeekNum}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setCurrentWeekStart(addWeeks(currentWeekStart, 1))} className="h-8 w-8">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Day Selector */}
      <div className="flex gap-1">
        {DAYS.map((day, i) => {
          const isSelected = i === currentDay;
          const date = weekDates[i];
          return (
            <button
              key={day}
              onClick={() => setCurrentDay(i)}
              className={`flex-1 py-2.5 rounded-xl text-center transition-all ${
                isSelected ? 'bg-primary text-primary-foreground' : 'bg-secondary/40 hover:bg-secondary/60'
              }`}
            >
              <div className="text-xs font-medium">{day}</div>
              <div className="text-[10px] opacity-70">{format(date, 'd')}</div>
            </button>
          );
        })}
      </div>

      {/* Reason Selector */}
      <div className="flex gap-1.5">
        {REASONS.map(reason => {
          const Icon = reason.icon;
          const isActive = selectedReason === reason.value;
          return (
            <Button
              key={reason.value}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              className={`flex-1 h-9 px-2 gap-1.5 ${!isActive && 'opacity-60'}`}
              onClick={() => setSelectedReason(reason.value)}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="text-[10px]">{reason.label}</span>
            </Button>
          );
        })}
      </div>

      {/* Day Schedule with Selection */}
      <div className="space-y-1.5">
        {todayLessons.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Keine Stunden</p>
          </div>
        ) : (
          todayLessons.map(entry => {
            const absence = getAbsenceForSlot(currentDate, entry.id);
            const dateStr = format(currentDate, 'yyyy-MM-dd');
            const key = `${dateStr}:${entry.id}`;
            const isSelected = selectedSlots.has(key);
            
            return (
              <div 
                key={entry.id}
                onClick={() => !absence && toggleSlotSelection(currentDate, entry)}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  absence 
                    ? absence.excused
                      ? 'bg-emerald-500/10 border-emerald-500/30'
                      : 'bg-rose-500/10 border-rose-500/30'
                    : isSelected
                      ? 'bg-primary/10 border-primary/50'
                      : 'bg-card border-border/50 hover:border-primary/30 cursor-pointer'
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                  absence ? absence.excused ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                  : isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}>
                  {entry.period}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">
                    {entry.subjects?.short_name || entry.subjects?.name || entry.teacher_short}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {entry.teacher_short}
                  </div>
                </div>
                {absence && (() => {
                  const reasonData = REASONS.find(r => r.value === absence.reason);
                  const ReasonIcon = reasonData?.icon || HelpCircle;
                  return (
                    <div className="flex items-center gap-1.5">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${reasonData?.color || 'bg-muted'}`}>
                        <ReasonIcon className="w-3.5 h-3.5 text-white" />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); toggleExcused(absence); }}
                      >
                        <CheckCircle2 className={`w-4 h-4 ${absence.excused ? 'text-emerald-500' : 'text-muted-foreground'}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e) => { e.stopPropagation(); handleDeleteAbsence(absence.id); }}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  );
                })()}
              </div>
            );
          })
        )}
      </div>

      {/* Submit Button */}
      {selectedSlots.size > 0 && (
        <Button onClick={handleSubmitAbsences} className="w-full h-11">
          {selectedSlots.size} Fehlstunde(n) eintragen
        </Button>
      )}

      {/* Unexcused List */}
      {unexcusedAbsences.length > 0 && (
        <div className="space-y-2 pt-4">
          <div className="flex items-center gap-2 text-sm font-medium text-rose-500">
            <AlertCircle className="w-4 h-4" />
            Offene Fehlstunden ({unexcusedAbsences.length})
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {unexcusedAbsences.slice(0, 10).map(absence => (
              <div 
                key={absence.id}
                className="flex items-center justify-between p-2.5 rounded-lg bg-rose-500/5 border border-rose-500/20"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">
                    {absence.timetable_entries?.subjects?.short_name || absence.timetable_entries?.subjects?.name || absence.timetable_entries?.teacher_short}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {format(new Date(absence.date), 'dd.MM.yy', { locale: de })} - {absence.timetable_entries?.period}. Std
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2"
                  onClick={() => toggleExcused(absence)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  <span className="text-[10px]">Entschuldigen</span>
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Report Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>PDF-Bericht</DialogTitle>
            <DialogDescription>Name für den Bericht eingeben</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-xs">Name</Label>
            <Input
              placeholder="Max Mustermann"
              value={reportName}
              onChange={(e) => setReportName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleDownloadReport()}
              className="h-10"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>Abbrechen</Button>
            <Button onClick={handleDownloadReport}>
              <FileDown className="w-4 h-4 mr-1.5" />
              Download
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
