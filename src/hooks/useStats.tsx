import { useState, useEffect, useCallback } from 'react';
import { useAuth, getSupabase } from './useAuth';

interface Stats {
  tasksCompleted: number;
  tasksPending: number;
  averageGrade: number | null;
  totalBalance: number;
  recipesCount: number;
  ideasCount: number;
  loadingPrices: boolean;
}

export function useStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Stats>({
    tasksCompleted: 0,
    tasksPending: 0,
    averageGrade: null,
    totalBalance: 0,
    recipesCount: 0,
    ideasCount: 0,
    loadingPrices: false,
  });
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const supabase = getSupabase();

    const [
      tasksRes,
      gradesRes,
      recipesRes,
      ideasRes,
    ] = await Promise.all([
      supabase.from('tasks').select('completed').eq('user_id', user.id),
      supabase.from('grades').select('points, grade_type, course_id').eq('user_id', user.id),
      supabase.from('recipes').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      supabase.from('ideas').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
    ]);

    const tasks = tasksRes.data || [];
    const tasksCompleted = tasks.filter(t => t.completed).length;
    const tasksPending = tasks.filter(t => !t.completed).length;

    const grades = gradesRes.data || [];
    let averageGrade: number | null = null;
    if (grades.length > 0) {
      averageGrade = Math.round((grades.reduce((sum, g) => sum + g.points, 0) / grades.length) * 10) / 10;
    }

    setStats({
      tasksCompleted,
      tasksPending,
      averageGrade,
      totalBalance: 0,
      recipesCount: recipesRes.count || 0,
      ideasCount: ideasRes.count || 0,
      loadingPrices: false,
    });

    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return { stats, loading, refetch: fetchStats };
}
