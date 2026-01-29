import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminDelete } from '@/contexts/AdminDeleteContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteSchoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  schoolName: string;
  onDeleted: () => void;
}

export function DeleteSchoolDialog({ 
  open, 
  onOpenChange, 
  schoolId, 
  schoolName, 
  onDeleted 
}: DeleteSchoolDialogProps) {
  const { user } = useAuth();
  const { verifyCode } = useAdminDelete();
  const [inputCode, setInputCode] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState<'code' | 'confirm'>('code');
  const [progress, setProgress] = useState('');

  const handleVerifyCode = () => {
    if (verifyCode(inputCode)) {
      setStep('confirm');
    } else {
      toast.error('Falscher Code');
    }
  };

  const handleDelete = async () => {
    if (!user || confirmText !== schoolName) {
      toast.error('Schulname stimmt nicht ueberein');
      return;
    }

    setDeleting(true);
    try {
      // Get all school years
      setProgress('Lade Jahrg\u00e4nge...');
      const { data: years } = await supabase
        .from('school_years')
        .select('id')
        .eq('school_id', schoolId);
      
      if (years && years.length > 0) {
        const yearIds = years.map(y => y.id);
        
        // Get all classes in these years
        setProgress('Lade Klassen...');
        const { data: classes } = await supabase
          .from('classes')
          .select('id')
          .in('school_year_id', yearIds);
        
        if (classes && classes.length > 0) {
          const classIds = classes.map(c => c.id);
          
          // Delete class members
          setProgress('Loesche Klassenmitglieder...');
          await supabase.from('class_members').delete().in('class_id', classIds);
          
          // Delete classes
          setProgress('Loesche Klassen...');
          await supabase.from('classes').delete().in('id', classIds);
        }
        
        // Get all courses in these years
        setProgress('Lade Kurse...');
        const { data: courses } = await supabase
          .from('courses')
          .select('id')
          .in('school_year_id', yearIds);
        
        if (courses && courses.length > 0) {
          const courseIds = courses.map(c => c.id);
          
          // Delete course-related data
          setProgress('Loesche Kursdaten...');
          await supabase.from('course_timetable_slots').delete().in('course_id', courseIds);
          await supabase.from('course_members').delete().in('course_id', courseIds);
          await supabase.from('shared_homework').delete().in('course_id', courseIds);
          await supabase.from('shared_events').delete().in('course_id', courseIds);
          await supabase.from('grades').delete().in('course_id', courseIds);
          await supabase.from('timetable_entries').delete().in('course_id', courseIds);
          
          // Delete courses
          setProgress('Loesche Kurse...');
          await supabase.from('courses').delete().in('id', courseIds);
        }
        
        // Delete school years
        setProgress('Loesche Jahrg\u00e4nge...');
        await supabase.from('school_years').delete().in('id', yearIds);
      }
      
      // Delete school subjects
      setProgress('Loesche Faecher...');
      await supabase.from('school_subjects').delete().eq('school_id', schoolId);
      
      // Clear profile references
      setProgress('Aktualisiere Profile...');
      await supabase
        .from('profiles')
        .update({ 
          selected_school_id: null, 
          selected_school_year_id: null, 
          selected_class_id: null 
        })
        .eq('selected_school_id', schoolId);
      
      // Delete school
      setProgress('Loesche Schule...');
      const { error } = await supabase.from('schools').delete().eq('id', schoolId);
      
      if (error) {
        toast.error(`Fehler: ${error.message}`);
        return;
      }
      
      toast.success('Schule und alle Daten unwiderruflich geloescht');
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      console.error('Delete school error:', err);
      toast.error('Fehler beim Loeschen');
    } finally {
      setDeleting(false);
      setProgress('');
    }
  };

  const resetAndClose = () => {
    setInputCode('');
    setConfirmText('');
    setStep('code');
    setProgress('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" strokeWidth={1.5} />
            Schule loeschen
          </DialogTitle>
          <DialogDescription>
            Diese Aktion ist unwiderruflich. ALLE Daten werden geloescht.
          </DialogDescription>
        </DialogHeader>
        
        {step === 'code' ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-destructive font-medium mb-1">
                Warnung: Komplettloeschung
              </p>
              <p className="text-[10px] text-destructive/80">
                Dies loescht die Schule und alle zugehoerigen Daten unwiderruflich.
              </p>
            </div>
            
            <div>
              <Label className="text-xs">Admin-Code</Label>
              <Input 
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="6-stelliger Code"
                className="h-9 mt-1 font-mono text-center tracking-widest"
                maxLength={6}
              />
            </div>
            
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleVerifyCode}
              disabled={inputCode.length !== 6}
            >
              Weiter
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-destructive font-medium">
                Schule: "{schoolName}"
              </p>
              <p className="text-[10px] text-destructive/80 mt-1">
                Alle Jahrgaenge, Klassen, Kurse, Aufgaben, Termine, Noten und Mitgliedschaften werden unwiderruflich geloescht.
              </p>
            </div>
            
            <div>
              <Label className="text-xs">Schulname eingeben zur Bestaetigung</Label>
              <Input 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={schoolName}
                className="h-9 mt-1"
              />
            </div>
            
            {progress && (
              <p className="text-xs text-muted-foreground text-center animate-pulse">
                {progress}
              </p>
            )}
            
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleDelete}
              disabled={deleting || confirmText !== schoolName}
            >
              <Trash2 className="w-4 h-4 mr-1" strokeWidth={1.5} />
              {deleting ? 'Wird geloescht...' : 'Alles unwiderruflich loeschen'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
