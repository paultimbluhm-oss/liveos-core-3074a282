import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetType = 
  | 'streak-ring' 
  | 'habits-checklist' 
  | 'today-progress' 
  | 'health-bar' 
  | 'quick-stats' 
  | 'motivation-quote'
  | 'tasks'
  | 'timetable';

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  size: WidgetSize;
  order: number;
  visible: boolean;
}

export const WIDGET_CATALOG: { type: WidgetType; name: string; description: string; defaultSize: WidgetSize; sizes: WidgetSize[] }[] = [
  { type: 'streak-ring', name: 'Streak', description: 'Tagesfortschritt und Streak-Zaehler', defaultSize: 'medium', sizes: ['small', 'medium', 'large'] },
  { type: 'habits-checklist', name: 'Habits', description: 'Taegliche Gewohnheiten abhaken', defaultSize: 'large', sizes: ['medium', 'large'] },
  { type: 'today-progress', name: 'Heute', description: 'Aufgaben, Hausaufgaben, Habits', defaultSize: 'medium', sizes: ['small', 'medium', 'large'] },
  { type: 'health-bar', name: 'Gesundheit', description: 'Taegliche Routinen', defaultSize: 'small', sizes: ['small', 'medium'] },
  { type: 'quick-stats', name: 'Statistiken', description: 'Noten und Vermoegen', defaultSize: 'small', sizes: ['small', 'medium'] },
  { type: 'motivation-quote', name: 'Motivation', description: 'Taeglicher Motivationsspruch', defaultSize: 'medium', sizes: ['small', 'medium', 'large'] },
  { type: 'tasks', name: 'Aufgaben', description: 'Aufgaben verwalten und abhaken', defaultSize: 'large', sizes: ['small', 'medium', 'large'] },
  { type: 'timetable', name: 'Stundenplan', description: 'Heutiger Stundenplan und Hausaufgaben', defaultSize: 'medium', sizes: ['small', 'medium', 'large'] },
];

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'w1', type: 'streak-ring', size: 'medium', order: 0, visible: true },
  { id: 'w2', type: 'quick-stats', size: 'small', order: 1, visible: true },
  { id: 'w3', type: 'today-progress', size: 'medium', order: 2, visible: true },
  { id: 'w4', type: 'habits-checklist', size: 'large', order: 3, visible: true },
  { id: 'w5', type: 'health-bar', size: 'small', order: 4, visible: true },
  { id: 'w7', type: 'motivation-quote', size: 'medium', order: 6, visible: true },
  { id: 'w8', type: 'quick-stats', size: 'small', order: 7, visible: true },
  { id: 'w9', type: 'tasks', size: 'large', order: 8, visible: true },
];

export interface DashboardSettings {
  habitDisplayLimit: number;
  showXpToast: boolean;
  statsVisibleFields: string[];
}

const DEFAULT_SETTINGS: DashboardSettings = { habitDisplayLimit: 0, showXpToast: true, statsVisibleFields: ['grade', 'netWorth'] };

