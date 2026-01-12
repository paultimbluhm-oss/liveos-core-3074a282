import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, BookOpen } from 'lucide-react';
import { toast } from 'sonner';

interface SchoolSubject {
  id: string;
  name: string;
  short_name: string | null;
}

// Standard school subjects for German schools
const DEFAULT_SUBJECTS = [
  { name: 'Mathematik', short_name: 'MA' },
  { name: 'Deutsch', short_name: 'DE' },
  { name: 'Englisch', short_name: 'EN' },
  { name: 'Franzoesisch', short_name: 'FR' },
  { name: 'Latein', short_name: 'LA' },
  { name: 'Spanisch', short_name: 'SP' },
  { name: 'Physik', short_name: 'PH' },
  { name: 'Chemie', short_name: 'CH' },
  { name: 'Biologie', short_name: 'BI' },
  { name: 'Informatik', short_name: 'IF' },
  { name: 'Geschichte', short_name: 'GE' },
  { name: 'Politik', short_name: 'PO' },
  { name: 'Erdkunde', short_name: 'EK' },
  { name: 'Kunst', short_name: 'KU' },
  { name: 'Musik', short_name: 'MU' },
  { name: 'Sport', short_name: 'SP' },
  { name: 'Religion', short_name: 'RE' },
  { name: 'Ethik', short_name: 'ET' },
  { name: 'Philosophie', short_name: 'PL' },
  { name: 'Wirtschaft', short_name: 'WI' },
  { name: 'Paedagogik', short_name: 'PA' },
  { name: 'Sozialwissenschaften', short_name: 'SW' },
];

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolYearId: string;
  schoolId: string;
  classId?: string;
  onCourseCreated: () => void;
}

export function CreateCourseDialog({ 
  open, 
  onOpenChange, 
  schoolYearId, 
  schoolId,
  classId,
  onCourseCreated 
}: CreateCourseDialogProps) {
  const { user } = useAuth();
  const [schoolSubjects, setSchoolSubjects] = useState<SchoolSubject[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [selectedSubject, setSelectedSubject] = useState('');
  const [customName, setCustomName] = useState('');
  const [customShortName, setCustomShortName] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [room, setRoom] = useState('');
  const [isCustom, setIsCustom] = useState(false);

  useEffect(() => {
    if (open && schoolId) {
      fetchSchoolSubjects();
    }
  }, [open, schoolId]);

  const fetchSchoolSubjects = async () => {
    const { data } = await supabase
      .from('school_subjects')
      .select('*')
      .eq('school_id', schoolId)
      .order('name');
    
    if (data && data.length > 0) {
      setSchoolSubjects(data);
    } else {
      // Use default subjects if school has none defined
      setSchoolSubjects([]);
    }
  };

  const handleSubjectChange = (value: string) => {
    if (value === 'custom') {
      setIsCustom(true);
      setSelectedSubject('');
    } else {
      setIsCustom(false);
      setSelectedSubject(value);
      
      // Find subject in school subjects or defaults
      const subject = schoolSubjects.find(s => s.id === value) 
        || DEFAULT_SUBJECTS.find(s => s.name === value);
      if (subject) {
        setCustomName(subject.name);
        setCustomShortName(subject.short_name || '');
      }
    }
  };

  const handleCreate = async () => {
    if (!user || !schoolYearId) return;
    
    const name = isCustom ? customName.trim() : customName;
    const shortName = isCustom ? customShortName.trim() : customShortName;
    
    if (!name) {
      toast.error('Fach erforderlich');
      return;
    }
    
    setLoading(true);
    
    const { data: courseData, error } = await supabase.from('courses').insert({
      school_year_id: schoolYearId,
      class_id: classId || null,
      name: name,
      short_name: shortName || null,
      teacher_name: teacherName.trim() || null,
      room: room.trim() || null,
      created_by: user.id,
    }).select().single();
    
    if (error) {
      toast.error('Fehler beim Erstellen');
      setLoading(false);
      return;
    }
    
    // Auto-join the creator as admin
    await supabase.from('course_members').insert({
      course_id: courseData.id,
      user_id: user.id,
      role: 'admin',
    });
    
    toast.success('Kurs erstellt');
    setLoading(false);
    resetForm();
    onCourseCreated();
    onOpenChange(false);
  };

  const resetForm = () => {
    setSelectedSubject('');
    setCustomName('');
    setCustomShortName('');
    setTeacherName('');
    setRoom('');
    setIsCustom(false);
  };

  const subjectOptions = schoolSubjects.length > 0 
    ? schoolSubjects.map(s => ({ id: s.id, name: s.name, short_name: s.short_name }))
    : DEFAULT_SUBJECTS.map(s => ({ id: s.name, name: s.name, short_name: s.short_name }));

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" strokeWidth={1.5} />
            Kurs erstellen
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3 pt-2">
          <div>
            <Label className="text-xs">Fach</Label>
            <Select 
              value={isCustom ? 'custom' : selectedSubject} 
              onValueChange={handleSubjectChange}
            >
              <SelectTrigger className="h-9 mt-1">
                <SelectValue placeholder="Fach waehlen..." />
              </SelectTrigger>
              <SelectContent>
                {subjectOptions.map(subject => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.short_name ? `${subject.short_name} - ${subject.name}` : subject.name}
                  </SelectItem>
                ))}
                <SelectItem value="custom">+ Eigenes Fach</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {isCustom && (
            <>
              <div>
                <Label className="text-xs">Fachname</Label>
                <Input 
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="z.B. Darstellendes Spiel"
                  className="h-9 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Kuerzel</Label>
                <Input 
                  value={customShortName}
                  onChange={(e) => setCustomShortName(e.target.value)}
                  placeholder="z.B. DS"
                  className="h-9 mt-1"
                />
              </div>
            </>
          )}
          
          <div>
            <Label className="text-xs">Lehrer</Label>
            <Input 
              value={teacherName}
              onChange={(e) => setTeacherName(e.target.value)}
              placeholder="z.B. Herr Mueller"
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
          
          <Button 
            onClick={handleCreate} 
            className="w-full"
            disabled={loading || (!selectedSubject && !customName.trim())}
          >
            <Plus className="w-4 h-4 mr-1" strokeWidth={1.5} />
            {loading ? 'Wird erstellt...' : 'Kurs erstellen'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}