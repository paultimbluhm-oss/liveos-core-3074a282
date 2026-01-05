import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays } from 'date-fns';

interface ActiveTracker {
  category_id: string;
  start_time: string;
}

interface TimeEntry {
  category: string;
  minutes: number;
  entry_date: string;
}

interface Goal {
  category: string;
  day_of_week: number | null;
  points_per_minute: number;
}

export function useTimeScore() {
  const { user } = useAuth();
  const [score, setScore] = useState(0);
  const [yesterdayScore, setYesterdayScore] = useState(0);
  const [activeTracker, setActiveTracker] = useState<ActiveTracker | null>(null);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const today = format(new Date(), 'yyyy-MM-dd');
  const yesterday = format(subDays(new Date(), 1), 'yyyy-MM-dd');
  const dayOfWeek = new Date().getDay();
  const yesterdayDayOfWeek = subDays(new Date(), 1).getDay();

  // Fetch all data
  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
      const [entriesRes, goalsRes, trackerRes] = await Promise.all([
        supabase
          .from('time_entries')
          .select('category, minutes, entry_date')
          .eq('user_id', user.id)
          .in('entry_date', [today, yesterday]),
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
      } else {
        setActiveTracker(null);
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
  }, [user, today, yesterday]);

  // Get points per minute for a category
  const getPointsPerMinute = useCallback((categoryId: string, forDayOfWeek: number): number => {
    // First check day-specific
    const dayGoal = goals.find(g => g.category === categoryId && g.day_of_week === forDayOfWeek);
    if (dayGoal && dayGoal.points_per_minute !== 0) return dayGoal.points_per_minute;
    
    // Fall back to default
    const defaultGoal = goals.find(g => g.category === categoryId && g.day_of_week === null);
    return defaultGoal?.points_per_minute || 0;
  }, [goals]);

  // Calculate yesterday's score
  useEffect(() => {
    if (goals.length === 0) return;
    
    const yesterdayEntries = entries.filter(e => e.entry_date === yesterday);
    let yScore = 0;
    
    yesterdayEntries.forEach(entry => {
      const ppm = getPointsPerMinute(entry.category, yesterdayDayOfWeek);
      yScore += entry.minutes * ppm;
    });
    
    setYesterdayScore(Math.round(yScore));
  }, [entries, goals, yesterday, yesterdayDayOfWeek, getPointsPerMinute]);

  // Calculate today's score with live update
  useEffect(() => {
    if (goals.length === 0) return;

    const calculateScore = () => {
      const todayEntries = entries.filter(e => e.entry_date === today);
      let totalScore = 0;

      // Score from saved entries
      todayEntries.forEach(entry => {
        const ppm = getPointsPerMinute(entry.category, dayOfWeek);
        totalScore += entry.minutes * ppm;
      });

      // Score from active tracker
      if (activeTracker) {
        const ppm = getPointsPerMinute(activeTracker.category_id, dayOfWeek);
        if (ppm !== 0) {
          const startTime = new Date(activeTracker.start_time).getTime();
          const elapsedMinutes = (Date.now() - startTime) / 60000;
          totalScore += elapsedMinutes * ppm;
        }
      }

      setScore(Math.round(totalScore));
    };

    calculateScore();
    
    // Update every second if there's an active tracker
    if (activeTracker) {
      intervalRef.current = setInterval(calculateScore, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [entries, goals, activeTracker, today, dayOfWeek, getPointsPerMinute]);

  return { score, yesterdayScore, hasActiveTracker: !!activeTracker };
}
