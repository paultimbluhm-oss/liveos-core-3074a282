import { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Sparkles, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { ActivityCard } from './ActivityCard';
import { AddActivityDialog } from './AddActivityDialog';
import { ActivityDetailView } from './ActivityDetailView';
interface Activity {
  id: string;
  name: string;
  description: string | null;
  category: string | null;
  icon: string;
  is_productive: boolean;
  skills_count?: number;
  completed_skills?: number;
}
interface BoredomSectionProps {
  onBack: () => void;
}
export function BoredomSection({
  onBack
}: BoredomSectionProps) {
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedActivity, setSelectedActivity] = useState<string | null>(null);
  const fetchActivities = async () => {
    if (!user) return;
    const supabase = getSupabase();
    const {
      data,
      error
    } = await supabase.from('boredom_activities').select('*').eq('user_id', user.id).order('created_at', {
      ascending: false
    });
    if (error) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      // Fetch skill counts for each activity
      const activitiesWithCounts = await Promise.all((data || []).map(async activity => {
        const {
          data: skills
        } = await supabase.from('activity_skills').select('completed').eq('activity_id', activity.id);
        return {
          ...activity,
          skills_count: skills?.length || 0,
          completed_skills: skills?.filter(s => s.completed).length || 0
        };
      }));
      setActivities(activitiesWithCounts);
    }
    setLoading(false);
  };
  useEffect(() => {
    fetchActivities();
  }, [user]);
  const handleDelete = async (id: string) => {
    const supabase = getSupabase();
    const {
      error
    } = await supabase.from('boredom_activities').delete().eq('id', id);
    if (error) {
      toast({
        title: 'Fehler',
        description: error.message,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Aktivität gelöscht'
      });
      fetchActivities();
    }
  };
  const totalXP = activities.reduce((sum, a) => sum + (a.total_xp_earned || 0), 0);
  const totalSkills = activities.reduce((sum, a) => sum + (a.completed_skills || 0), 0);
  if (selectedActivity) {
    return <ActivityDetailView activityId={selectedActivity} onBack={() => {
      setSelectedActivity(null);
      fetchActivities();
    }} />;
  }
  return <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="p-3 rounded-xl bg-primary/20">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Langeweile-Killer</h2>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Neues Projekt
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <div className="glass-card p-4 flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-primary" />
          <div>
            <p className="text-2xl font-bold">{activities.length}</p>
            <p className="text-sm text-muted-foreground">Projekte</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3">
          <Trophy className="w-5 h-5 text-yellow-500" />
          <div>
            <p className="text-2xl font-bold">{totalSkills}</p>
            <p className="text-sm text-muted-foreground">Skills gelernt</p>
          </div>
        </div>
        <div className="glass-card p-4 flex items-center gap-3 col-span-2 md:col-span-1">
          <div className="w-5 h-5 rounded-full bg-gradient-to-r from-primary to-accent flex items-center justify-center text-xs font-bold text-primary-foreground">
            XP
          </div>
          <div>
            <p className="text-2xl font-bold">{totalXP}</p>
            <p className="text-sm text-muted-foreground">Gesamt-XP verdient</p>
          </div>
        </div>
      </div>

      {/* Info */}
      

      {loading ? <div className="text-center py-8 text-muted-foreground">Laden...</div> : activities.length === 0 ? <div className="text-center py-12 text-muted-foreground">
          <Sparkles className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>Noch keine Projekte vorhanden</p>
          <p className="text-sm mt-2">Erstelle dein erstes Projekt, z.B. "Zauberwürfel lernen"</p>
        </div> : <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activities.map(activity => <ActivityCard key={activity.id} activity={activity} onClick={() => setSelectedActivity(activity.id)} onDelete={() => handleDelete(activity.id)} />)}
        </div>}

      <AddActivityDialog open={showAddDialog} onOpenChange={setShowAddDialog} onSuccess={() => {
      setShowAddDialog(false);
      fetchActivities();
    }} />
    </div>;
}