import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Wrench, Trash2, Pencil, Lightbulb, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';

interface Optimization {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface OptimizationsSectionProps {
  onBack: () => void;
}

const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  idea: { label: 'Idee', color: 'bg-blue-500/20 text-blue-500', icon: Lightbulb },
  in_progress: { label: 'In Bearbeitung', color: 'bg-yellow-500/20 text-yellow-600', icon: Clock },
  done: { label: 'Erledigt', color: 'bg-green-500/20 text-green-600', icon: CheckCircle2 },
  cancelled: { label: 'Abgebrochen', color: 'bg-destructive/20 text-destructive', icon: XCircle },
};

const locationSuggestions = [
  'Zuhause',
  'Arbeit',
  'Auto',
  'Fahrrad',
  'MacBook',
  'Handy',
  'Software',
  'Zimmerer',
  'Werkstatt',
  'Garten',
  'Küche',
  'Büro',
];

export function OptimizationsSection({ onBack }: OptimizationsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [optimizations, setOptimizations] = useState<Optimization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingOptimization, setEditingOptimization] = useState<Optimization | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [status, setStatus] = useState('idea');
  const [saving, setSaving] = useState(false);

  const fetchOptimizations = async () => {
    if (!user) return;
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('optimizations')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false });

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      setOptimizations(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchOptimizations();
  }, [user]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLocation('');
    setStatus('idea');
    setEditingOptimization(null);
  };

  const openEditDialog = (opt: Optimization) => {
    setTitle(opt.title);
    setDescription(opt.description || '');
    setLocation(opt.location || '');
    setStatus(opt.status);
    setEditingOptimization(opt);
    setShowAddDialog(true);
  };

  const handleSave = async () => {
    if (!user || !title.trim()) return;
    setSaving(true);
    const supabase = getSupabase();

    if (editingOptimization) {
      const { error } = await supabase
        .from('optimizations')
        .update({
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          status,
        })
        .eq('id', editingOptimization.id);

      if (error) {
        toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Optimierung aktualisiert' });
        setShowAddDialog(false);
        resetForm();
        fetchOptimizations();
      }
    } else {
      const { error } = await supabase
        .from('optimizations')
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          location: location.trim() || null,
          status,
        });

      if (error) {
        toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
      } else {
        toast({ title: 'Optimierung hinzugefügt' });
        setShowAddDialog(false);
        resetForm();
        fetchOptimizations();
      }
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('optimizations')
      .delete()
      .eq('id', id);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Optimierung gelöscht' });
      fetchOptimizations();
    }
  };

  const updateStatus = async (id: string, newStatus: string) => {
    const supabase = getSupabase();
    const { error } = await supabase
      .from('optimizations')
      .update({ status: newStatus })
      .eq('id', id);

    if (error) {
      toast({ title: 'Fehler', description: error.message, variant: 'destructive' });
    } else {
      fetchOptimizations();
    }
  };

  const filteredOptimizations = optimizations.filter(opt => 
    filterStatus === 'all' || opt.status === filterStatus
  );

  const statusCounts = {
    all: optimizations.length,
    idea: optimizations.filter(o => o.status === 'idea').length,
    in_progress: optimizations.filter(o => o.status === 'in_progress').length,
    done: optimizations.filter(o => o.status === 'done').length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="p-3 rounded-xl bg-orange-500/20">
            <Wrench className="w-6 h-6 text-orange-500" />
          </div>
          <h2 className="text-2xl font-bold">Optimierungen</h2>
        </div>
        <Button onClick={() => { resetForm(); setShowAddDialog(true); }}>
          <Plus className="w-4 h-4 mr-2" />
          Neue Optimierung
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          onClick={() => setFilterStatus('all')}
          className={`glass-card p-4 text-left transition-colors ${filterStatus === 'all' ? 'ring-2 ring-primary' : ''}`}
        >
          <p className="text-2xl font-bold">{statusCounts.all}</p>
          <p className="text-sm text-muted-foreground">Gesamt</p>
        </button>
        <button
          onClick={() => setFilterStatus('idea')}
          className={`glass-card p-4 text-left transition-colors ${filterStatus === 'idea' ? 'ring-2 ring-primary' : ''}`}
        >
          <p className="text-2xl font-bold text-blue-500">{statusCounts.idea}</p>
          <p className="text-sm text-muted-foreground">Ideen</p>
        </button>
        <button
          onClick={() => setFilterStatus('in_progress')}
          className={`glass-card p-4 text-left transition-colors ${filterStatus === 'in_progress' ? 'ring-2 ring-primary' : ''}`}
        >
          <p className="text-2xl font-bold text-yellow-500">{statusCounts.in_progress}</p>
          <p className="text-sm text-muted-foreground">In Bearbeitung</p>
        </button>
        <button
          onClick={() => setFilterStatus('done')}
          className={`glass-card p-4 text-left transition-colors ${filterStatus === 'done' ? 'ring-2 ring-primary' : ''}`}
        >
          <p className="text-2xl font-bold text-green-500">{statusCounts.done}</p>
          <p className="text-sm text-muted-foreground">Erledigt</p>
        </button>
      </div>

      {/* Optimizations List */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Laden...</div>
      ) : filteredOptimizations.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Wrench className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>{filterStatus !== 'all' ? 'Keine Einträge in dieser Kategorie' : 'Noch keine Optimierungen angelegt'}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredOptimizations.map((opt) => {
            const statusInfo = statusConfig[opt.status] || statusConfig.idea;
            const StatusIcon = statusInfo.icon;
            
            return (
              <div key={opt.id} className="glass-card p-4 group">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <span className="font-semibold">{opt.title}</span>
                      <Badge variant="outline" className={statusInfo.color}>
                        <StatusIcon className="w-3 h-3 mr-1" />
                        {statusInfo.label}
                      </Badge>
                      {opt.location && (
                        <Badge variant="outline" className="bg-muted">
                          {opt.location}
                        </Badge>
                      )}
                    </div>
                    {opt.description && (
                      <p className="text-sm text-muted-foreground mb-2">{opt.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground">
                      Aktualisiert: {format(parseISO(opt.updated_at), 'dd.MM.yyyy', { locale: de })}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Select value={opt.status} onValueChange={(value) => updateStatus(opt.id, value)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="idea">Idee</SelectItem>
                        <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                        <SelectItem value="done">Erledigt</SelectItem>
                        <SelectItem value="cancelled">Abgebrochen</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditDialog(opt)}>
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleDelete(opt.id)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={(open) => { setShowAddDialog(open); if (!open) resetForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingOptimization ? 'Optimierung bearbeiten' : 'Neue Optimierung'}</DialogTitle>
            <DialogDescription>
              Halte Probleme und Verbesserungsideen fest.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Titel / Problem</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Fahrradkette quietscht"
              />
            </div>
            <div className="space-y-2">
              <Label>Beschreibung (optional)</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Genauere Beschreibung des Problems oder der Idee..."
              />
            </div>
            <div className="space-y-2">
              <Label>Ort / Bereich</Label>
              <Input
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="z.B. Fahrrad, MacBook, Küche..."
                list="location-suggestions"
              />
              <datalist id="location-suggestions">
                {locationSuggestions.map((loc) => (
                  <option key={loc} value={loc} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idee</SelectItem>
                  <SelectItem value="in_progress">In Bearbeitung</SelectItem>
                  <SelectItem value="done">Erledigt</SelectItem>
                  <SelectItem value="cancelled">Abgebrochen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowAddDialog(false); resetForm(); }}>
                Abbrechen
              </Button>
              <Button onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? 'Speichern...' : 'Speichern'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
