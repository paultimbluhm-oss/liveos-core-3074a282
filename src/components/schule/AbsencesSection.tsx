import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, Calendar, Clock, Stethoscope, Thermometer, FolderKanban, HelpCircle, Trash2, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Plus, AlertCircle, LayoutGrid, Columns3, FileDown } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, getISOWeek, addWeeks, subWeeks, isSameDay } from 'date-fns';
import { de } from 'date-fns/locale';
import { ScrollArea } from '@/components/ui/scroll-area';
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
const DAYS_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const HOURS_PER_DAY = 8;

const REASONS = [
  { value: 'sick', label: 'Krank', icon: Thermometer, color: 'bg-red-500' },
  { value: 'doctor', label: 'Arzt', icon: Stethoscope, color: 'bg-blue-500' },
  { value: 'school_project', label: 'Schulprojekt', icon: FolderKanban, color: 'bg-yellow-500' },
  { value: 'other', label: 'Sonstiges', icon: HelpCircle, color: 'bg-gray-500' },
] as const;

type ReasonType = typeof REASONS[number]['value'];

export function AbsencesSection({ onBack }: AbsencesSectionProps) {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [absences, setAbsences] = useState<LessonAbsence[]>([]);
  const [allAbsences, setAllAbsences] = useState<LessonAbsence[]>([]);
  const [timetableEntries, setTimetableEntries] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const unexcusedListRef = useRef<HTMLDivElement>(null);
  
  // Mobile view mode
  const [mobileViewStart, setMobileViewStart] = useState(0);
  const [viewMode, setViewMode] = useState<'full' | 'compact'>('full');
  
  // Week navigation
  const [currentWeekStart, setCurrentWeekStart] = useState(() => 
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  
  // Selection state for adding absences
  const [selectedReason, setSelectedReason] = useState<ReasonType>('sick');
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(new Set());
  
  // Report dialog state
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [reportName, setReportName] = useState('');

  // Auto-switch to compact mode on mobile
  useEffect(() => {
    if (isMobile) {
      setViewMode('compact');
    }
  }, [isMobile]);

  // Mobile day navigation
  const goToPreviousDays = () => setMobileViewStart(Math.max(0, mobileViewStart - 2));
  const goToNextDays = () => setMobileViewStart(Math.min(2, mobileViewStart + 2));

  // Get visible days based on view mode
  const getVisibleDays = () => {
    if (viewMode === 'full') {
      return [0, 1, 2, 3, 4]; // All 5 days
    }
    const start = mobileViewStart;
    return [start, start + 1, start + 2].filter(i => i < 5);
  };

  const visibleDayIndices = getVisibleDays();

  const weekDates = DAYS.map((_, i) => addDays(currentWeekStart, i));
  const currentWeekNum = getISOWeek(currentWeekStart);
  const isOddWeek = currentWeekNum % 2 === 1;

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

    if (absencesRes.error) console.error(absencesRes.error);
    if (allAbsencesRes.error) console.error(allAbsencesRes.error);
    if (timetableRes.error) console.error(timetableRes.error);

    setAbsences(absencesRes.data || []);
    setAllAbsences(allAbsencesRes.data || []);
    setTimetableEntries(timetableRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    setSelectedSlots(new Set());
  }, [user, currentWeekStart]);

  // Calculate comprehensive statistics from all absences
  // EFA (Eigenverantwortliches Arbeiten) counts as free period - not a real absence
  const stats = useMemo(() => {
    const HOURS_PER_SCHOOL_DAY = 8; // 4 Doppelstunden = 8 Einzelstunden
    
    // Filter out EVA for "real" absence statistics
    const realAbsences = allAbsences.filter(a => a.reason !== 'efa');
    const efaCount = allAbsences.filter(a => a.reason === 'efa').length;
    
    const total = realAbsences.length;
    const sickCount = realAbsences.filter(a => a.reason === 'sick').length;
    const doctorCount = realAbsences.filter(a => a.reason === 'doctor').length;
    const schoolProjectCount = realAbsences.filter(a => a.reason === 'school_project').length;
    const otherCount = realAbsences.filter(a => a.reason === 'other').length;
    const excused = realAbsences.filter(a => a.excused).length;
    const unexcused = realAbsences.filter(a => !a.excused).length;
    
    // Abwesenheit (sick + doctor + other) vs Schulprojekte
    const absenceHours = sickCount + doctorCount + otherCount;
    
    return {
      total,
      totalDays: (total / HOURS_PER_SCHOOL_DAY).toFixed(1),
      sickCount,
      sickDays: (sickCount / HOURS_PER_SCHOOL_DAY).toFixed(1),
      doctorCount,
      doctorDays: (doctorCount / HOURS_PER_SCHOOL_DAY).toFixed(1),
      schoolProjectCount,
      schoolProjectDays: (schoolProjectCount / HOURS_PER_SCHOOL_DAY).toFixed(1),
      otherCount,
      otherDays: (otherCount / HOURS_PER_SCHOOL_DAY).toFixed(1),
      absenceHours,
      absenceDays: (absenceHours / HOURS_PER_SCHOOL_DAY).toFixed(1),
      excused,
      excusedDays: (excused / HOURS_PER_SCHOOL_DAY).toFixed(1),
      unexcused,
      unexcusedDays: (unexcused / HOURS_PER_SCHOOL_DAY).toFixed(1),
      efaCount,
      efaDays: (efaCount / HOURS_PER_SCHOOL_DAY).toFixed(1),
    };
  }, [allAbsences]);

  // Get unexcused absences for clickable list (exclude EVA - they don't need excusing)
  const unexcusedAbsences = useMemo(() => {
    return allAbsences.filter(a => !a.excused && a.reason !== 'efa').sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [allAbsences]);

  const scrollToUnexcused = () => {
    unexcusedListRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Get entry for a specific slot, respecting A/B weeks
  const getEntryForSlot = (day: number, period: number) => {
    return timetableEntries.find(e => {
      if (e.day_of_week !== day || e.period !== period) return false;
      if (e.week_type === 'both') return true;
      if (e.week_type === 'odd' && isOddWeek) return true;
      if (e.week_type === 'even' && !isOddWeek) return true;
      return false;
    });
  };

  // Check if two consecutive periods form a double lesson
  const isStartOfDouble = (day: number, period: number) => {
    const current = getEntryForSlot(day, period);
    const next = getEntryForSlot(day, period + 1);
    if (!current || !next) return false;
    return current.subject_id === next.subject_id && 
           current.teacher_short === next.teacher_short &&
           current.week_type === next.week_type &&
           period !== 6 && period + 1 !== 7;
  };

  const isSecondOfDouble = (day: number, period: number) => {
    const current = getEntryForSlot(day, period);
    const prev = getEntryForSlot(day, period - 1);
    if (!current || !prev) return false;
    return current.subject_id === prev.subject_id && 
           current.teacher_short === prev.teacher_short &&
           current.week_type === prev.week_type &&
           period !== 7 && period - 1 !== 7;
  };

  // Get absence for a slot
  const getAbsenceForSlot = (date: Date, entryId: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return absences.find(a => a.date === dateStr && a.timetable_entry_id === entryId);
  };

  // Build visible periods (1-9 except 7 which is lunch)
  const visiblePeriods = [1, 2, 3, 4, 5, 6, 8, 9];

  // Group consecutive periods into display slots
  const getDisplaySlots = (dayIndex: number) => {
    const day = dayIndex + 1;
    const slots: { period: number; isDouble: boolean; entry: TimetableEntry | undefined }[] = [];
    
    for (const period of visiblePeriods) {
      const entry = getEntryForSlot(day, period);
      
      // Skip default free periods (marked with teacher_short = 'FREI' and no subject)
      if (entry && entry.teacher_short === 'FREI' && !entry.subject_id) {
        continue;
      }
      
      if (isSecondOfDouble(day, period)) continue; // Skip second part of double
      
      slots.push({
        period,
        isDouble: isStartOfDouble(day, period),
        entry,
      });
    }
    
    return slots;
  };

  // Handle slot selection
  const toggleSlotSelection = (date: Date, entry: TimetableEntry, isDouble: boolean) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const key = `${dateStr}:${entry.id}`;
    const newSelected = new Set(selectedSlots);
    
    if (newSelected.has(key)) {
      newSelected.delete(key);
      // If double lesson, also remove the second period
      if (isDouble) {
        const nextEntry = getEntryForSlot(entry.day_of_week, entry.period + 1);
        if (nextEntry) {
          newSelected.delete(`${dateStr}:${nextEntry.id}`);
        }
      }
    } else {
      newSelected.add(key);
      // If double lesson, also add the second period
      if (isDouble) {
        const nextEntry = getEntryForSlot(entry.day_of_week, entry.period + 1);
        if (nextEntry) {
          newSelected.add(`${dateStr}:${nextEntry.id}`);
        }
      }
    }
    
    setSelectedSlots(newSelected);
  };

  // Submit selected absences
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
      .upsert(inserts, { onConflict: 'user_id,date,timetable_entry_id' });

    if (error) {
      toast.error('Fehler beim Speichern');
      console.error(error);
    } else {
      toast.success(`${selectedSlots.size} Fehlstunde(n) eingetragen`);
      setSelectedSlots(new Set());
      fetchData();
    }
  };

  // Toggle excused status - also updates double lessons together
  const toggleExcused = async (absence: LessonAbsence, currentExcused: boolean) => {
    const idsToUpdate = [absence.id];
    
    // Check if this is part of a double lesson
    const entry = absence.timetable_entries;
    const nextEntry = getEntryForSlot(entry.day_of_week, entry.period + 1);
    const prevEntry = getEntryForSlot(entry.day_of_week, entry.period - 1);
    
    // Check if next period is part of double lesson
    if (nextEntry && nextEntry.subject_id === entry.subject_id && nextEntry.teacher_short === entry.teacher_short) {
      const nextAbsence = getAbsenceForSlot(new Date(absence.date), nextEntry.id);
      if (nextAbsence) idsToUpdate.push(nextAbsence.id);
    }
    
    // Check if prev period is part of double lesson
    if (prevEntry && prevEntry.subject_id === entry.subject_id && prevEntry.teacher_short === entry.teacher_short) {
      const prevAbsence = getAbsenceForSlot(new Date(absence.date), prevEntry.id);
      if (prevAbsence) idsToUpdate.push(prevAbsence.id);
    }

    const { error } = await supabase
      .from('lesson_absences')
      .update({ excused: !currentExcused })
      .in('id', idsToUpdate);

    if (error) {
      toast.error('Fehler beim Aktualisieren');
    } else {
      toast.success(currentExcused ? 'Als nicht entschuldigt markiert' : 'Als entschuldigt markiert');
      fetchData();
    }
  };

  // Delete absence
  const handleDeleteAbsence = async (id: string) => {
    const { error } = await supabase
      .from('lesson_absences')
      .delete()
      .eq('id', id);

    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Gelöscht');
      fetchData();
    }
  };

  // Delete all absences for a slot (including double lessons)
  const handleDeleteSlot = async (date: Date, entry: TimetableEntry, isDouble: boolean) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const idsToDelete = [entry.id];
    
    if (isDouble) {
      const nextEntry = getEntryForSlot(entry.day_of_week, entry.period + 1);
      if (nextEntry) idsToDelete.push(nextEntry.id);
    }

    const { error } = await supabase
      .from('lesson_absences')
      .delete()
      .eq('user_id', user!.id)
      .eq('date', dateStr)
      .in('timetable_entry_id', idsToDelete);

    if (error) {
      toast.error('Fehler beim Löschen');
    } else {
      toast.success('Fehlzeit entfernt');
      fetchData();
    }
  };

  // Statistics for current week (exclude EVA - treated like free periods)
  const weekAbsencesWithoutEva = absences.filter(a => a.reason !== 'efa');
  const totalHours = weekAbsencesWithoutEva.length;
  const excusedCount = weekAbsencesWithoutEva.filter(a => a.excused).length;
  const unexcusedCount = weekAbsencesWithoutEva.filter(a => !a.excused).length;

  const goToPreviousWeek = () => setCurrentWeekStart(subWeeks(currentWeekStart, 1));
  const goToNextWeek = () => setCurrentWeekStart(addWeeks(currentWeekStart, 1));
  const goToCurrentWeek = () => setCurrentWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }


  const handleDownloadReport = () => {
    // Group double lessons together
    const groupedAbsences: Map<string, typeof allAbsences> = new Map();
    
    allAbsences.forEach(absence => {
      const entry = absence.timetable_entries;
      const dateKey = absence.date;
      const subjectKey = entry?.subjects?.id || entry?.teacher_short || 'unknown';
      
      // Create a key that groups by date + subject + consecutive periods
      const baseKey = `${dateKey}-${subjectKey}`;
      
      if (!groupedAbsences.has(baseKey)) {
        groupedAbsences.set(baseKey, []);
      }
      groupedAbsences.get(baseKey)!.push(absence);
    });

    // Process grouped absences to identify double lessons
    const reportData = Array.from(groupedAbsences.values()).map(group => {
      // Sort by period
      group.sort((a, b) => (a.timetable_entries?.period || 0) - (b.timetable_entries?.period || 0));
      
      // Check if consecutive periods (double lesson)
      const isDouble = group.length >= 2 && 
        group[1].timetable_entries?.period === (group[0].timetable_entries?.period || 0) + 1;
      
      const first = group[0];
      return {
        id: first.id,
        date: first.date,
        reason: first.reason,
        excused: first.excused,
        description: first.description,
        isDoublePeriod: isDouble,
        periodStart: first.timetable_entries?.period || 0,
        periodEnd: isDouble ? (group[1].timetable_entries?.period || 0) : (first.timetable_entries?.period || 0),
        timetable_entries: {
          period: first.timetable_entries?.period || 0,
          teacher_short: first.timetable_entries?.teacher_short || '',
          subjects: first.timetable_entries?.subjects || null,
        }
      };
    });
    
    generateAbsenceReport(reportData, stats, reportName || undefined);
    toast.success('PDF-Bericht wurde heruntergeladen');
    setShowReportDialog(false);
    setReportName('');
  };

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-rose-500 to-red-600 shadow-lg shrink-0">
              <Calendar className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold truncate">Fehltage</h2>
            <span className="text-xs text-muted-foreground">({stats.total} Std)</span>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowReportDialog(true)} className="gap-1 h-8 text-xs">
          <FileDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PDF</span>
        </Button>
      </div>

      {/* Report Name Dialog */}
      <Dialog open={showReportDialog} onOpenChange={setShowReportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>PDF-Bericht erstellen</DialogTitle>
            <DialogDescription>
              Gib deinen Namen ein, der auf dem Bericht erscheinen soll.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="report-name">Name des Schülers</Label>
              <Input
                id="report-name"
                placeholder="z.B. Max Mustermann"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDownloadReport()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReportDialog(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleDownloadReport} className="gap-2">
              <FileDown className="w-4 h-4" />
              Herunterladen
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Comprehensive Statistics Overview */}
      <Card className="p-4 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
          <Clock className="w-4 h-4" />
          Gesamtübersicht
        </h3>
        
        {/* Total Hours and Days */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Fehlstunden gesamt</div>
            <div className="text-xs text-muted-foreground mt-1">({stats.totalDays} Tage)</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <div className="text-3xl font-bold">{stats.absenceHours}</div>
            <div className="text-sm text-muted-foreground">Abwesend</div>
            <div className="text-xs text-muted-foreground mt-1">({stats.absenceDays} Tage)</div>
          </div>
        </div>

        {/* Breakdown by Reason */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Nach Grund:</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="flex items-center gap-2 bg-red-500/10 rounded-lg p-2">
              <Thermometer className="w-4 h-4 text-red-500" />
              <div>
                <div className="font-medium text-sm">{stats.sickCount} Std</div>
                <div className="text-xs text-muted-foreground">Krank ({stats.sickDays}T)</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-blue-500/10 rounded-lg p-2">
              <Stethoscope className="w-4 h-4 text-blue-500" />
              <div>
                <div className="font-medium text-sm">{stats.doctorCount} Std</div>
                <div className="text-xs text-muted-foreground">Arzt ({stats.doctorDays}T)</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-yellow-500/10 rounded-lg p-2">
              <FolderKanban className="w-4 h-4 text-yellow-500" />
              <div>
                <div className="font-medium text-sm">{stats.schoolProjectCount} Std</div>
                <div className="text-xs text-muted-foreground">Schulprojekt ({stats.schoolProjectDays}T)</div>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-gray-500/10 rounded-lg p-2">
              <HelpCircle className="w-4 h-4 text-gray-500" />
              <div>
                <div className="font-medium text-sm">{stats.otherCount} Std</div>
                <div className="text-xs text-muted-foreground">Sonstiges ({stats.otherDays}T)</div>
              </div>
            </div>
          </div>
        </div>

        {/* Excused vs Unexcused */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-muted-foreground">Entschuldigt / Offen:</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-3 bg-green-500/10 rounded-lg p-3">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <div>
                <div className="font-bold text-lg text-green-600">{stats.excused} Std</div>
                <div className="text-xs text-muted-foreground">Entschuldigt ({stats.excusedDays} Tage)</div>
              </div>
            </div>
            <button 
              onClick={scrollToUnexcused}
              className="flex items-center gap-3 bg-orange-500/10 rounded-lg p-3 text-left hover:bg-orange-500/20 transition-colors cursor-pointer"
              disabled={stats.unexcused === 0}
            >
              <AlertCircle className="w-5 h-5 text-orange-500" />
              <div>
                <div className="font-bold text-lg text-orange-600">{stats.unexcused} Std</div>
                <div className="text-xs text-muted-foreground">
                  Offen ({stats.unexcusedDays} Tage)
                  {stats.unexcused > 0 && <span className="ml-1">→ anzeigen</span>}
                </div>
              </div>
            </button>
          </div>
        </div>
      </Card>

      {/* Reason Selector */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Grund auswählen:</p>
        <div className="flex flex-wrap gap-2">
          {REASONS.map(reason => {
            const Icon = reason.icon;
            const isActive = selectedReason === reason.value;
            return (
              <Button
                key={reason.value}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                className={`gap-2 ${isActive ? '' : 'opacity-60'}`}
                onClick={() => setSelectedReason(reason.value)}
              >
                <Icon className="w-4 h-4" />
                {reason.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Week Navigation */}
      <div className="flex items-center justify-between gap-2">
        <Button variant="outline" size="icon" onClick={goToPreviousWeek} className="shrink-0">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="text-center flex-1">
          <p className="font-medium text-sm md:text-base">
            {format(currentWeekStart, 'dd. MMM', { locale: de })} - {format(addDays(currentWeekStart, 4), 'dd. MMM yyyy', { locale: de })}
          </p>
          <div className="flex items-center justify-center gap-2">
            <span className={`text-xs px-2 py-0.5 rounded font-medium ${isOddWeek ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              {isOddWeek ? 'A-Woche' : 'B-Woche'}
            </span>
            <span className="text-xs text-muted-foreground">(KW {currentWeekNum})</span>
          </div>
          <Button variant="link" size="sm" onClick={goToCurrentWeek} className="text-muted-foreground text-xs">
            Zur aktuellen Woche
          </Button>
        </div>
        <Button variant="outline" size="icon" onClick={goToNextWeek} className="shrink-0">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>

      {/* View Mode Toggle & Day Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          <Button variant={viewMode === 'full' ? 'default' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewMode('full')}>
            <LayoutGrid className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Vollansicht</span>
            <span className="sm:hidden">5T</span>
          </Button>
          <Button variant={viewMode === 'compact' ? 'default' : 'ghost'} size="sm" className="h-7 px-2 text-xs" onClick={() => setViewMode('compact')}>
            <Columns3 className="w-3.5 h-3.5 mr-1" />
            <span className="hidden sm:inline">Kompakt</span>
            <span className="sm:hidden">3T</span>
          </Button>
        </div>
        {viewMode === 'compact' && (
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={goToPreviousDays} disabled={mobileViewStart === 0}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium min-w-[50px] text-center">
              {DAYS[visibleDayIndices[0]]} - {DAYS[visibleDayIndices[visibleDayIndices.length - 1]]}
            </span>
            <Button variant="ghost" size="sm" className="h-7 px-2" onClick={goToNextDays} disabled={mobileViewStart >= 2}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Weekly Calendar Grid */}
      <div className={viewMode === 'full' ? 'overflow-x-auto' : ''}>
        <div className={viewMode === 'full' ? 'min-w-[600px]' : ''}>
          {/* Day Headers */}
          <div className={`grid gap-1 md:gap-2 mb-2 ${viewMode === 'full' ? 'grid-cols-5' : 'grid-cols-3'}`}>
            {visibleDayIndices.map((i) => (
              <div key={i} className="text-center p-1 md:p-2 bg-muted/50 rounded-lg">
                <div className="font-medium text-xs md:text-sm">{DAYS[i]}</div>
                <div className="text-[10px] md:text-xs text-muted-foreground">{format(weekDates[i], 'dd.MM')}</div>
              </div>
            ))}
          </div>

          {/* Slots Grid */}
          <div className={`grid gap-1 ${viewMode === 'full' ? 'grid-cols-5' : 'grid-cols-3'}`}>
            {visibleDayIndices.map((dayIndex) => {
              const date = weekDates[dayIndex];
              return (
                <div key={dayIndex} className="space-y-1">
                  {getDisplaySlots(dayIndex).map(slot => {
                    if (!slot.entry) {
                      return (
                        <div 
                          key={slot.period} 
                          className={`p-1 md:p-2 text-center text-[10px] md:text-xs text-muted-foreground/40 border border-dashed border-border/30 rounded ${slot.isDouble ? 'min-h-[50px] md:min-h-[70px]' : 'min-h-[32px] md:min-h-[40px]'}`}
                        >
                          {slot.period}.{slot.isDouble && `+${slot.period + 1}.`}
                        </div>
                      );
                    }

                    const absence = getAbsenceForSlot(date, slot.entry.id);
                    
                    // Check if this slot has EVA - skip it like a free period
                    if (absence?.reason === 'efa') {
                      return null;
                    }
                    
                    // For double lessons, also check next period for EVA
                    if (slot.isDouble) {
                      const nextEntry = getEntryForSlot(slot.entry.day_of_week, slot.entry.period + 1);
                      if (nextEntry) {
                        const nextAbsence = getAbsenceForSlot(date, nextEntry.id);
                        if (nextAbsence?.reason === 'efa') {
                          return null;
                        }
                      }
                    }
                    
                    const dateStr = format(date, 'yyyy-MM-dd');
                    const isSelected = selectedSlots.has(`${dateStr}:${slot.entry.id}`);
                    
                    // Check if double lesson has absence
                    let doubleHasAbsence = false;
                    let doubleAbsence: LessonAbsence | undefined;
                    if (slot.isDouble) {
                      const nextEntry = getEntryForSlot(slot.entry.day_of_week, slot.entry.period + 1);
                      if (nextEntry) {
                        doubleAbsence = getAbsenceForSlot(date, nextEntry.id);
                        doubleHasAbsence = !!(absence || doubleAbsence);
                      }
                    }

                    const hasAbsence = absence || doubleHasAbsence;
                    const displayAbsence = absence || doubleAbsence;

                    // Get color based on absence reason
                    const getSlotBg = () => {
                      if (isSelected) return 'bg-primary/30 border-primary ring-2 ring-primary';
                      if (hasAbsence) {
                        const reason = displayAbsence?.reason || 'sick';
                        if (reason === 'school_project') return 'bg-yellow-500/20 border-yellow-500/50';
                        return 'bg-red-500/20 border-red-500/50';
                      }
                      return 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20';
                    };

                    return (
                      <div
                        key={slot.period}
                        className={`p-2 rounded border cursor-pointer transition-all ${getSlotBg()} ${slot.isDouble ? 'min-h-[70px]' : 'min-h-[40px]'}`}
                        onClick={() => {
                          if (hasAbsence) {
                            handleDeleteSlot(date, slot.entry!, slot.isDouble);
                          } else {
                            toggleSlotSelection(date, slot.entry!, slot.isDouble);
                          }
                        }}
                      >
                        <div className="flex flex-col items-center justify-center h-full gap-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {slot.period}.{slot.isDouble && `-${slot.period + 1}.`} Std
                          </span>
                          <span className="text-xs font-medium truncate max-w-full">
                            {slot.entry.subjects?.short_name || slot.entry.subjects?.name?.slice(0, 6) || '-'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {slot.entry.teacher_short}
                          </span>
                          {hasAbsence && displayAbsence && (
                            <div className="flex items-center gap-1 mt-0.5">
                              {displayAbsence.excused ? (
                                <CheckCircle2 className="w-3 h-3 text-green-500" />
                              ) : (
                                <XCircle className="w-3 h-3 text-orange-500" />
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selection Action Bar */}
      {selectedSlots.size > 0 && (
        <Card className="p-4 bg-primary/10 border-primary/30 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-primary" />
            <span className="font-medium">{selectedSlots.size} Stunde(n) ausgewählt</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedSlots(new Set())}>
              Abbrechen
            </Button>
            <Button size="sm" onClick={handleSubmitAbsences}>
              Eintragen
            </Button>
          </div>
        </Card>
      )}

      {/* Legend */}
      <div className="flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-500/20 border border-green-500/30" />
          <span>Anwesend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-500/20 border border-red-500/50" />
          <span>Abwesend</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-yellow-500/20 border border-yellow-500/50" />
          <span>Schulprojekt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="w-3 h-3 text-green-500" />
          <span>Entschuldigt</span>
        </div>
        <div className="flex items-center gap-1.5">
          <XCircle className="w-3 h-3 text-orange-500" />
          <span>Nicht entschuldigt</span>
        </div>
      </div>

      {/* This Week's Statistics */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3 bg-card/80 backdrop-blur-sm border-border/50 text-center">
          <div className="text-2xl font-bold">{totalHours}</div>
          <div className="text-xs text-muted-foreground">Diese Woche</div>
        </Card>
        <Card className="p-3 bg-card/80 backdrop-blur-sm border-border/50 text-center">
          <div className="text-2xl font-bold text-green-500">{excusedCount}</div>
          <div className="text-xs text-muted-foreground">Entschuldigt</div>
        </Card>
        <Card className="p-3 bg-card/80 backdrop-blur-sm border-border/50 text-center">
          <div className="text-2xl font-bold text-orange-500">{unexcusedCount}</div>
          <div className="text-xs text-muted-foreground">Offen</div>
        </Card>
      </div>

      {/* This Week's Absences List - grouped by double lessons (exclude EVA) */}
      {weekAbsencesWithoutEva.length > 0 && (
        <div className="space-y-2">
          <h3 className="font-semibold">Fehlzeiten dieser Woche</h3>
          <div className="space-y-1">
            {(() => {
              // Group absences by date and teacher to detect double lessons
              const grouped: { absence: LessonAbsence; isDouble: boolean; secondPeriod?: number }[] = [];
              const processedIds = new Set<string>();
              
              for (const absence of weekAbsencesWithoutEva) {
                if (processedIds.has(absence.id)) continue;
                
                const entry = absence.timetable_entries;
                const nextEntry = getEntryForSlot(entry.day_of_week, entry.period + 1);
                
                // Check if next period is a double lesson partner
                let isDouble = false;
                let secondPeriod: number | undefined;
                
                if (nextEntry && nextEntry.subject_id === entry.subject_id && nextEntry.teacher_short === entry.teacher_short) {
                  const nextAbsence = weekAbsencesWithoutEva.find(
                    a => a.date === absence.date && a.timetable_entry_id === nextEntry.id
                  );
                  if (nextAbsence) {
                    isDouble = true;
                    secondPeriod = entry.period + 1;
                    processedIds.add(nextAbsence.id);
                  }
                }
                
                processedIds.add(absence.id);
                grouped.push({ absence, isDouble, secondPeriod });
              }
              
              return grouped.map(({ absence, isDouble, secondPeriod }) => {
                const reason = REASONS.find(r => r.value === absence.reason);
                const Icon = reason?.icon || HelpCircle;
                const entry = absence.timetable_entries;
                
                return (
                  <div
                    key={absence.id}
                    className={`flex items-center gap-3 p-2 rounded-lg bg-card/80 border ${
                      absence.excused ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-orange-500'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${reason?.color.replace('bg-', 'text-')}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">
                        {format(new Date(absence.date), 'EEE dd.MM', { locale: de })}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {isDouble ? `${entry.period}.-${secondPeriod}. Std` : `${entry.period}. Std`} - {entry.subjects?.short_name || entry.subjects?.name || '-'}
                      </span>
                      {isDouble && (
                        <span className="text-xs text-primary ml-1">(Doppelstd.)</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={absence.excused ? 'text-green-500' : 'text-orange-500'}
                      onClick={() => toggleExcused(absence, absence.excused)}
                    >
                      {absence.excused ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive h-8 w-8"
                      onClick={() => handleDeleteAbsence(absence.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Unexcused Absences List - all time, clickable */}
      {unexcusedAbsences.length > 0 && (
        <div ref={unexcusedListRef} className="space-y-2">
          <h3 className="font-semibold flex items-center gap-2 text-orange-600">
            <AlertCircle className="w-4 h-4" />
            Offene Fehlzeiten ({unexcusedAbsences.length})
          </h3>
          <ScrollArea className="h-auto max-h-[300px]">
            <div className="space-y-1 pr-2">
              {unexcusedAbsences.map((absence) => {
                const reason = REASONS.find(r => r.value === absence.reason);
                const Icon = reason?.icon || HelpCircle;
                const entry = absence.timetable_entries;
                
                return (
                  <div
                    key={absence.id}
                    className="flex items-center gap-3 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30"
                  >
                    <Icon className={`w-4 h-4 ${reason?.color.replace('bg-', 'text-')}`} />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium">
                        {format(new Date(absence.date), 'EEE dd.MM.yyyy', { locale: de })}
                      </span>
                      <span className="text-sm text-muted-foreground ml-2">
                        {entry.period}. Std - {entry.subjects?.short_name || entry.subjects?.name || '-'}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-green-600 border-green-500/50 hover:bg-green-500/20"
                      onClick={() => toggleExcused(absence, false)}
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" />
                      Entschuldigen
                    </Button>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  );
}
