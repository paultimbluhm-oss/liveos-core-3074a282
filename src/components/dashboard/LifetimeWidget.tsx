import { useState, useEffect, useMemo } from 'react';
import { Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';
import { motion } from 'framer-motion';

interface TimeEntry {
  id: string;
  category: string;
  minutes: number;
  entry_date: string;
}

interface LifetimeGoal {
  id: string;
  category: string;
  target_minutes: number;
  day_of_week: number | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  schlafen: '#6366f1',
  essen: '#f59e0b',
  familie: '#ec4899',
  freunde: '#8b5cf6',
  hygiene: '#06b6d4',
  youtube: '#ef4444',
  liveos: '#3b82f6',
  optimieren: '#22c55e',
  sport: '#14b8a6',
  lernen: '#a855f7',
  sonstiges: '#64748b',
};

export function LifetimeWidget() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [goals, setGoals] = useState<LifetimeGoal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const today = format(new Date(), 'yyyy-MM-dd');

    const [entriesRes, goalsRes] = await Promise.all([
      supabase.from('time_entries').select('*').eq('user_id', user.id).eq('entry_date', today),
      supabase.from('lifetime_goals').select('*').eq('user_id', user.id),
    ]);

    if (entriesRes.data) setEntries(entriesRes.data);
    if (goalsRes.data) setGoals(goalsRes.data);
    setLoading(false);
  };

  const { categoryStats, totalTracked } = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    const stats: { category: string; minutes: number; target: number; percentage: number; color: string }[] = [];

    const categoriesWithGoals = new Set<string>();
    goals.forEach(g => categoriesWithGoals.add(g.category));

    let total = 0;
    entries.forEach(e => total += e.minutes);

    categoriesWithGoals.forEach(category => {
      const entry = entries.find(e => e.category === category);
      const minutes = entry?.minutes || 0;

      const dayGoal = goals.find(g => g.category === category && g.day_of_week === dayOfWeek);
      const defaultGoal = goals.find(g => g.category === category && g.day_of_week === null);
      const target = dayGoal?.target_minutes || defaultGoal?.target_minutes || 0;

      if (target > 0) {
        stats.push({
          category,
          minutes,
          target,
          percentage: Math.min(100, (minutes / target) * 100),
          color: CATEGORY_COLORS[category] || '#64748b',
        });
      }
    });

    // Sort by percentage (lowest first - needs most attention)
    stats.sort((a, b) => a.percentage - b.percentage);

    return { categoryStats: stats, totalTracked: total };
  }, [entries, goals]);

  const overallProgress = useMemo(() => {
    if (categoryStats.length === 0) return 0;
    const total = categoryStats.reduce((sum, s) => sum + s.percentage, 0);
    return Math.round(total / categoryStats.length);
  }, [categoryStats]);

  const formatTime = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  };

  if (loading || categoryStats.length === 0) {
    return null;
  }

  // Show max 4 categories for compact view
  const displayStats = categoryStats.slice(0, 4);

  return (
    <div className="bg-card rounded-2xl p-3 flex flex-col h-full">
      {/* Header with total time */}
      <div className="flex items-center gap-2 mb-2">
        <Clock className="w-4 h-4 text-muted-foreground" />
        <span className="text-lg font-bold font-mono">{formatTime(totalTracked)}</span>
      </div>

      {/* Overall percentage */}
      <div className="text-2xl font-bold text-primary mb-3">
        {overallProgress}%
      </div>

      {/* Category progress bars */}
      <div className="flex-1 flex flex-col justify-end gap-1.5">
        {displayStats.map((stat) => (
          <motion.div
            key={stat.category}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.5 }}
            className="relative"
          >
            <div className="h-1.5 bg-secondary/40 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: stat.color }}
                initial={{ width: 0 }}
                animate={{ width: `${stat.percentage}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
