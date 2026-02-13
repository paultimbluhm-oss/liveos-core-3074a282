import { useState, useEffect, useCallback } from 'react';
import { useAuth, getSupabase } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export type WidgetSize = 'small' | 'medium' | 'large';
export type WidgetType = 
  | 'streak-ring' 
  | 'habits-checklist' 
  | 'today-progress' 
  | 'health-bar' 
  | 'xp-level' 
  | 'time-score' 
  | 'quick-stats' 
  | 'motivation-quote'
  | 'next-actions';

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
  { type: 'xp-level', name: 'Level & XP', description: 'Aktuelles Level und XP-Fortschritt', defaultSize: 'small', sizes: ['small', 'medium'] },
  { type: 'time-score', name: 'Time Score', description: 'Lifetime-Zeiterfassung live', defaultSize: 'small', sizes: ['small', 'medium'] },
  { type: 'quick-stats', name: 'Statistiken', description: 'Noten und Vermoegen', defaultSize: 'small', sizes: ['small', 'medium'] },
  { type: 'motivation-quote', name: 'Motivation', description: 'Taeglicher Motivationsspruch', defaultSize: 'medium', sizes: ['small', 'medium', 'large'] },
  { type: 'next-actions', name: 'Aktionen', description: 'Naechste Aufgaben und Deadlines', defaultSize: 'large', sizes: ['medium', 'large'] },
];

const DEFAULT_WIDGETS: DashboardWidget[] = [
  { id: 'w1', type: 'streak-ring', size: 'medium', order: 0, visible: true },
  { id: 'w2', type: 'xp-level', size: 'small', order: 1, visible: true },
  { id: 'w3', type: 'today-progress', size: 'medium', order: 2, visible: true },
  { id: 'w4', type: 'habits-checklist', size: 'large', order: 3, visible: true },
  { id: 'w5', type: 'health-bar', size: 'small', order: 4, visible: true },
  { id: 'w6', type: 'time-score', size: 'small', order: 5, visible: true },
  { id: 'w7', type: 'motivation-quote', size: 'medium', order: 6, visible: true },
  { id: 'w8', type: 'quick-stats', size: 'small', order: 7, visible: true },
  { id: 'w9', type: 'next-actions', size: 'large', order: 8, visible: true },
];

export interface DashboardSettings {
  habitDisplayLimit: number; // 0 = all
  showXpToast: boolean;
}

const DEFAULT_SETTINGS: DashboardSettings = { habitDisplayLimit: 0, showXpToast: true };

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
    const saved = localStorage.getItem(`dashboard-v2-${user?.id}`);
    if (saved) {
      try {
        setWidgets(JSON.parse(saved));
      } catch { /* use defaults */ }
    }
    const savedSettings = localStorage.getItem(`dashboard-v2-settings-${user?.id}`);
    if (savedSettings) {
      try {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
      } catch { /* use defaults */ }
    }
    setLoading(false);
  }, [user]);

  const saveConfig = useCallback((newWidgets: DashboardWidget[]) => {
    setWidgets(newWidgets);
    if (user) localStorage.setItem(`dashboard-v2-${user.id}`, JSON.stringify(newWidgets));
  }, [user]);

  const updateSettings = useCallback((patch: Partial<DashboardSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    if (user) localStorage.setItem(`dashboard-v2-settings-${user.id}`, JSON.stringify(next));
  }, [settings, user]);

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

  const fetchStats = useCallback(async () => {
    if (!user) return;
    const today = format(new Date(), 'yyyy-MM-dd');

    const [tasksRes, homeworkRes, habitsRes, completionsRes] = await Promise.all([
      supabase.from('tasks').select('id, completed, due_date').eq('user_id', user.id).not('due_date', 'is', null),
      supabase.from('homework').select('id, completed, due_date').eq('user_id', user.id).eq('due_date', today),
      supabase.from('habits').select('id').eq('user_id', user.id).eq('is_active', true),
      supabase.from('habit_completions').select('id').eq('user_id', user.id).eq('completed_date', today),
    ]);

    const todayTasks = (tasksRes.data || []).filter(t => t.due_date && format(new Date(t.due_date), 'yyyy-MM-dd') === today);

    setStats({
      tasksCompleted: todayTasks.filter(t => t.completed).length,
      tasksTotal: todayTasks.length,
      homeworkCompleted: homeworkRes.data?.filter(h => h.completed).length || 0,
      homeworkTotal: homeworkRes.data?.length || 0,
      habitsCompleted: completionsRes.data?.length || 0,
      habitsTotal: habitsRes.data?.length || 0,
    });
  }, [user]);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  useEffect(() => {
    if (!user) return;
    const ch1 = supabase.channel('dv2-tasks').on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, fetchStats).subscribe();
    const ch2 = supabase.channel('dv2-hw').on('postgres_changes', { event: '*', schema: 'public', table: 'homework' }, fetchStats).subscribe();
    const ch3 = supabase.channel('dv2-hc').on('postgres_changes', { event: '*', schema: 'public', table: 'habit_completions' }, fetchStats).subscribe();
    return () => { supabase.removeChannel(ch1); supabase.removeChannel(ch2); supabase.removeChannel(ch3); };
  }, [user, fetchStats]);

  const totalDone = stats.tasksCompleted + stats.homeworkCompleted + stats.habitsCompleted;
  const totalAll = stats.tasksTotal + stats.homeworkTotal + stats.habitsTotal;
  const percentage = totalAll === 0 ? 100 : Math.round((totalDone / totalAll) * 100);

  return { stats, percentage, allDone: totalAll > 0 && totalDone === totalAll, totalDone, totalAll };
}