export function useDashboardV2Config() {
  const { user } = useAuth();
  const [widgets, setWidgets] = useState<DashboardWidget[]>(DEFAULT_WIDGETS);
  const [settings, setSettings] = useState<DashboardSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) loadConfig();
    else setLoading(false);
  }, [user]);

  const loadConfig = useCallback(async () => {
    if (!user) return;
    
    const { data } = await supabase
      .from('dashboard_v2_config')
      .select('widgets, settings')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      if (data.widgets && Array.isArray(data.widgets) && data.widgets.length > 0) {
        let loaded = data.widgets as unknown as DashboardWidget[];
        // Auto-add any new widget types from the catalog that are missing
        const existingTypes = new Set(loaded.map(w => w.type));
        const maxOrder = Math.max(...loaded.map(w => w.order), -1);
        let nextOrder = maxOrder + 1;
        for (const cat of WIDGET_CATALOG) {
          if (!existingTypes.has(cat.type)) {
            loaded = [...loaded, { id: `w-auto-${cat.type}`, type: cat.type, size: cat.defaultSize, order: nextOrder++, visible: false }];
          }
        }
        // Remove widgets whose type no longer exists in the catalog
        const validTypes = new Set(WIDGET_CATALOG.map(c => c.type));
        loaded = loaded.filter(w => validTypes.has(w.type));
        setWidgets(loaded);
      }
      if (data.settings && typeof data.settings === 'object') {
        setSettings({ ...DEFAULT_SETTINGS, ...(data.settings as Record<string, unknown>) } as DashboardSettings);
      }
    } else {
      // Migrate from localStorage if exists
      const savedWidgets = localStorage.getItem(`dashboard-v2-${user.id}`);
      const savedSettings = localStorage.getItem(`dashboard-v2-settings-${user.id}`);
      let w = DEFAULT_WIDGETS;
      let s = DEFAULT_SETTINGS;
      try { if (savedWidgets) w = JSON.parse(savedWidgets); } catch {}
      try { if (savedSettings) s = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) }; } catch {}
      
      setWidgets(w);
      setSettings(s);

      // Save to Supabase and clean up localStorage
      await supabase.from('dashboard_v2_config').upsert([{
        user_id: user.id,
        widgets: w as any,
        settings: s as any,
      }], { onConflict: 'user_id' });
      localStorage.removeItem(`dashboard-v2-${user.id}`);
      localStorage.removeItem(`dashboard-v2-settings-${user.id}`);
    }
    
    setLoading(false);
  }, [user]);

  const persistToDb = useCallback(async (w: DashboardWidget[], s: DashboardSettings) => {
    if (!user) return;
    await supabase.from('dashboard_v2_config').upsert([{
      user_id: user.id,
      widgets: w as any,
      settings: s as any,
    }], { onConflict: 'user_id' });
  }, [user]);

  const saveConfig = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    persistToDb(newWidgets, settings);
  }, [persistToDb, settings]);

  const updateSettings = useCallback((patch: Partial<DashboardSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    persistToDb(widgets, next);
  }, [settings, widgets, persistToDb]);

  const updateWidgetSize = useCallback((widgetId: string, size: WidgetSize) => {
    saveConfig(widgets.map(w => w.id === widgetId ? { ...w, size } : w));
  }, [widgets, saveConfig]);

  const toggleWidget = useCallback((widgetId: string) => {
    saveConfig(widgets.map(w => w.id === widgetId ? { ...w, visible: !w.visible } : w));
  }, [widgets, saveConfig]);

  const moveWidget = useCallback((fromIndex: number, toIndex: number) => {
    const visible = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);
    const [moved] = visible.splice(fromIndex, 1);
    visible.splice(toIndex, 0, moved);
    const reordered = visible.map((w, i) => ({ ...w, order: i }));
    const hidden = widgets.filter(w => !w.visible);
    saveConfig([...reordered, ...hidden]);
  }, [widgets, saveConfig]);

  const resetToDefault = useCallback(() => {
    saveConfig(DEFAULT_WIDGETS);
  }, [saveConfig]);

  const visibleWidgets = widgets.filter(w => w.visible).sort((a, b) => a.order - b.order);

  return { widgets, visibleWidgets, loading, updateWidgetSize, toggleWidget, moveWidget, resetToDefault, settings, updateSettings };
}

// === Live data hooks ===

export interface TodayStats {
  tasksCompleted: number;
  tasksTotal: number;
  homeworkCompleted: number;
  homeworkTotal: number;
  habitsCompleted: number;
  habitsTotal: number;
}

