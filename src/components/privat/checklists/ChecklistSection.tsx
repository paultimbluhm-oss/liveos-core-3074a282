import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, ListChecks, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ChecklistCard } from './ChecklistCard';
import { AddChecklistDialog } from './AddChecklistDialog';
import { ChecklistDetailView } from './ChecklistDetailView';

interface Checklist {
  id: string;
  name: string;
  created_at: string;
  items_count?: number;
  completed_count?: number;
}

interface ChecklistSectionProps {
  onBack: () => void;
}

export function ChecklistSection({ onBack }: ChecklistSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedChecklist, setSelectedChecklist] = useState<string | null>(null);

  const fetchChecklists = async () => {
    if (!user) return;
    const supabase = getSupabase();
    
    const { data, error } = await supabase
      .from('checklists')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      toast({ title: 'Fehler beim Laden', description: error.message, variant: 'destructive' });
    } else {
      const checklistsWithCounts = await Promise.all(
        (data || []).map(async (checklist) => {
          const { data: items } = await supabase
            .from('checklist_items')
            .select('completed')
            .eq('checklist_id', checklist.id);
          
          return {
            ...checklist,
            items_count: items?.length || 0,
            completed_count: items?.filter(i => i.completed).length || 0,
          };
        })
      );
      setChecklists(checklistsWithCounts);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChecklists();
  }, [user]);

  const handleDelete = async (id: string) => {
    const supabase = getSupabase();
    await supabase.from('checklist_items').delete().eq('checklist_id', id);
    await supabase.from('checklist_sections').delete().eq('checklist_id', id);
    const { error } = await supabase.from('checklists').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Fehler beim Löschen', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Checkliste gelöscht' });
      fetchChecklists();
    }
  };

  if (selectedChecklist) {
    return (
      <ChecklistDetailView
        checklistId={selectedChecklist}
        onBack={() => {
          setSelectedChecklist(null);
          fetchChecklists();
        }}
      />
    );
  }

  const totalItems = checklists.reduce((sum, c) => sum + (c.items_count || 0), 0);
  const completedItems = checklists.reduce((sum, c) => sum + (c.completed_count || 0), 0);
  const overallProgress = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack} className="shrink-0 h-9 w-9">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg font-bold">Checklisten</h2>
        </div>
        <Button 
          size="sm" 
          onClick={() => setShowAddDialog(true)}
          className="hidden sm:flex gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Neue Liste
        </Button>
      </div>

      {/* Summary Stats */}
      {checklists.length > 0 && (
        <div className="flex items-center gap-4 p-3 rounded-xl bg-muted/30 border border-border/50">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <ListChecks className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{checklists.length}</p>
              <p className="text-xs text-muted-foreground">Listen</p>
            </div>
          </div>
          <div className="h-8 w-px bg-border" />
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{completedItems}<span className="text-sm font-normal text-muted-foreground">/{totalItems}</span></p>
              <p className="text-xs text-muted-foreground">{overallProgress}% erledigt</p>
            </div>
          </div>
        </div>
      )}

      {/* Checklists List */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : checklists.length === 0 ? (
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted/50 flex items-center justify-center">
            <ListChecks className="w-8 h-8 text-muted-foreground" />
          </div>
          <p className="text-muted-foreground mb-4">Noch keine Checklisten</p>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Erste Checkliste erstellen
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {checklists.map((checklist) => (
            <ChecklistCard
              key={checklist.id}
              checklist={checklist}
              onClick={() => setSelectedChecklist(checklist.id)}
              onDelete={() => handleDelete(checklist.id)}
            />
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <Button 
        className="fixed bottom-20 right-4 sm:hidden h-14 w-14 rounded-full shadow-lg z-40"
        onClick={() => setShowAddDialog(true)}
      >
        <Plus className="w-6 h-6" />
      </Button>

      <AddChecklistDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onSuccess={() => {
          setShowAddDialog(false);
          fetchChecklists();
        }}
      />
    </div>
  );
}
