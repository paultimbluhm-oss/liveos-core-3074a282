import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminDelete } from '@/contexts/AdminDeleteContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Settings, Plus, X, Clock, Check, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { Course } from './types';
import { DeleteCourseDialog } from './DeleteCourseDialog';

const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr'];
const DAYS_FULL = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const PERIODS = [1, 2, 3, 4, 5, 6, 8, 9];

interface TimetableSlot {
  id: string;
  dayOfWeek: number;
  period: number;
  isDouble: boolean;
  weekType: 'both' | 'odd' | 'even';
  isNew?: boolean;
}

interface ClassOption {
  id: string;
  name: string;
}

interface EditCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course: Course;
  onCourseUpdated: () => void;
}

export function EditCourseDialog({ 
  open, 
  onOpenChange, 
  course,
  onCourseUpdated 
}: EditCourseDialogProps) {
  const { user } = useAuth();
  const { verifyCode, requestCode } = useAdminDelete();
  
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authCode, setAuthCode] = useState('');
  const [authError, setAuthError] = useState(false);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [availableClasses, setAvailableClasses] = useState<ClassOption[]>([]);
  
  // Form state
  const [visibilityType, setVisibilityType] = useState<'year' | 'class'>('year');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [courseName, setCourseName] = useState('');
  const [shortName, setShortName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('');
  const [hasGrading, setHasGrading] = useState(true);
  const [writtenWeight, setWrittenWeight] = useState('50');
  const [oralWeight, setOralWeight] = useState('50');
  
  // Timetable slots
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [showSlotForm, setShowSlotForm] = useState(false);
  const [newSlotDay, setNewSlotDay] = useState('1');
  const [newSlotPeriod, setNewSlotPeriod] = useState('1');
  const [newSlotDouble, setNewSlotDouble] = useState(false);
  const [newSlotWeekType, setNewSlotWeekType] = useState<'both' | 'odd' | 'even'>('both');
  
  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleAuth = useCallback(() => {
    if (verifyCode(authCode)) {
      setIsAuthenticated(true);
      setAuthError(false);
    } else {
      setAuthError(true);
    }
  }, [authCode, verifyCode]);

  const loadCourseData = useCallback(async () => {
    if (!course || !user) return;
    
    setLoading(true);
    
    // Load course details
    setCourseName(course.name);
    setShortName(course.short_name || '');
    setTeacherName(course.teacher_name || '');
    setRoom(course.room || '');
    setHasGrading(course.has_grading ?? true);
    setWrittenWeight((course.written_weight ?? 50).toString());
    setOralWeight((course.oral_weight ?? 50).toString());
    setVisibilityType(course.class_id ? 'class' : 'year');
    setSelectedClassId(course.class_id || '');
    
    // Load classes
    const { data: classesData } = await supabase
      .from('classes')
      .select('id, name')
      .eq('school_year_id', course.school_year_id)
      .order('name');
    
    if (classesData) {
      setAvailableClasses(classesData);
    }
    
    // Load existing slots
    const { data: slotsData } = await supabase
      .from('course_timetable_slots')
      .select('*')
      .eq('course_id', course.id)
      .order('day_of_week')
      .order('period');
    
    if (slotsData) {
      // Group by day/period/weekType to detect double lessons
      const groupedSlots: TimetableSlot[] = [];
      const processed = new Set<string>();
      
      for (const slot of slotsData) {
        const key = `${slot.day_of_week}-${slot.period}-${slot.week_type}`;
        if (processed.has(key)) continue;
        processed.add(key);
        
        groupedSlots.push({
          id: slot.id,
          dayOfWeek: slot.day_of_week,
          period: slot.period,
          isDouble: slot.is_double_lesson || false,
          weekType: slot.week_type as 'both' | 'odd' | 'even',
        });
      }
      
      setSlots(groupedSlots);
    }
    
    setLoading(false);
  }, [course, user]);

  useEffect(() => {
    if (open && isAuthenticated) {
      loadCourseData();
    }
  }, [open, isAuthenticated, loadCourseData]);

  useEffect(() => {
    if (!open) {
      setIsAuthenticated(false);
      setAuthCode('');
      setAuthError(false);
    }
  }, [open]);

  const addSlot = () => {
    const dayNum = parseInt(newSlotDay);
    const periodNum = parseInt(newSlotPeriod);
    
    const exists = slots.some(s => 
      s.dayOfWeek === dayNum && 
      s.period === periodNum && 
      s.weekType === newSlotWeekType
    );
    
    if (exists) {
      toast.error('Diese Stunde existiert bereits');
      return;
    }
    
    setSlots([...slots, {
      id: crypto.randomUUID(),
      dayOfWeek: dayNum,
      period: periodNum,
      isDouble: newSlotDouble,
      weekType: newSlotWeekType,
      isNew: true,
    }]);
    
    setShowSlotForm(false);
    setNewSlotDay('1');
    setNewSlotPeriod('1');
    setNewSlotDouble(false);
    setNewSlotWeekType('both');
  };

  const removeSlot = (id: string) => {
    setSlots(slots.filter(s => s.id !== id));
  };

  const handleSave = async () => {
    if (!user || !course) return;
    
    if (!courseName.trim()) {
      toast.error('Kursname erforderlich');
      return;
    }
    
    setSaving(true);
    
    try {
      // Update course
      const courseClassId = visibilityType === 'class' ? selectedClassId : null;
      
      const { error: updateError } = await supabase
        .from('courses')
        .update({
          name: courseName.trim(),
          short_name: shortName.trim() || null,
          teacher_name: teacherName.trim() || null,
          room: room.trim() || null,
          class_id: courseClassId || null,
          has_grading: hasGrading,
          written_weight: hasGrading ? parseInt(writtenWeight) || 50 : null,
          oral_weight: hasGrading ? parseInt(oralWeight) || 50 : null,
        })
        .eq('id', course.id);
      
      if (updateError) {
        toast.error(`Fehler: ${updateError.message}`);
        setSaving(false);
        return;
      }
      
      // Delete all existing slots
      await supabase
        .from('course_timetable_slots')
        .delete()
        .eq('course_id', course.id);
      
      // Create new slots
      for (const slot of slots) {
        await supabase.from('course_timetable_slots').insert({
          course_id: course.id,
          day_of_week: slot.dayOfWeek,
          period: slot.period,
          room: room.trim() || null,
          week_type: slot.weekType,
          is_double_lesson: slot.isDouble,
        });
        
        // If double lesson, create second slot
        if (slot.isDouble && slot.period < 9 && slot.period !== 6) {
          const nextPeriod = slot.period === 6 ? 8 : slot.period + 1;
          await supabase.from('course_timetable_slots').insert({
            course_id: course.id,
            day_of_week: slot.dayOfWeek,
            period: nextPeriod,
            room: room.trim() || null,
            week_type: slot.weekType,
            is_double_lesson: false,
          });
        }
      }
      
      // Update timetable entries for all members
      const { data: members } = await supabase
        .from('course_members')
        .select('user_id')
        .eq('course_id', course.id);
      
      if (members) {
        for (const member of members) {
          // Delete old entries for this course
          await supabase
            .from('timetable_entries')
            .delete()
            .eq('user_id', member.user_id)
            .eq('course_id', course.id);
          
          // Get updated slots
          const { data: newSlots } = await supabase
            .from('course_timetable_slots')
            .select('*')
            .eq('course_id', course.id);
          
          if (newSlots) {
            for (const newSlot of newSlots) {
              await supabase.from('timetable_entries').insert({
                user_id: member.user_id,
                day_of_week: newSlot.day_of_week,
                period: newSlot.period,
                course_id: course.id,
                teacher_short: teacherName.trim() || '',
                room: newSlot.room || room.trim() || null,
                week_type: newSlot.week_type,
              });
            }
          }
        }
      }
      
      toast.success('Kurs aktualisiert');
      onCourseUpdated();
      onOpenChange(false);
    } catch (err) {
      toast.error('Unerwarteter Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const getWeekTypeLabel = (wt: string) => {
    if (wt === 'odd') return 'A';
    if (wt === 'even') return 'B';
    return '';
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-base">
              <Settings className="w-4 h-4" strokeWidth={1.5} />
              Kurs bearbeiten
            </DialogTitle>
          </DialogHeader>
          
          {!isAuthenticated ? (
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center">
                  <Lock className="w-8 h-8 text-amber-500" strokeWidth={1.5} />
                </div>
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="font-semibold">Admin-Bereich</h3>
                <p className="text-xs text-muted-foreground">
                  Gib den Admin-Code ein, um die Kurseinstellungen zu bearbeiten.
                </p>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs">Admin-Code</Label>
                <Input
                  type="text"
                  value={authCode}
                  onChange={(e) => {
                    setAuthCode(e.target.value.toUpperCase());
                    setAuthError(false);
                  }}
                  placeholder="Code eingeben..."
                  className={`h-10 text-center font-mono text-lg tracking-widest ${authError ? 'border-destructive' : ''}`}
                  maxLength={6}
                  onKeyDown={(e) => e.key === 'Enter' && handleAuth()}
                />
                {authError && (
                  <p className="text-xs text-destructive text-center">Falscher Code</p>
                )}
              </div>
              
              <div className="flex flex-col gap-2">
                <Button onClick={handleAuth} disabled={authCode.length < 6}>
                  <Lock className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  Entsperren
                </Button>
                <Button variant="ghost" size="sm" className="text-xs" onClick={requestCode}>
                  Code anfordern
                </Button>
              </div>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
            </div>
          ) : (
            <ScrollArea className="max-h-[70vh]">
              <div className="p-4 space-y-4">
                {/* Visibility Selection */}
                <div className="p-3 rounded-lg border border-border/50 space-y-3">
                  <Label className="text-xs font-medium">Sichtbarkeit</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={visibilityType === 'year' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => {
                        setVisibilityType('year');
                        setSelectedClassId('');
                      }}
                    >
                      Gesamter Jahrgang
                    </Button>
                    <Button
                      type="button"
                      variant={visibilityType === 'class' ? 'default' : 'outline'}
                      size="sm"
                      className="flex-1 h-8 text-xs"
                      onClick={() => setVisibilityType('class')}
                    >
                      Nur Klasse
                    </Button>
                  </div>
                  
                  {visibilityType === 'class' && (
                    <div>
                      <Label className="text-[10px] text-muted-foreground">Klasse waehlen</Label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="h-8 mt-1">
                          <SelectValue placeholder="Klasse waehlen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {availableClasses.map(cls => (
                            <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                {/* Basic Info */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Kursname</Label>
                    <Input 
                      value={courseName}
                      onChange={(e) => setCourseName(e.target.value)}
                      placeholder="z.B. Mathematik"
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Kuerzel</Label>
                    <Input 
                      value={shortName}
                      onChange={(e) => setShortName(e.target.value)}
                      placeholder="z.B. MA"
                      className="h-9 mt-1"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Lehrer</Label>
                    <Input 
                      value={teacherName}
                      onChange={(e) => setTeacherName(e.target.value)}
                      placeholder="z.B. Mue"
                      className="h-9 mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Raum</Label>
                    <Input 
                      value={room}
                      onChange={(e) => setRoom(e.target.value)}
                      placeholder="z.B. A204"
                      className="h-9 mt-1"
                    />
                  </div>
                </div>
                
                {/* Grading Section */}
                <div className="p-3 rounded-lg border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">Bewertung</Label>
                    <div className="flex items-center gap-2">
                      <Checkbox 
                        id="editHasGrading" 
                        checked={hasGrading} 
                        onCheckedChange={(c) => setHasGrading(!!c)} 
                      />
                      <label htmlFor="editHasGrading" className="text-xs text-muted-foreground">
                        Benotung aktiv
                      </label>
                    </div>
                  </div>
                  
                  {hasGrading && (
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Schriftlich %</Label>
                        <Input 
                          type="number"
                          min="0"
                          max="100"
                          value={writtenWeight}
                          onChange={(e) => {
                            setWrittenWeight(e.target.value);
                            const w = parseInt(e.target.value) || 0;
                            setOralWeight((100 - w).toString());
                          }}
                          className="h-8 mt-1"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] text-muted-foreground">Muendlich %</Label>
                        <Input 
                          type="number"
                          min="0"
                          max="100"
                          value={oralWeight}
                          onChange={(e) => {
                            setOralWeight(e.target.value);
                            const o = parseInt(e.target.value) || 0;
                            setWrittenWeight((100 - o).toString());
                          }}
                          className="h-8 mt-1"
                        />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Timetable Slots Section */}
                <div className="p-3 rounded-lg border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" strokeWidth={1.5} />
                      <Label className="text-xs font-medium">Kursstunden</Label>
                    </div>
                    <Button 
                      type="button"
                      size="sm" 
                      variant="outline" 
                      className="h-7 text-[10px] gap-1"
                      onClick={() => setShowSlotForm(true)}
                    >
                      <Plus className="w-3 h-3" strokeWidth={1.5} />
                      Stunde
                    </Button>
                  </div>
                  
                  {/* Current Slots */}
                  {slots.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {slots.map(slot => (
                        <div 
                          key={slot.id}
                          className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-primary/10 text-primary text-[10px]"
                        >
                          <span className="font-medium">
                            {DAYS[slot.dayOfWeek - 1]} {slot.period}.
                            {slot.isDouble && '-' + (slot.period === 6 ? 8 : slot.period + 1) + '.'}
                            {slot.weekType !== 'both' && ` (${getWeekTypeLabel(slot.weekType)})`}
                          </span>
                          <button 
                            type="button"
                            onClick={() => removeSlot(slot.id)}
                            className="hover:text-destructive"
                          >
                            <X className="w-3 h-3" strokeWidth={1.5} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {slots.length === 0 && !showSlotForm && (
                    <p className="text-[10px] text-muted-foreground text-center py-2">
                      Keine Stunden hinzugefuegt
                    </p>
                  )}
                  
                  {/* Add Slot Form */}
                  {showSlotForm && (
                    <div className="p-2 rounded-md bg-muted/30 space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-[10px]">Tag</Label>
                          <Select value={newSlotDay} onValueChange={setNewSlotDay}>
                            <SelectTrigger className="h-8 mt-0.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS_FULL.map((day, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>{day}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-[10px]">Stunde</Label>
                          <Select value={newSlotPeriod} onValueChange={setNewSlotPeriod}>
                            <SelectTrigger className="h-8 mt-0.5">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PERIODS.map(p => (
                                <SelectItem key={p} value={p.toString()}>{p}.</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Checkbox 
                            id="editSlotDouble" 
                            checked={newSlotDouble} 
                            onCheckedChange={(c) => setNewSlotDouble(!!c)} 
                          />
                          <label htmlFor="editSlotDouble" className="text-[10px]">Doppelstunde</label>
                        </div>
                        
                        <Select value={newSlotWeekType} onValueChange={(v) => setNewSlotWeekType(v as 'both' | 'odd' | 'even')}>
                          <SelectTrigger className="h-7 w-28 text-[10px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="both">Jede Woche</SelectItem>
                            <SelectItem value="odd">A-Woche</SelectItem>
                            <SelectItem value="even">B-Woche</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          type="button"
                          size="sm" 
                          className="h-7 flex-1 text-[10px]"
                          onClick={addSlot}
                        >
                          Hinzufuegen
                        </Button>
                        <Button 
                          type="button"
                          size="sm" 
                          variant="ghost" 
                          className="h-7 text-[10px]"
                          onClick={() => setShowSlotForm(false)}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Save Button */}
                <Button 
                  onClick={handleSave} 
                  className="w-full h-10"
                  disabled={saving || !courseName.trim() || (visibilityType === 'class' && !selectedClassId)}
                >
                  <Check className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                  {saving ? 'Wird gespeichert...' : 'Aenderungen speichern'}
                </Button>
                
                {/* Danger Zone */}
                <div className="pt-4 mt-4 border-t border-destructive/30">
                  <Card className="border-destructive/30 bg-destructive/5">
                    <CardContent className="p-3 space-y-2">
                      <div className="flex items-center gap-2 text-destructive">
                        <AlertTriangle className="w-4 h-4" strokeWidth={1.5} />
                        <span className="text-xs font-medium">Gefahrenzone</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Das Loeschen eines Kurses entfernt alle zugehoerigen Daten unwiderruflich.
                      </p>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="w-full h-8 text-xs"
                        onClick={() => setDeleteDialogOpen(true)}
                      >
                        <Trash2 className="w-3 h-3 mr-1" strokeWidth={1.5} />
                        Kurs loeschen
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
      
      <DeleteCourseDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        courseId={course.id}
        courseName={course.name}
        onDeleted={() => {
          setDeleteDialogOpen(false);
          onOpenChange(false);
          onCourseUpdated();
        }}
      />
    </>
  );
}