export function useTodayStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TodayStats>({
    tasksCompleted: 0, tasksTotal: 0,
    homeworkCompleted: 0, homeworkTotal: 0,
    habitsCompleted: 0, habitsTotal: 0,
  });
  const [yesterdayPercentage, setYesterdayPercentage] = useState<number | null>(null);
  const [streakDays, setStreakDays] = useState(0);

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    const [tasksRes, habitsRes, completionsRes] = await Promise.all([
      supabase.from('tasks').select('id, completed, due_date').eq('user_id', user.id).not('due_date', 'is', null),
      supabase.from('habits').select('id').eq('user_id', user.id).eq('is_active', true),
      supabase.from('habit_completions').select('id').eq('user_id', user.id).eq('completed_date', today),
    ]);

    const allTasks = tasksRes.data || [];
    const todayTasks = allTasks.filter(t => t.due_date && format(new Date(t.due_date), 'yyyy-MM-dd') === today);
    const overdueTasks = allTasks.filter(t => t.due_date && format(new Date(t.due_date), 'yyyy-MM-dd') < today && !t.completed);
    const relevantTasks = [...todayTasks, ...overdueTasks];

    setStats({
      tasksCompleted: relevantTasks.filter(t => t.completed).length,
      tasksTotal: relevantTasks.length,
      homeworkCompleted: 0,
      homeworkTotal: 0,
      habitsCompleted: completionsRes.data?.length || 0,
      habitsTotal: habitsRes.data?.length || 0,
    });
  }, [user]);

  // Compute streak from past days (today does NOT count toward streak)
  const computeStreak = useCallback(async () => {
    if (!user) return;

    // We need to check past days. For each day going backwards from yesterday,
    // check if all habits were completed and all tasks due that day were completed.
    const habitIds = (await supabase.from('habits').select('id').eq('user_id', user.id).eq('is_active', true)).data || [];
    const habitCount = habitIds.length;

    if (habitCount === 0) {
      setStreakDays(0);
      setYesterdayPercentage(null);
      return;
    }

    // Fetch last 60 days of habit completions
    const sixtyDaysAgo = new Date();
    sixtyDaysAgo.setDate(sixtyDaysAgo.getDate() - 60);
    const fromDate = format(sixtyDaysAgo, 'yyyy-MM-dd');

    const { data: recentCompletions } = await supabase
      .from('habit_completions')
      .select('habit_id, completed_date')
      .eq('user_id', user.id)
      .gte('completed_date', fromDate);

    // Group completions by date
    const completionsByDate: Record<string, Set<string>> = {};
    (recentCompletions || []).forEach(c => {
      if (!completionsByDate[c.completed_date]) completionsByDate[c.completed_date] = new Set();
      completionsByDate[c.completed_date].add(c.habit_id);
    });

    // Also check tasks per day
    const { data: recentTasks } = await supabase
      .from('tasks')
      .select('id, completed, due_date')
      .eq('user_id', user.id)
      .not('due_date', 'is', null)
      .gte('due_date', sixtyDaysAgo.toISOString());

    const tasksByDate: Record<string, { total: number; done: number }> = {};
    (recentTasks || []).forEach(t => {
      if (!t.due_date) return;
      const d = format(new Date(t.due_date), 'yyyy-MM-dd');
      if (!tasksByDate[d]) tasksByDate[d] = { total: 0, done: 0 };
      tasksByDate[d].total++;
      if (t.completed) tasksByDate[d].done++;
    });

    // Check day by day going backwards from yesterday
    let streak = 0;
    const hIds = habitIds.map(h => h.id);

    for (let i = 1; i <= 60; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = format(d, 'yyyy-MM-dd');

      const habitsCompletedOnDay = completionsByDate[dateStr] || new Set();
      const allHabitsDone = hIds.every(id => habitsCompletedOnDay.has(id));

      const tasksOnDay = tasksByDate[dateStr];
      const allTasksDone = !tasksOnDay || tasksOnDay.done >= tasksOnDay.total;

      if (allHabitsDone && allTasksDone) {
        streak++;
      } else {
        break;
      }

      // Calculate yesterday's percentage (i === 1)
      if (i === 1) {
        const habitsDone = hIds.filter(id => habitsCompletedOnDay.has(id)).length;
        const tasksDone = tasksOnDay?.done || 0;
        const tasksTotal = tasksOnDay?.total || 0;
        const totalDone = habitsDone + tasksDone;
        const totalAll = habitCount + tasksTotal;
        setYesterdayPercentage(totalAll > 0 ? Math.round((totalDone / totalAll) * 100) : 100);
      }
    }

    setStreakDays(streak);

    // Persist to profile
    await supabase.from('profiles').update({ streak_days: streak }).eq('user_id', user.id);
  }, [user]);

  useEffect(() => { fetchStats(); computeStreak(); }, [fetchStats, computeStreak]);

  useEffect(() => {
    if (!user) return;
    const ch1 = supabase.channel('dv2-tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => { fetchStats(); computeStreak(); }).subscribe();
    const ch3 = supabase.channel('dv2-hc').on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, () => { fetchStats(); computeStreak(); }).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch3); };
  }, [user, fetchStats, computeStreak]);

  const totalDone = stats.tasksCompleted + stats.homeworkCompleted + stats.habitsCompleted;
  const totalAll = stats.tasksTotal + stats.homeworkTotal + stats.habitsTotal;
  const percentage = totalAll === 0 ? 100 : Math.round((totalDone / totalAll) * 100);

  return { stats, percentage, allDone: totalAll > 0 && totalDone === totalAll, totalDone, totalAll, yesterdayPercentage, streakDays };
}
