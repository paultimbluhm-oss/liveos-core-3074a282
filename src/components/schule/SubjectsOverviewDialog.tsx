import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { BookOpen, Edit2, Trash2, GraduationCap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  short_name: string | null;
  teacher_short: string | null;
  room: string | null;
  grade_year: number;
  written_weight: number;
  oral_weight: number;
}

interface SubjectsOverviewDialogProps {
  subjects: Subject[];
  onSubjectEdit: (subject: Subject) => void;
  onSubjectsChanged: () => void;
}

export function SubjectsOverviewDialog({ subjects, onSubjectEdit, onSubjectsChanged }: SubjectsOverviewDialogProps) {
  const [open, setOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!deleteId) return;
    
    setDeleting(true);
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', deleteId);

    if (error) {
      toast.error('Fehler beim Löschen. Möglicherweise wird das Fach noch verwendet.');
      console.error(error);
    } else {
      toast.success('Fach gelöscht');
      onSubjectsChanged();
    }
    setDeleting(false);
    setDeleteId(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Alle Fächer</span>
            <span className="sm:hidden">Fächer</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              Alle Fächer ({subjects.length})
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {subjects.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Noch keine Fächer vorhanden</p>
              </div>
            ) : (
              subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{subject.name}</span>
                      {subject.short_name && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          {subject.short_name}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {subject.teacher_short && (
                        <span>Lehrer: {subject.teacher_short}</span>
                      )}
                      {subject.room && (
                        <span>Raum: {subject.room}</span>
                      )}
                      <span>Klasse {subject.grade_year}</span>
                      <span>S:{subject.written_weight}% / M:{subject.oral_weight}%</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        onSubjectEdit(subject);
                        setOpen(false);
                      }}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(subject.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Fach löschen?</AlertDialogTitle>
            <AlertDialogDescription>
              Möchtest du dieses Fach wirklich löschen? Alle zugehörigen Noten, Hausaufgaben und Stundenplan-Einträge werden ebenfalls gelöscht. Diese Aktion kann nicht rückgängig gemacht werden.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Abbrechen</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleting}
            >
              {deleting ? 'Wird gelöscht...' : 'Löschen'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
