import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Plus, Building2, GraduationCap, Users, Check, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { School, SchoolYear, Class } from './types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';

interface SchoolSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSchoolChanged: () => void;
}

export function SchoolSettingsDialog({ open, onOpenChange, onSchoolChanged }: SchoolSettingsDialogProps) {
  const { user } = useAuth();
  const [schools, setSchools] = useState<School[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [selectedSchoolId, setSelectedSchoolId] = useState<string>('');
  const [selectedYearId, setSelectedYearId] = useState<string>('');
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
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

  const fetchData = async () => {
    if (!user) return;
    
    const [schoolsRes, profileRes] = await Promise.all([
      supabase.from('schools').select('*').order('name'),
      supabase.from('profiles').select('selected_school_id, selected_school_year_id, selected_class_id').eq('user_id', user.id).single(),
    ]);
    
    if (schoolsRes.data) setSchools(schoolsRes.data);
    
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
    if (open) fetchData();
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
      toast.success('Einstellungen gespeichert');
      onSchoolChanged();
      onOpenChange(false);
    }
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
        // Auto-join the class
        await supabase.from('class_members').insert({
          class_id: data.id,
          user_id: user.id,
          role: 'admin',
        });
        setSelectedClassId(data.id);
        await fetchClasses(selectedYearId);
      }
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

  const leaveClass = async (classId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('class_members')
      .delete()
      .eq('class_id', classId)
      .eq('user_id', user.id);
    
    if (!error) {
      toast.success('Klasse verlassen');
      if (selectedClassId === classId) setSelectedClassId('');
      await fetchClasses(selectedYearId);
    }
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-4 h-4" strokeWidth={1.5} />
            Schuleinstellungen
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="select" className="mt-2">
          <TabsList className="grid w-full grid-cols-2 h-8">
            <TabsTrigger value="select" className="text-xs">Auswahl</TabsTrigger>
            <TabsTrigger value="create" className="text-xs">Erstellen</TabsTrigger>
          </TabsList>
          
          <TabsContent value="select" className="space-y-4 mt-4">
            {/* School Selection */}
            <div>
              <Label className="text-xs">Schule</Label>
              <Select value={selectedSchoolId} onValueChange={handleSchoolChange}>
                <SelectTrigger className="h-9 mt-1">
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
              <div>
                <Label className="text-xs">Jahrgang</Label>
                <Select value={selectedYearId} onValueChange={handleYearChange}>
                  <SelectTrigger className="h-9 mt-1">
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
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Kein Jahrgang vorhanden. Erstelle einen im Tab "Erstellen".
                  </p>
                )}
              </div>
            )}
            
            {/* Class Selection */}
            {selectedYearId && (
              <div>
                <Label className="text-xs mb-2 block">Klasse</Label>
                {classes.length === 0 ? (
                  <p className="text-[10px] text-muted-foreground">
                    Keine Klasse vorhanden. Erstelle eine im Tab "Erstellen".
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {classes.map(cls => (
                      <Card 
                        key={cls.id} 
                        className={`transition-colors cursor-pointer ${
                          selectedClassId === cls.id ? 'border-primary bg-primary/5' : ''
                        } ${cls.is_member ? 'border-primary/30' : ''}`}
                        onClick={() => cls.is_member && setSelectedClassId(cls.id)}
                      >
                        <CardContent className="p-2.5 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg border-2 border-violet-500 flex items-center justify-center">
                              <Users className="w-3 h-3 text-violet-500" strokeWidth={1.5} />
                            </div>
                            <div>
                              <p className="text-xs font-medium">{cls.name}</p>
                              <p className="text-[9px] text-muted-foreground">{cls.member_count} Mitglieder</p>
                            </div>
                          </div>
                          
                          {cls.is_member ? (
                            <div className="flex items-center gap-1">
                              {selectedClassId === cls.id && (
                                <Check className="w-4 h-4 text-primary" strokeWidth={1.5} />
                              )}
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="h-6 text-[9px] px-1.5"
                                onClick={(e) => { e.stopPropagation(); leaveClass(cls.id); }}
                              >
                                Verlassen
                              </Button>
                            </div>
                          ) : (
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-6 text-[9px] gap-1 px-2"
                              onClick={(e) => { e.stopPropagation(); joinClass(cls.id); }}
                            >
                              <UserPlus className="w-3 h-3" strokeWidth={1.5} />
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
            
            <Button onClick={handleSave} className="w-full" disabled={saving}>
              <Check className="w-4 h-4 mr-1" strokeWidth={1.5} />
              {saving ? 'Wird gespeichert...' : 'Speichern'}
            </Button>
          </TabsContent>
          
          <TabsContent value="create" className="space-y-4 mt-4">
            {/* Create School */}
            <div className="p-3 rounded-lg border border-border/50 space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Building2 className="w-4 h-4" strokeWidth={1.5} />
                Neue Schule
              </div>
              <div>
                <Label className="text-xs">Name</Label>
                <Input 
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="z.B. Max-Planck-Gymnasium"
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Kuerzel</Label>
                <Input 
                  value={newSchoolShortName}
                  onChange={(e) => setNewSchoolShortName(e.target.value)}
                  placeholder="z.B. MPG"
                  className="h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Beschreibung</Label>
                <Textarea 
                  value={newSchoolDescription}
                  onChange={(e) => setNewSchoolDescription(e.target.value)}
                  placeholder="Optional"
                  rows={2}
                  className="mt-1"
                />
              </div>
              <Button 
                onClick={handleCreateSchool} 
                variant="outline" 
                className="w-full h-8 text-xs"
                disabled={creatingSchool || !newSchoolName.trim()}
              >
                <Plus className="w-3 h-3 mr-1" strokeWidth={1.5} />
                {creatingSchool ? 'Wird erstellt...' : 'Schule erstellen'}
              </Button>
            </div>
            
            {/* Create Year */}
            {selectedSchoolId && (
              <div className="p-3 rounded-lg border border-border/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <GraduationCap className="w-4 h-4" strokeWidth={1.5} />
                  Neuer Jahrgang
                </div>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input 
                    value={newYearName}
                    onChange={(e) => setNewYearName(e.target.value)}
                    placeholder="z.B. Abitur 2026"
                    className="h-8 mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs">Klassenstufe</Label>
                  <Input 
                    type="number"
                    value={newYearNumber}
                    onChange={(e) => setNewYearNumber(e.target.value)}
                    placeholder="z.B. 12"
                    className="h-8 mt-1"
                  />
                </div>
                <Button 
                  onClick={handleCreateYear} 
                  variant="outline" 
                  className="w-full h-8 text-xs"
                  disabled={creatingYear || !newYearName.trim()}
                >
                  <Plus className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  {creatingYear ? 'Wird erstellt...' : 'Jahrgang erstellen'}
                </Button>
              </div>
            )}
            
            {/* Create Class */}
            {selectedYearId && (
              <div className="p-3 rounded-lg border border-border/50 space-y-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Users className="w-4 h-4" strokeWidth={1.5} />
                  Neue Klasse
                </div>
                <div>
                  <Label className="text-xs">Name</Label>
                  <Input 
                    value={newClassName}
                    onChange={(e) => setNewClassName(e.target.value)}
                    placeholder="z.B. 12a oder Leistungskurs Mathe"
                    className="h-8 mt-1"
                  />
                </div>
                <Button 
                  onClick={handleCreateClass} 
                  variant="outline" 
                  className="w-full h-8 text-xs"
                  disabled={creatingClass || !newClassName.trim()}
                >
                  <Plus className="w-3 h-3 mr-1" strokeWidth={1.5} />
                  {creatingClass ? 'Wird erstellt...' : 'Klasse erstellen'}
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
