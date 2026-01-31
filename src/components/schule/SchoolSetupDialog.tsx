import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, GraduationCap, Building2, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { SchoolInfo, YearInfo } from '@/hooks/useSchoolScope';

interface SchoolSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schools: SchoolInfo[];
  years: YearInfo[];
  currentSchool: SchoolInfo | null;
  currentYear: YearInfo | null;
  onSchoolChange: (school: SchoolInfo | null) => void;
  onYearChange: (year: YearInfo | null) => void;
  onSchoolCreated: () => void;
  onYearCreated: () => void;
}

export function SchoolSetupDialog({
  open,
  onOpenChange,
  schools,
  years,
  currentSchool,
  currentYear,
  onSchoolChange,
  onYearChange,
  onSchoolCreated,
  onYearCreated,
}: SchoolSetupDialogProps) {
  const { user } = useAuth();
  
  // Create school form
  const [showNewSchool, setShowNewSchool] = useState(false);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [newSchoolShort, setNewSchoolShort] = useState('');
  
  // Create year form
  const [showNewYear, setShowNewYear] = useState(false);
  const [newAbiYear, setNewAbiYear] = useState(new Date().getFullYear() + 2);

  const createSchool = async () => {
    if (!user || !newSchoolName.trim()) return;
    
    const { data, error } = await supabase
      .from('schools')
      .insert({
        name: newSchoolName.trim(),
        short_name: newSchoolShort.trim() || null,
        created_by: user.id,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Fehler beim Erstellen');
      return;
    }
    
    toast.success('Schule erstellt');
    onSchoolCreated();
    onSchoolChange(data);
    setShowNewSchool(false);
    setNewSchoolName('');
    setNewSchoolShort('');
  };

  const createYear = async () => {
    if (!user || !currentSchool) return;
    
    // Erstelle Abitur-Jahrgang
    const { data: yearData, error } = await supabase
      .from('school_years')
      .insert({
        school_id: currentSchool.id,
        name: `Abitur ${newAbiYear}`,
        year_number: newAbiYear,
        created_by: user.id,
      })
      .select()
      .single();
    
    if (error) {
      toast.error('Fehler beim Erstellen');
      return;
    }
    
    // Erstelle automatisch Klassen A-D
    const classInserts = ['A', 'B', 'C', 'D'].map(cls => ({
      school_year_id: yearData.id,
      name: cls,
      created_by: user.id,
    }));
    
    await supabase.from('classes').insert(classInserts);
    
    toast.success('Jahrgang erstellt');
    onYearCreated();
    onYearChange(yearData);
    setShowNewYear(false);
    setNewAbiYear(new Date().getFullYear() + 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" strokeWidth={1.5} />
            Schule einrichten
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 pt-2">
          {/* Schule waehlen */}
          <div className="space-y-2">
            <Label className="text-xs flex items-center gap-1">
              <Building2 className="w-3 h-3" strokeWidth={1.5} />
              Schule
            </Label>
            
            {showNewSchool ? (
              <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                <Input 
                  value={newSchoolName}
                  onChange={(e) => setNewSchoolName(e.target.value)}
                  placeholder="Schulname"
                  className="h-9"
                />
                <Input 
                  value={newSchoolShort}
                  onChange={(e) => setNewSchoolShort(e.target.value.toUpperCase())}
                  placeholder="Kuerzel (z.B. HS)"
                  className="h-9"
                  maxLength={4}
                />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8" onClick={createSchool}>
                    Erstellen
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowNewSchool(false)}>
                    Abbrechen
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select 
                  value={currentSchool?.id || ''} 
                  onValueChange={(id) => {
                    const school = schools.find(s => s.id === id);
                    onSchoolChange(school || null);
                    onYearChange(null); // Jahr zuruecksetzen
                  }}
                >
                  <SelectTrigger className="h-9 flex-1">
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
                <Button 
                  size="icon" 
                  variant="outline" 
                  className="h-9 w-9"
                  onClick={() => setShowNewSchool(true)}
                >
                  <Plus className="w-4 h-4" strokeWidth={1.5} />
                </Button>
              </div>
            )}
          </div>
          
          {/* Abitur-Jahrgang waehlen */}
          {currentSchool && (
            <div className="space-y-2">
              <Label className="text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" strokeWidth={1.5} />
                Abitur-Jahrgang
              </Label>
              
              {showNewYear ? (
                <div className="space-y-2 p-3 rounded-lg bg-muted/50">
                  <Input 
                    type="number"
                    value={newAbiYear}
                    onChange={(e) => setNewAbiYear(parseInt(e.target.value) || new Date().getFullYear())}
                    placeholder="z.B. 2028"
                    className="h-9"
                    min={2020}
                    max={2050}
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Klassen A-D werden automatisch erstellt
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 h-8" onClick={createYear}>
                      Erstellen
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8" onClick={() => setShowNewYear(false)}>
                      Abbrechen
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Select 
                    value={currentYear?.id || ''} 
                    onValueChange={(id) => {
                      const year = years.find(y => y.id === id);
                      onYearChange(year || null);
                    }}
                  >
                    <SelectTrigger className="h-9 flex-1">
                      <SelectValue placeholder="Jahrgang waehlen..." />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map(year => (
                        <SelectItem key={year.id} value={year.id}>
                          {year.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button 
                    size="icon" 
                    variant="outline" 
                    className="h-9 w-9"
                    onClick={() => setShowNewYear(true)}
                  >
                    <Plus className="w-4 h-4" strokeWidth={1.5} />
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Bestaetigen */}
          {currentSchool && currentYear && (
            <Button className="w-full" onClick={() => onOpenChange(false)}>
              Fertig
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
