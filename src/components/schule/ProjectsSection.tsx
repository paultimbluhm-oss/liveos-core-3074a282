import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, FolderKanban, Plus, Trash2, Edit, Calendar, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  title: string;
  description: string | null;
  subject_id: string | null;
  status: string;
  deadline: string | null;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
}

interface ProjectsSectionProps {
  onBack: () => void;
}

export function ProjectsSection({ onBack }: ProjectsSectionProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState<string>('none');
  const [status, setStatus] = useState('open');
  const [deadline, setDeadline] = useState('');

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    const [projectsRes, subjectsRes] = await Promise.all([
      supabase.from('school_projects').select('*').eq('user_id', user!.id).order('created_at', { ascending: false }),
      supabase.from('subjects').select('id, name').eq('user_id', user!.id)
    ]);
    if (projectsRes.data) setProjects(projectsRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
  };

  const saveProject = async () => {
    if (!title.trim()) return;
    const projectData = {
      title, description: description || null, subject_id: subjectId === 'none' ? null : subjectId, status, deadline: deadline || null,
    };

    if (editingProject) {
      const { error } = await supabase.from('school_projects').update(projectData).eq('id', editingProject.id);
      if (!error) { toast.success('Projekt aktualisiert'); fetchData(); }
    } else {
      const { error } = await supabase.from('school_projects').insert({ ...projectData, user_id: user!.id });
      if (!error) { toast.success('Projekt erstellt'); fetchData(); }
    }
    resetForm();
  };

  const deleteProject = async (id: string) => {
    const { error } = await supabase.from('school_projects').delete().eq('id', id);
    if (!error) { toast.success('Projekt gelöscht'); fetchData(); }
  };

  const resetForm = () => {
    setTitle(''); setDescription(''); setSubjectId('none'); setStatus('open'); setDeadline('');
    setEditingProject(null); setDialogOpen(false);
  };

  const openEdit = (project: Project) => {
    setEditingProject(project); setTitle(project.title); setDescription(project.description || '');
    setSubjectId(project.subject_id || 'none'); setStatus(project.status); setDeadline(project.deadline || '');
    setDialogOpen(true);
  };

  const getSubjectName = (subjectId: string | null) => subjectId ? subjects.find(s => s.id === subjectId)?.name : null;
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-500';
      case 'in_progress': return 'bg-amber-500';
      case 'completed': return 'bg-emerald-500';
      default: return 'bg-muted';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) { case 'open': return 'Offen'; case 'in_progress': return 'In Arbeit'; case 'completed': return 'Fertig'; default: return status; }
  };

  const openProjects = projects.filter(p => p.status !== 'completed').length;

  return (
    <div className="space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-8 w-8">
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-2 rounded-xl bg-gradient-to-br from-purple-500 to-violet-600 shadow-lg shrink-0">
              <FolderKanban className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-lg font-bold truncate">Projekte</h2>
            <span className="text-xs text-muted-foreground">({projects.length})</span>
          </div>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) resetForm(); setDialogOpen(open); }}>
          <DialogTrigger asChild>
            <Button size="sm" className="hidden sm:flex gap-1 h-8 text-xs">
              <Plus className="w-3.5 h-3.5" />
              Neu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>{editingProject ? 'Projekt bearbeiten' : 'Neues Projekt'}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div><Label>Titel</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Projektname" /></div>
              <div><Label>Beschreibung</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Was ist zu tun?" rows={2} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Fach</Label>
                  <Select value={subjectId} onValueChange={setSubjectId}>
                    <SelectTrigger><SelectValue placeholder="Fach" /></SelectTrigger>
                    <SelectContent><SelectItem value="none">Keins</SelectItem>{subjects.map(s => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div><Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="open">Offen</SelectItem><SelectItem value="in_progress">In Arbeit</SelectItem><SelectItem value="completed">Fertig</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Deadline</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
              <Button onClick={saveProject} className="w-full">{editingProject ? 'Speichern' : 'Erstellen'}</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Compact Stats */}
      {projects.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span>{openProjects} offen</span>
          <span>{projects.filter(p => p.status === 'completed').length} abgeschlossen</span>
        </div>
      )}

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <FolderKanban className="w-10 h-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">Keine Projekte</p>
        </div>
      ) : (
        <div className="space-y-2">
          {projects.map((project) => (
            <div 
              key={project.id} 
              className="relative flex items-center gap-3 p-3 rounded-lg bg-card/80 border border-border/50 hover:border-primary/50 transition-all group"
            >
              {/* Status bar */}
              <div className={cn("absolute left-0 top-0 bottom-0 w-1 rounded-l-lg", getStatusColor(project.status))} />
              
              <div className="flex-1 min-w-0 ml-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-sm truncate">{project.title}</h3>
                  <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full", 
                    project.status === 'open' ? 'bg-blue-500/20 text-blue-500' :
                    project.status === 'in_progress' ? 'bg-amber-500/20 text-amber-500' :
                    'bg-emerald-500/20 text-emerald-500'
                  )}>
                    {getStatusLabel(project.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  {getSubjectName(project.subject_id) && <span>{getSubjectName(project.subject_id)}</span>}
                  {project.deadline && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(project.deadline), 'dd.MM.yy', { locale: de })}
                    </span>
                  )}
                </div>
              </div>
              
              <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(project)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteProject(project.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <Button 
        className="fixed bottom-20 right-4 sm:hidden h-12 w-12 rounded-full shadow-lg z-40"
        onClick={() => setDialogOpen(true)}
      >
        <Plus className="w-5 h-5" />
      </Button>
    </div>
  );
}
