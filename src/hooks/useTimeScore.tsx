import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format } from 'date-fns';

interface ActiveTracker {
  category_id: string;
  start_time: string;
}

interface TimeEntry {
  category: string;
  minutes: number;
}

interface Goal {
  category: string;
  day_of_week: number | null;
  points_per_minute: number;
}

export function useTimeScore() {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [activeTracker, setActiveTracker] = useState<ActiveTracker | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const dayOfWeek = new Date().getDay();

  // Fetch all data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [entriesRes, goalsRes, trackerRes] = await Promise.all([
        supabase
          .from('time_entries')
          .select('category, minutes')
          .eq('user_id', user.id)
          .eq('entry_date', today),
        supabase
          .from('lifetime_goals')
          .select('category, day_of_week, points_per_minute')
          .eq('user_id', user.id),
        supabase
          .from('active_time_tracker')
          .select('category_id, start_time')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      if (entriesRes.data) setEntries(entriesRes.data);
      if (goalsRes.data) setGoals(goalsRes.data);
      if (trackerRes.data) {
        setActiveTracker({
          category_id: trackerRes.data.category_id,
          start_time: trackerRes.data.start_time,
        });
      }
    };

    fetchData();

    // Subscribe to realtime changes
    const channel = supabase
      .channel('time-score-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'active_time_tracker',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setActiveTracker(null);
          } else if (payload.new) {
            const data = payload.new as any;
            setActiveTracker({
              category_id: data.category_id,
              start_time: data.start_time,
            });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, today]);

  // Get points per minute for a category
  const getPointsPerMinute = (categoryId: string): number => {
    // First check day-specific
    const dayGoal = goals.find(g => g.category === categoryId && g.day_of_week === dayOfWeek);
    if (dayGoal && dayGoal.points_per_minute !== 0) return dayGoal.points_per_minute;
    
    // Fall back to default
    const defaultGoal = goals.find(g => g.category === categoryId && g.day_of_week === null);
    return defaultGoal?.points_per_minute || 0;
  };

  // Calculate score with live update
  useEffect(() => {
    const calculateScore = () => {
      let totalScore = 0;

      // Score from saved entries
      entries.forEach(entry => {
        const ppm = getPointsPerMinute(entry.category);
        totalScore += entry.minutes * ppm;
      });

      // Score from active tracker
      if (activeTracker) {
        const ppm = getPointsPerMinute(activeTracker.category_id);
        if (ppm !== 0) {
          const startTime = new Date(activeTracker.start_time).getTime();
          const elapsedMinutes = (Date.now() - startTime) / 60000;
          totalScore += elapsedMinutes * ppm;
        }
      }

      setScore(Math.round(totalScore * 10) / 10);
    };

    calculateScore();
    
    // Update every second if there's an active tracker with points
    if (activeTracker) {
      intervalRef.current = setInterval(calculateScore, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [entries, goals, activeTracker]);

  return { score, hasActiveTracker: !!activeTracker };
}
