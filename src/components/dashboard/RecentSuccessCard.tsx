import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Award, CheckCircle2, Star, Zap } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { de } from 'date-fns/locale';
import { motion } from 'framer-motion';

interface SuccessItem {
  id: string;
  type: 'task' | 'homework' | 'grade' | 'achievement';
  title: string;
  timestamp: Date;
  xp?: number;
}

export function RecentSuccessCard() {
  const { user } = useAuth();
  const [successes, setSuccesses] = useState<SuccessItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchRecentSuccesses();
    }
  }, [user]);

  const fetchRecentSuccesses = async () => {
    if (!user) return;

    const [tasksRes, homeworkRes, gradesRes, achievementsRes] = await Promise.all([
      supabase
        .from('tasks')
        .select('id, title, created_at, xp_reward')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('homework')
        .select('id, title, created_at, xp_reward')
        .eq('user_id', user.id)
        .eq('completed', true)
        .order('created_at', { ascending: false })
        .limit(5),
      supabase
        .from('grades')
        .select('id, description, created_at, points')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(3),
      supabase
        .from('achievements')
        .select('id, achievement_type, unlocked_at')
        .eq('user_id', user.id)
        .order('unlocked_at', { ascending: false })
        .limit(3),
    ]);

    const allSuccesses: SuccessItem[] = [
      ...(tasksRes.data || []).map(t => ({
        id: t.id,
        type: 'task' as const,
        title: t.title,
        timestamp: new Date(t.created_at!),
        xp: t.xp_reward || 10,
      })),
      ...(homeworkRes.data || []).map(h => ({
        id: h.id,
        type: 'homework' as const,
        title: h.title,
        timestamp: new Date(h.created_at!),
        xp: h.xp_reward || 15,
      })),
      ...(gradesRes.data || []).map(g => ({
        id: g.id,
        type: 'grade' as const,
        title: `Note: ${g.points} Punkte${g.description ? ` - ${g.description}` : ''}`,
        timestamp: new Date(g.created_at!),
        xp: g.points >= 13 ? 50 : g.points >= 10 ? 30 : 15,
      })),
      ...(achievementsRes.data || []).map(a => ({
        id: a.id,
        type: 'achievement' as const,
        title: getAchievementName(a.achievement_type),
        timestamp: new Date(a.unlocked_at!),
        xp: 100,
      })),
    ];

    // Sort by timestamp and take top 5
    allSuccesses.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    setSuccesses(allSuccesses.slice(0, 5));
    setLoading(false);
  };

  const getAchievementName = (type: string): string => {
    const names: Record<string, string> = {
      first_task: 'Erste Aufgabe',
      streak_7: '7-Tage-Streak',
      streak_30: '30-Tage-Streak',
      level_5: 'Level 5 erreicht',
      level_10: 'Level 10 erreicht',
      xp_1000: '1000 XP gesammelt',
      early_bird: 'Frühaufsteher',
    };
    return names[type] || type;
  };

  const getIcon = (type: SuccessItem['type']) => {
    switch (type) {
      case 'task': return CheckCircle2;
      case 'homework': return Star;
      case 'grade': return Award;
      case 'achievement': return Award;
    }
  };

  const getIconColor = (type: SuccessItem['type']) => {
    switch (type) {
      case 'task': return 'text-success bg-success/20';
      case 'homework': return 'text-accent bg-accent/20';
      case 'grade': return 'text-level bg-level/20';
      case 'achievement': return 'text-primary bg-primary/20';
    }
  };

  return (
    <div className="glass-card p-4 md:p-5">
      <div className="flex items-center gap-2 mb-4">
        <Star className="w-5 h-5 text-level" />
        <h3 className="font-semibold text-base">Letzte Erfolge</h3>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-12 bg-secondary/50 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : successes.length === 0 ? (
        <div className="text-center py-6">
          <Zap className="w-10 h-10 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Noch keine Erfolge</p>
          <p className="text-xs text-muted-foreground/60">Schließe Aufgaben ab!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {successes.map((success, i) => {
            const Icon = getIcon(success.type);
            const colorClasses = getIconColor(success.type);

            return (
              <motion.div
                key={success.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-secondary/30 transition-colors"
              >
                <div className={`p-2 rounded-lg ${colorClasses}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{success.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(success.timestamp, { addSuffix: true, locale: de })}
                  </p>
                </div>
                {success.xp && (
                  <span className="text-xs font-mono text-[hsl(var(--xp))] shrink-0">+{success.xp} XP</span>
                )}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
