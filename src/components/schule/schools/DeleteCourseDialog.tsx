import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useAdminDelete } from '@/contexts/AdminDeleteContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertTriangle, Trash2, Key } from 'lucide-react';
import { toast } from 'sonner';

interface DeleteCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  courseName: string;
  onDeleted: () => void;
}

export function DeleteCourseDialog({ 
  open, 
  onOpenChange, 
  courseId, 
  courseName, 
  onDeleted 
}: DeleteCourseDialogProps) {
  const { user } = useAuth();
  const { verifyCode, showCode } = useAdminDelete();
  const [inputCode, setInputCode] = useState('');
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState<'code' | 'confirm'>('code');

  const handleVerifyCode = () => {
    if (verifyCode(inputCode)) {
      setStep('confirm');
    } else {
      toast.error('Falscher Code');
    }
  };

  const handleDelete = async () => {
    if (!user || confirmText !== courseName) {
      toast.error('Kursname stimmt nicht ueberein');
      return;
    }

    setDeleting(true);
    try {
      // Delete in order: slots, members, homework, events, grades, then course
      await supabase.from('course_timetable_slots').delete().eq('course_id', courseId);
      await supabase.from('course_members').delete().eq('course_id', courseId);
      await supabase.from('shared_homework').delete().eq('course_id', courseId);
      await supabase.from('shared_events').delete().eq('course_id', courseId);
      await supabase.from('grades').delete().eq('course_id', courseId);
      await supabase.from('timetable_entries').delete().eq('course_id', courseId);
      
      const { error } = await supabase.from('courses').delete().eq('id', courseId);
      
      if (error) {
        toast.error(`Fehler: ${error.message}`);
        return;
      }
      
      toast.success('Kurs unwiderruflich geloescht');
      onDeleted();
      onOpenChange(false);
    } catch (err) {
      console.error('Delete course error:', err);
      toast.error('Fehler beim Loeschen');
    } finally {
      setDeleting(false);
    }
  };

  const resetAndClose = () => {
    setInputCode('');
    setConfirmText('');
    setStep('code');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" strokeWidth={1.5} />
            Kurs loeschen
          </DialogTitle>
          <DialogDescription>
            Diese Aktion ist unwiderruflich. Alle Daten werden geloescht.
          </DialogDescription>
        </DialogHeader>
        
        {step === 'code' ? (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-destructive">
                Gib den Loesch-Code ein, der beim App-Start in der Konsole angezeigt wurde.
              </p>
            </div>
            
            <div>
              <Label className="text-xs">Loesch-Code</Label>
              <Input 
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                placeholder="6-stelliger Code"
                className="h-9 mt-1 font-mono text-center tracking-widest"
                maxLength={6}
              />
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="flex-1 text-xs"
                onClick={showCode}
              >
                <Key className="w-3 h-3 mr-1" strokeWidth={1.5} />
                Code anzeigen
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                className="flex-1 text-xs"
                onClick={handleVerifyCode}
                disabled={inputCode.length !== 6}
              >
                Weiter
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <p className="text-xs text-destructive font-medium">
                Kurs: "{courseName}"
              </p>
              <p className="text-xs text-destructive mt-1">
                Alle Aufgaben, Termine, Noten und Mitgliedschaften werden geloescht.
              </p>
            </div>
            
            <div>
              <Label className="text-xs">Kursname eingeben zur Bestaetigung</Label>
              <Input 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder={courseName}
                className="h-9 mt-1"
              />
            </div>
            
            <Button 
              variant="destructive" 
              className="w-full"
              onClick={handleDelete}
              disabled={deleting || confirmText !== courseName}
            >
              <Trash2 className="w-4 h-4 mr-1" strokeWidth={1.5} />
              {deleting ? 'Wird geloescht...' : 'Unwiderruflich loeschen'}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
