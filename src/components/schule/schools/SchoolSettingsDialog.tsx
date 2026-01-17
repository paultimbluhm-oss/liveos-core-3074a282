import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Settings, Plus, Building2, GraduationCap, Users, Check, UserPlus, 
  Trash2, Palette, Coffee, ChevronRight, Clock
} from 'lucide-react';
import { toast } from 'sonner';
import { School, SchoolYear, Class } from './types';
import { Card, CardContent } from '@/components/ui/card';
import { DeleteSchoolDialog } from './DeleteSchoolDialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SchoolSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchoolChanged: () => void;
}

type SettingsView = 'main' | 'school' | 'grades' | 'freeperiod' | 'create-school' | 'create-year' | 'create-class';

const DAYS = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag'];
const PERIODS = [1, 2, 3, 4, 5, 6, 8, 9];

export function SchoolSettingsDialog({ open, onOpenChange, onSchoolChanged }: SchoolSettingsDialogProps) {
  const { user } = useAuth();
  const [view, setView] = useState<SettingsView>('main');
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Grade color settings
  const [greenMin, setGreenMin] = useState(13);
  const [yellowMin, setYellowMin] = useState(10);
  
  // Free period form
  const [freePeriodDay, setFreePeriodDay] = useState('1');
  const [freePeriodHour, setFreePeriodHour] = useState('1');
  const [freePeriodDouble, setFreePeriodDouble] = useState(false);
  const [freePeriodWeekType, setFreePeriodWeekType] = useState('both');
  const [savingFreePeriod, setSavingFreePeriod] = useState(false);
  
  // New school form
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolShortName, setNewSchoolShortName] = useState('');
  const [newSchoolDescription, setNewSchoolDescription] = useState('');
  const [creatingSchool, setCreatingSchool] = useState(false);
  
  // New year form
  const [newYearName, setNewYearName] = useState('');
  const [newYearNumber, setNewYearNumber] = useState('');
  const [creatingYear, setCreatingYear] = useState(false);
  
  // New class form
  const [newClassName, setNewClassName] = useState('');
  const [creatingClass, setCreatingClass] = useState(false);
  
  // Delete dialog
  const [deleteSchoolOpen, setDeleteSchoolOpen] = useState(false);
  const [schoolToDelete, setSchoolToDelete] = useState<{ id: string; name: string } | null>(null);

  const fetchData = async () => {
    if (!user) return;
    
    const [schoolsRes, profileRes, gradeColorRes] = await Promise.all([
      supabase.from('schools').select('*').order('name'),
      supabase.from('profiles').select('selected_school_id, selected_school_year_id, selected_class_id').eq('user_id', user.id).single(),
      supabase.from('grade_color_settings').select('*').eq('user_id', user.id).maybeSingle(),
    ]);
    
    if (schoolsRes.data) setSchools(schoolsRes.data);
    
    if (gradeColorRes.data) {
      setGreenMin(gradeColorRes.data.green_min);
      setYellowMin(gradeColorRes.data.yellow_min);
    }
    
    if (profileRes.data) {
      setSelectedSchoolId(profileRes.data.selected_school_id || '');
      setSelectedYearId(profileRes.data.selected_school_year_id || '');
      setSelectedClassId(profileRes.data.selected_class_id || '');
      
      if (profileRes.data.selected_school_id) {
        const { data: yearsData } = await supabase
          .from('school_years')
          .select('*')
          .eq('school_id', profileRes.data.selected_school_id)
          .order('year_number', { nullsFirst: false });
        if (yearsData) setSchoolYears(yearsData);
        
        if (profileRes.data.selected_school_year_id) {
          await fetchClasses(profileRes.data.selected_school_year_id);
        }
      }
    }
    
    setLoading(false);
  };

  const fetchClasses = async (yearId: string) => {
    if (!user) return;
    
    const { data: classesData } = await supabase
      .from('classes')
      .select('*')
      .eq('school_year_id', yearId)
      .order('name');
    
    if (classesData) {
      const enrichedClasses = await Promise.all(classesData.map(async (cls) => {
        const { count } = await supabase
          .from('class_members')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', cls.id);
        
        const { data: membership } = await supabase
          .from('class_members')
          .select('id')
          .eq('class_id', cls.id)
          .eq('user_id', user.id)
          .maybeSingle();
        
        return {
          ...cls,
          member_count: count || 0,
          is_member: !!membership,
        };
      }));
      
      setClasses(enrichedClasses);
    }
  };

  useEffect(() => {
    if (open) {
      setView('main');
      fetchData();
    }
  }, [open, user]);

  const handleSchoolChange = async (schoolId: string) => {
    setSelectedSchoolId(schoolId);
    setSelectedYearId('');
    setSelectedClassId('');
    setClasses([]);
    
    if (schoolId) {
      const { data: yearsData } = await supabase
        .from('school_years')
        .select('*')
        .eq('school_id', schoolId)
        .order('year_number', { nullsFirst: false });
      if (yearsData) setSchoolYears(yearsData);
    } else {
      setSchoolYears([]);
    }
  };

  const handleYearChange = async (yearId: string) => {
    setSelectedYearId(yearId);
    setSelectedClassId('');
    
    if (yearId) {
      await fetchClasses(yearId);
    } else {
      setClasses([]);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        selected_school_id: selectedSchoolId || null,
        selected_school_year_id: selectedYearId || null,
        selected_class_id: selectedClassId || null,
      })
      .eq('user_id', user.id);
    
    setSaving(false);
    
    if (error) {
      toast.error('Fehler beim Speichern');
    } else {
      toast.success('Gespeichert');
      onSchoolChanged();
      onOpenChange(false);
    }
  };

  const handleSaveGradeColors = async () => {
    if (!user) return;
    
    setSaving(true);
    
    // Check if settings exist
    const { data: existing } = await supabase
      .from('grade_color_settings')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (existing) {
      await supabase
        .from('grade_color_settings')
        .update({ green_min: greenMin, yellow_min: yellowMin })
        .eq('user_id', user.id);
    } else {
      await supabase.from('grade_color_settings').insert({
        user_id: user.id,
        green_min: greenMin,
        yellow_min: yellowMin,
      });
    }
    
    setSaving(false);
    toast.success('Notenfarben gespeichert');
    setView('main');
  };

  const handleAddFreePeriod = async () => {
    if (!user) return;
    
    setSavingFreePeriod(true);
    
    const dayNum = parseInt(freePeriodDay);
    const periodNum = parseInt(freePeriodHour);
    
    const baseData = {
      user_id: user.id,
      day_of_week: dayNum,
      course_id: null,
      subject_id: null,
      teacher_short: 'FREI',
      room: null,
      week_type: freePeriodWeekType,
    };
    
    // Delete existing entries at this slot first
    await supabase
      .from('timetable_entries')
      .delete()
      .eq('user_id', user.id)
      .eq('day_of_week', dayNum)
      .eq('period', periodNum);
    
    // Insert new free period
    const { error } = await supabase
      .from('timetable_entries')
      .insert({ ...baseData, period: periodNum });
    
    if (error) {
      toast.error('Fehler beim Speichern');
      setSavingFreePeriod(false);
      return;
    }
    
    // Handle double period
    if (freePeriodDouble) {
      const nextPeriod = periodNum + 1;
      if (nextPeriod <= 9 && nextPeriod !== 7) {
        await supabase
          .from('timetable_entries')
          .delete()
          .eq('user_id', user.id)
          .eq('day_of_week', dayNum)
          .eq('period', nextPeriod);
        
        await supabase
          .from('timetable_entries')
          .insert({ ...baseData, period: nextPeriod });
      }
    }
    
    toast.success('Freistunde eingetragen');
    setSavingFreePeriod(false);
    setFreePeriodDay('1');
    setFreePeriodHour('1');
    setFreePeriodDouble(false);
    setFreePeriodWeekType('both');
    onSchoolChanged();
    setView('main');
  };

  const handleCreateSchool = async () => {
    if (!user || !newSchoolName.trim()) {
      toast.error('Name erforderlich');
      return;
    }
    
    setCreatingSchool(true);
    const { data, error } = await supabase.from('schools').insert({
      name: newSchoolName.trim(),
      short_name: newSchoolShortName.trim() || null,
      description: newSchoolDescription.trim() || null,
      created_by: user.id,
    }).select().single();
    
    setCreatingSchool(false);
    
    if (error) {
      toast.error('Fehler beim Erstellen');
    } else {
      toast.success('Schule erstellt');
      setNewSchoolName('');
      setNewSchoolShortName('');
      setNewSchoolDescription('');
      fetchData();
      if (data) {
        setSelectedSchoolId(data.id);
        handleSchoolChange(data.id);
      }
      setView('school');
    }
  };

  const handleCreateYear = async () => {
    if (!user || !selectedSchoolId || !newYearName.trim()) {
      toast.error('Name erforderlich');
      return;
    }
    
    setCreatingYear(true);
    const { data, error } = await supabase.from('school_years').insert({
      school_id: selectedSchoolId,
      name: newYearName.trim(),
      year_number: newYearNumber ? parseInt(newYearNumber) : null,
      created_by: user.id,
    }).select().single();
    
    setCreatingYear(false);
    
    if (error) {
      toast.error('Fehler beim Erstellen');
    } else {
      toast.success('Jahrgang erstellt');
      setNewYearName('');
      setNewYearNumber('');
      handleSchoolChange(selectedSchoolId);
      if (data) {
        setSelectedYearId(data.id);
        handleYearChange(data.id);
      }
      setView('school');
    }
  };

  const handleCreateClass = async () => {
    if (!user || !selectedYearId || !newClassName.trim()) {
      toast.error('Name erforderlich');
      return;
    }
    
    setCreatingClass(true);
    const { data, error } = await supabase.from('classes').insert({
      school_year_id: selectedYearId,
      name: newClassName.trim(),
      created_by: user.id,
    }).select().single();
    
    setCreatingClass(false);
    
    if (error) {
      toast.error('Fehler beim Erstellen');
    } else {
      toast.success('Klasse erstellt');
      setNewClassName('');
      await fetchClasses(selectedYearId);
      if (data) {
        await supabase.from('class_members').insert({
          class_id: data.id,
          user_id: user.id,
          role: 'admin',
        });
        setSelectedClassId(data.id);
        await fetchClasses(selectedYearId);
      }
      setView('school');
    }
  };

  const joinClass = async (classId: string) => {
    if (!user) return;
    
    const { error } = await supabase.from('class_members').insert({
      class_id: classId,
      user_id: user.id,
      role: 'member',
    });
    
    if (error) {
      if (error.code === '23505') {
        toast.error('Bereits beigetreten');
      } else {
        toast.error('Fehler beim Beitreten');
      }
    } else {
      toast.success('Klasse beigetreten');
      setSelectedClassId(classId);
      await fetchClasses(selectedYearId);
    }
  };

  const getGradePreviewColor = (points: number) => {
    if (points >= greenMin) return 'bg-emerald-500';
    if (points >= yellowMin) return 'bg-amber-500';
    if (points >= 5) return 'bg-orange-500';
    return 'bg-rose-500';
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const selectedSchool = schools.find(s => s.id === selectedSchoolId);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-sm p-0 gap-0 overflow-hidden">
          <DialogHeader className="p-4 pb-3 border-b border-border/50">
            <DialogTitle className="flex items-center gap-2 text-base">
              {view === 'main' && <Settings className="w-4 h-4" strokeWidth={1.5} />}
              {view === 'school' && <Building2 className="w-4 h-4" strokeWidth={1.5} />}
              {view === 'grades' && <Palette className="w-4 h-4" strokeWidth={1.5} />}
              {view === 'freeperiod' && <Coffee className="w-4 h-4" strokeWidth={1.5} />}
              {view === 'create-school' && <Building2 className="w-4 h-4" strokeWidth={1.5} />}
              {view === 'create-year' && <GraduationCap className="w-4 h-4" strokeWidth={1.5} />}
              {view === 'create-class' && <Users className="w-4 h-4" strokeWidth={1.5} />}
              {view === 'main' && 'Einstellungen'}
              {view === 'school' && 'Schule & Klasse'}
              {view === 'grades' && 'Notenfarben'}
              {view === 'freeperiod' && 'Freistunde'}
              {view === 'create-school' && 'Neue Schule'}
              {view === 'create-year' && 'Neuer Jahrgang'}
              {view === 'create-class' && 'Neue Klasse'}
            </DialogTitle>
          </DialogHeader>
          
          <ScrollArea className="max-h-[70vh]">
            <div className="p-4">
              {/* Main Menu */}
              {view === 'main' && (
                <div className="space-y-2">
                  {/* School Selection Card */}
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setView('school')}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="w-4 h-4 text-primary" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Schule & Klasse</p>
                          <p className="text-xs text-muted-foreground">
                            {selectedSchool ? selectedSchool.short_name || selectedSchool.name : 'Nicht ausgewaehlt'}
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </CardContent>
                  </Card>
                  
                  {/* Grade Colors Card */}
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setView('grades')}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                          <Palette className="w-4 h-4 text-emerald-500" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Notenfarben</p>
                          <p className="text-xs text-muted-foreground">
                            Gruen ab {greenMin}P, Gelb ab {yellowMin}P
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </CardContent>
                  </Card>
                  
                  {/* Free Period Card */}
                  <Card 
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => setView('freeperiod')}
                  >
                    <CardContent className="p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
                          <Coffee className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Freistunde hinzufuegen</p>
                          <p className="text-xs text-muted-foreground">
                            Regelmaeßige Freistunden eintragen
                          </p>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" strokeWidth={1.5} />
                    </CardContent>
                  </Card>
                  
                  {/* Delete School */}
                  {selectedSchool && (
                    <Card 
                      className="cursor-pointer hover:bg-destructive/10 transition-colors border-destructive/30"
                      onClick={() => {
                        setSchoolToDelete({ id: selectedSchool.id, name: selectedSchool.name });
                        setDeleteSchoolOpen(true);
                      }}
                    >
                      <CardContent className="p-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                            <Trash2 className="w-4 h-4 text-destructive" strokeWidth={1.5} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-destructive">Schule loeschen</p>
                            <p className="text-xs text-muted-foreground">
                              Alle Daten unwiderruflich entfernen
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
              
              {/* School & Class Selection View */}
              {view === 'school' && (
                <div className="space-y-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs -ml-2"
                    onClick={() => setView('main')}
                  >
                    Zurueck
                  </Button>
                  
                  {/* School Selection */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs font-medium">Schule</Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-6 text-xs gap-1"
                        onClick={() => setView('create-school')}
                      >
                        <Plus className="w-3 h-3" strokeWidth={1.5} />
                        Neu
                      </Button>
                    </div>
                    <Select value={selectedSchoolId} onValueChange={handleSchoolChange}>
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Schule waehlen..." />
                      </SelectTrigger>
                      <SelectContent>
                        {schools.map(school => (
                          <SelectItem key={school.id} value={school.id}>
                            {school.short_name ? `${school.short_name} - ${school.name}` : school.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Year Selection */}
                  {selectedSchoolId && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Jahrgang</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs gap-1"
                          onClick={() => setView('create-year')}
                        >
                          <Plus className="w-3 h-3" strokeWidth={1.5} />
                          Neu
                        </Button>
                      </div>
                      <Select value={selectedYearId} onValueChange={handleYearChange}>
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Jahrgang waehlen..." />
                        </SelectTrigger>
                        <SelectContent>
                          {schoolYears.map(year => (
                            <SelectItem key={year.id} value={year.id}>
                              {year.name}{year.year_number ? ` (Kl. ${year.year_number})` : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {schoolYears.length === 0 && (
                        <p className="text-[10px] text-muted-foreground">
                          Kein Jahrgang vorhanden
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Class Selection */}
                  {selectedYearId && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs font-medium">Klasse</Label>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 text-xs gap-1"
                          onClick={() => setView('create-class')}
                        >
                          <Plus className="w-3 h-3" strokeWidth={1.5} />
                          Neu
                        </Button>
                      </div>
                      {classes.length === 0 ? (
                        <p className="text-[10px] text-muted-foreground">
                          Keine Klasse vorhanden
                        </p>
                      ) : (
                        <div className="space-y-1.5 max-h-32 overflow-y-auto">
                          {classes.map(cls => (
                            <Card 
                              key={cls.id} 
                              className={`cursor-pointer transition-all ${
                                selectedClassId === cls.id 
                                  ? 'border-primary bg-primary/5' 
                                  : cls.is_member 
                                    ? 'border-primary/30 hover:bg-accent/50' 
                                    : 'hover:bg-accent/50'
                              }`}
                              onClick={() => cls.is_member && setSelectedClassId(cls.id)}
                            >
                              <CardContent className="p-2 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <div className="w-6 h-6 rounded-md bg-violet-500/10 flex items-center justify-center">
                                    <Users className="w-3 h-3 text-violet-500" strokeWidth={1.5} />
                                  </div>
                                  <span className="text-xs font-medium">{cls.name}</span>
                                  <span className="text-[9px] text-muted-foreground">({cls.member_count})</span>
                                </div>
                                
                                {cls.is_member ? (
                                  selectedClassId === cls.id && (
                                    <Check className="w-4 h-4 text-primary" strokeWidth={1.5} />
                                  )
                                ) : (
                                  <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    className="h-5 text-[9px] px-1.5"
                                    onClick={(e) => { e.stopPropagation(); joinClass(cls.id); }}
                                  >
                                    <UserPlus className="w-3 h-3 mr-0.5" strokeWidth={1.5} />
                                    Beitreten
                                  </Button>
                                )}
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                  
                  <Button onClick={handleSave} className="w-full h-9" disabled={saving}>
                    <Check className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                    {saving ? 'Wird gespeichert...' : 'Speichern'}
                  </Button>
                </div>
              )}
              
              {/* Grade Colors View */}
              {view === 'grades' && (
                <div className="space-y-5">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs -ml-2"
                    onClick={() => setView('main')}
                  >
                    Zurueck
                  </Button>
                  
                  <div className="space-y-3">
                    <Label className="text-xs font-medium">Gruen ab (Punkte)</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[greenMin]}
                        onValueChange={([v]) => setGreenMin(v)}
                        min={1}
                        max={15}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-6 text-center">{greenMin}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-3">
                    <Label className="text-xs font-medium">Gelb ab (Punkte)</Label>
                    <div className="flex items-center gap-3">
                      <Slider
                        value={[yellowMin]}
                        onValueChange={([v]) => setYellowMin(v)}
                        min={1}
                        max={15}
                        step={1}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-6 text-center">{yellowMin}</span>
                    </div>
                  </div>
                  
                  {/* Preview */}
                  <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                    <p className="text-[10px] text-muted-foreground font-medium">Vorschau</p>
                    <div className="flex gap-1.5 flex-wrap">
                      {[15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0].map(p => (
                        <div
                          key={p}
                          className={`w-6 h-6 rounded flex items-center justify-center ${getGradePreviewColor(p)}`}
                        >
                          <span className="text-[9px] text-white font-bold">{p}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <Button onClick={handleSaveGradeColors} className="w-full h-9" disabled={saving}>
                    <Check className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                    {saving ? 'Wird gespeichert...' : 'Speichern'}
                  </Button>
                </div>
              )}
              
              {/* Free Period View */}
              {view === 'freeperiod' && (
                <div className="space-y-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs -ml-2"
                    onClick={() => setView('main')}
                  >
                    Zurueck
                  </Button>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Tag</Label>
                      <Select value={freePeriodDay} onValueChange={setFreePeriodDay}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {DAYS.map((day, i) => (
                            <SelectItem key={i + 1} value={(i + 1).toString()}>{day}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Stunde</Label>
                      <Select value={freePeriodHour} onValueChange={setFreePeriodHour}>
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PERIODS.map(p => (
                            <SelectItem key={p} value={p.toString()}>{p}. Stunde</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="freePeriodDouble"
                      checked={freePeriodDouble}
                      onCheckedChange={(checked) => setFreePeriodDouble(checked as boolean)}
                    />
                    <label htmlFor="freePeriodDouble" className="text-xs">
                      Doppelstunde
                    </label>
                  </div>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Wochenrhythmus</Label>
                    <Select value={freePeriodWeekType} onValueChange={setFreePeriodWeekType}>
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="both">Jede Woche</SelectItem>
                        <SelectItem value="odd">Nur A-Woche</SelectItem>
                        <SelectItem value="even">Nur B-Woche</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button onClick={handleAddFreePeriod} className="w-full h-9" disabled={savingFreePeriod}>
                    <Coffee className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                    {savingFreePeriod ? 'Wird eingetragen...' : 'Freistunde eintragen'}
                  </Button>
                </div>
              )}
              
              {/* Create School View */}
              {view === 'create-school' && (
                <div className="space-y-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs -ml-2"
                    onClick={() => setView('school')}
                  >
                    Zurueck
                  </Button>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input 
                      value={newSchoolName}
                      onChange={(e) => setNewSchoolName(e.target.value)}
                      placeholder="z.B. Max-Planck-Gymnasium"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Kuerzel</Label>
                    <Input 
                      value={newSchoolShortName}
                      onChange={(e) => setNewSchoolShortName(e.target.value)}
                      placeholder="z.B. MPG"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Beschreibung</Label>
                    <Textarea 
                      value={newSchoolDescription}
                      onChange={(e) => setNewSchoolDescription(e.target.value)}
                      placeholder="Optional"
                      rows={2}
                    />
                  </div>
                  <Button 
                    onClick={handleCreateSchool} 
                    className="w-full h-9"
                    disabled={creatingSchool || !newSchoolName.trim()}
                  >
                    <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                    {creatingSchool ? 'Wird erstellt...' : 'Schule erstellen'}
                  </Button>
                </div>
              )}
              
              {/* Create Year View */}
              {view === 'create-year' && (
                <div className="space-y-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs -ml-2"
                    onClick={() => setView('school')}
                  >
                    Zurueck
                  </Button>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input 
                      value={newYearName}
                      onChange={(e) => setNewYearName(e.target.value)}
                      placeholder="z.B. 2024/25"
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Klassenstufe (optional)</Label>
                    <Input 
                      value={newYearNumber}
                      onChange={(e) => setNewYearNumber(e.target.value)}
                      type="number"
                      placeholder="z.B. 11"
                      className="h-9"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateYear} 
                    className="w-full h-9"
                    disabled={creatingYear || !newYearName.trim()}
                  >
                    <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                    {creatingYear ? 'Wird erstellt...' : 'Jahrgang erstellen'}
                  </Button>
                </div>
              )}
              
              {/* Create Class View */}
              {view === 'create-class' && (
                <div className="space-y-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-7 text-xs -ml-2"
                    onClick={() => setView('school')}
                  >
                    Zurueck
                  </Button>
                  
                  <div className="space-y-1.5">
                    <Label className="text-xs">Name</Label>
                    <Input 
                      value={newClassName}
                      onChange={(e) => setNewClassName(e.target.value)}
                      placeholder="z.B. 11a"
                      className="h-9"
                    />
                  </div>
                  <Button 
                    onClick={handleCreateClass} 
                    className="w-full h-9"
                    disabled={creatingClass || !newClassName.trim()}
                  >
                    <Plus className="w-4 h-4 mr-1.5" strokeWidth={1.5} />
                    {creatingClass ? 'Wird erstellt...' : 'Klasse erstellen'}
                  </Button>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {schoolToDelete && (
        <DeleteSchoolDialog
          open={deleteSchoolOpen}
          onOpenChange={setDeleteSchoolOpen}
          schoolId={schoolToDelete.id}
          schoolName={schoolToDelete.name}
          onDeleted={() => {
            setSchoolToDelete(null);
            setSelectedSchoolId('');
            setSelectedYearId('');
            setSelectedClassId('');
            fetchData();
            onSchoolChanged();
          }}
        />
      )}
    </>
  );
}