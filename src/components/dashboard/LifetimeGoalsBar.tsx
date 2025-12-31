import { useState, useEffect, useMemo } from 'react';
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

const CATEGORY_CONFIG: Record<string, { label: string; color: string }> = {
  schlafen: { label: 'Schlafen', color: '#6366f1' },
  essen: { label: 'Essen', color: '#f59e0b' },
  familie: { label: 'Familie', color: '#ec4899' },
  freunde: { label: 'Freunde', color: '#8b5cf6' },
  hygiene: { label: 'Hygiene', color: '#06b6d4' },
  youtube: { label: 'YouTube', color: '#ef4444' },
  liveos: { label: 'LiveOS', color: '#3b82f6' },
  optimieren: { label: 'Optimieren', color: '#22c55e' },
  sport: { label: 'Sport', color: '#14b8a6' },
  lernen: { label: 'Lernen', color: '#a855f7' },
  sonstiges: { label: 'Sonstiges', color: '#64748b' },
};

export function LifetimeGoalsBar() {
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

  const categoryStats = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    const stats: { category: string; label: string; minutes: number; target: number; percentage: number; color: string }[] = [];

    const categoriesWithGoals = new Set<string>();
    goals.forEach(g => categoriesWithGoals.add(g.category));

    categoriesWithGoals.forEach(category => {
      const entry = entries.find(e => e.category === category);
      const minutes = entry?.minutes || 0;

      const dayGoal = goals.find(g => g.category === category && g.day_of_week === dayOfWeek);
      const defaultGoal = goals.find(g => g.category === category && g.day_of_week === null);
      const target = dayGoal?.target_minutes || defaultGoal?.target_minutes || 0;

      if (target > 0) {
        const config = CATEGORY_CONFIG[category] || { label: category, color: '#64748b' };
        stats.push({
          category,
          label: config.label,
          minutes,
          target,
          percentage: Math.min(100, (minutes / target) * 100),
          color: config.color,
        });
      }
    });

    // Sort by percentage (lowest first)
    stats.sort((a, b) => a.percentage - b.percentage);
    return stats;
  }, [entries, goals]);

  if (loading || categoryStats.length === 0) {
    return null;
  }

  return (
    <div className="bg-card rounded-2xl p-3">
      <div className="flex gap-1.5">
        {categoryStats.map((stat, index) => (
          <div key={stat.category} className="flex-1 min-w-0">
            <div className="h-8 bg-secondary/30 rounded-lg overflow-hidden relative">
              <motion.div
                className="absolute inset-y-0 left-0 rounded-lg"
                style={{ 
                  backgroundColor: stat.color,
                  boxShadow: stat.percentage > 0 ? `0 0 8px ${stat.color}60` : 'none',
                }}
                initial={{ width: 0 }}
                animate={{ width: `${stat.percentage}%` }}
                transition={{ duration: 0.8, delay: index * 0.05, ease: 'easeOut' }}
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-[10px] font-medium text-foreground/80 truncate px-1">
                  {Math.round(stat.percentage)}%
                </span>
              </div>
            </div>
            <p className="text-[9px] text-muted-foreground text-center mt-1 truncate">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
