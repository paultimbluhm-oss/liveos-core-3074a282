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

  const categoryStats = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    const stats: { category: string; minutes: number; target: number; percentage: number; color: string }[] = [];

    // Get all categories that have goals
    const categoriesWithGoals = new Set<string>();
    goals.forEach(g => categoriesWithGoals.add(g.category));

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

    return stats;
  }, [entries, goals]);

  // Calculate overall progress across all goals
  const overallProgress = useMemo(() => {
    if (categoryStats.length === 0) return 0;
    const total = categoryStats.reduce((sum, s) => sum + s.percentage, 0);
    return Math.round(total / categoryStats.length);
  }, [categoryStats]);

  const size = 96;
  const strokeWidth = 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  if (loading || categoryStats.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center justify-center p-2">
      <div className="relative">
        <svg 
          className="w-24 h-24 md:w-28 md:h-28 transform -rotate-90" 
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background ring */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="hsl(var(--card))"
            stroke="hsl(var(--secondary))"
            strokeWidth={strokeWidth}
            className="opacity-60"
          />
          
          {/* Segmented progress arcs for each category */}
          {categoryStats.map((stat, index) => {
            const segmentAngle = 360 / categoryStats.length;
            const startAngle = index * segmentAngle - 90;
            const arcLength = (segmentAngle / 360) * circumference;
            const filledLength = arcLength * (stat.percentage / 100);
            const offset = circumference - (index * segmentAngle / 360) * circumference;

            return (
              <motion.circle
                key={stat.category}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={stat.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={`${filledLength} ${circumference - filledLength}`}
                strokeDashoffset={offset}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.1 }}
              />
            );
          })}
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
          <Clock className="w-4 h-4 text-muted-foreground mb-0.5" />
          <span className="text-lg font-bold font-mono">
            {overallProgress}%
          </span>
        </div>
      </div>
    </div>
  );
}
